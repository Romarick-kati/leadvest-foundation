/**
 * Netlify build. Three modes, chosen from the site's environment variables:
 *
 *   full      DATABASE_URL (or Netlify DB) is set: the API runs as a Netlify Function.
 *   external  API_ORIGIN is set: /api is proxied to an API hosted elsewhere.
 *   preview   neither is set: the website deploys with a visible "server not connected" notice.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const env = process.env;
const root = new URL('..', import.meta.url).pathname;
const run = (cmd, extraEnv = {}, cwd = root) => execSync(cmd, { stdio: 'inherit', cwd, env: { ...env, ...extraEnv } });
const server = new URL('../server', import.meta.url).pathname;
const fail = (lines) => {
  console.error('\n' + ['Build stopped:', ...lines].join('\n  ') + '\n');
  process.exit(1);
};

const apiOrigin = (env.API_ORIGIN ?? '').trim().replace(/\/$/, '');
const databaseUrl = env.DATABASE_URL || env.NETLIFY_DATABASE_URL || '';
const mode = apiOrigin ? 'external' : databaseUrl ? 'full' : 'preview';
console.log(`\nLead Vest Foundation build, mode: ${mode}\n`);

if (mode === 'external' && !/^https:\/\/[^/]+$/.test(apiOrigin)) {
  fail(['API_ORIGIN must be an https origin with no path, for example https://api.example.org']);
}

if (mode === 'full') {
  const missing = ['SESSION_SECRET', 'ENCRYPTION_KEY'].filter((k) => (env[k] ?? '').length < 32);
  if (missing.length) {
    fail([
      `Set ${missing.join(' and ')} in Netlify > Site configuration > Environment variables.`,
      'Each must be a different random value of at least 32 characters. See NETLIFY.md, step 3.',
    ]);
  }
  if (env.SETUP_TOKEN && env.SETUP_TOKEN.length < 24) fail(['SETUP_TOKEN must be at least 24 characters.']);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.warn('\nNote: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set, so "Continue with Google" will say it is not set up. See HOW_TO_RUN.md, section 6.\n');
  }
  if (env.PAYMENTS_MODE === 'mock') fail(['PAYMENTS_MODE=mock is for local testing only.']);
  if ((env.PAYMENTS_MODE === 'fapshi' || env.PAYMENTS_MODE === 'both') && (!env.FAPSHI_API_USER || !env.FAPSHI_API_KEY)) {
    fail(['PAYMENTS_MODE=' + env.PAYMENTS_MODE + ' needs FAPSHI_API_USER and FAPSHI_API_KEY in Netlify environment variables. See HOW_TO_RUN.md, section 7.']);
  }
  if ((env.PAYMENTS_MODE === 'flutterwave' || env.PAYMENTS_MODE === 'both') && !env.FLUTTERWAVE_SECRET_KEY) {
    fail(['PAYMENTS_MODE=' + env.PAYMENTS_MODE + ' needs FLUTTERWAVE_SECRET_KEY in Netlify environment variables. See HOW_TO_RUN.md, section 7.']);
  }
  if (env.FLUTTERWAVE_SECRET_KEY && /TEST/i.test(env.FLUTTERWAVE_SECRET_KEY)) {
    console.warn('\nNote: you are using Flutterwave TEST keys. Use your live keys before launch.\n');
  }
  const fee = Number(env.ACCESS_FEE_XAF || 0);
  if (fee > 0 && fee < 100) fail(['ACCESS_FEE_XAF must be 0 (free) or at least 100, the smallest amount Fapshi accepts.']);
  if (fee > 0 && (env.PAYMENTS_MODE || 'disabled') === 'disabled') {
    console.warn('\nNote: ACCESS_FEE_XAF is set but PAYMENTS_MODE is still disabled, so nobody is asked to pay. See HOW_TO_RUN.md, section 7.\n');
  }
  if (env.PAYMENTS_MODE === 'fapshi' && (env.FAPSHI_API_KEY || '').startsWith('FAK_TEST_')) {
    console.warn('\nNote: you are using Fapshi TEST keys (FAK_TEST_...). People can finish a pretend payment and get access without paying real money. Use your live keys before launch.\n');
  }
}

// The function bundle is built in every mode so Netlify can always package it.
run('npm run build --workspace server');

if (mode === 'full') {
  // Migrations need a direct (unpooled) connection when the main one goes through a pooler.
  const direct = env.NETLIFY_DATABASE_URL_UNPOOLED || env.DIRECT_DATABASE_URL || databaseUrl;
  run('npx prisma migrate deploy', { DATABASE_URL: direct }, server);
  if (env.SEED_SAMPLE_CONTENT === 'true') {
    run('npx tsx prisma/seed.ts --content-only', { DATABASE_URL: direct, NODE_ENV: 'production' }, server);
  }
  // Optional first administrator from environment variables. Only with ADMIN_PASSWORD, so a
  // setup link is never written to the build log. Safe on every build: an existing
  // administrator is left unchanged.
  if (env.ADMIN_EMAIL && env.ADMIN_NAME && env.ADMIN_PASSWORD) {
    run('node dist/scripts/create-admin.js', { DATABASE_URL: direct }, server);
  }
  const url = (env.URL || '').replace(/\/$/, '');
  writeFileSync(new URL('../server/dist/netlify-site.json', import.meta.url), JSON.stringify({ url: url || undefined }) + '\n');
}

run('npm run build --workspace client');
// One real HTML file per page, so search engines see each page's own title, description and content.
run('node scripts/prerender.mjs');

/**
 * Redirect rules. Every address is one of: a real file (served as it is), a page the server makes
 * from the database, a page of the app behind a sign in, or a true 404. Nothing is "found" by accident.
 */
const app = readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
const topLevel = [...new Set([...app.matchAll(/path: '\/([a-z0-9-]+)/g)].map((m) => m[1]))];
const prerendered = new Set(['about', 'parents', 'get-involved', 'support', 'contact', 'faq', 'privacy', 'terms', 'child-safety', 'consent', 'cookies', 'accessibility']);
const fromDatabase = ['programs', 'events', 'resources', 'learning'];

const rules = [];
if (mode === 'full') {
  rules.push('/sitemap.xml /.netlify/functions/api/api/sitemap.xml 200!');
  rules.push('/robots.txt  /.netlify/functions/api/api/robots.txt  200!');
  rules.push('/api/*      /.netlify/functions/api/api/:splat      200!');
  rules.push('/uploads/*  /.netlify/functions/api/uploads/:splat  200!');
  for (const seg of fromDatabase) {
    rules.push(`/${seg}    /.netlify/functions/api/api/render/${seg}    200`);
    rules.push(`/${seg}/*  /.netlify/functions/api/api/render/${seg}/:splat  200`);
  }
} else if (mode === 'external') {
  rules.push(`/sitemap.xml ${apiOrigin}/api/sitemap.xml 200!`);
  rules.push(`/robots.txt  ${apiOrigin}/api/robots.txt  200!`);
  rules.push(`/api/*      ${apiOrigin}/api/:splat      200!`);
  rules.push(`/uploads/*  ${apiOrigin}/uploads/:splat  200!`);
}
for (const seg of topLevel) {
  if (mode === 'full' && fromDatabase.includes(seg)) continue;
  if (prerendered.has(seg)) continue;
  rules.push(`/${seg}    /app.html  200`);
  rules.push(`/${seg}/*  /app.html  200`);
}
// Anything else is a real 404 (the app still shows its friendly not found page).
rules.push('/*          /app.html  404');
writeFileSync(new URL('../client/dist/_redirects', import.meta.url), rules.join('\n') + '\n');

console.log(`\nBuild complete (${mode}).`);
if (mode === 'preview') {
  console.log('The site shows a "Preview mode" notice until a database is connected. See NETLIFY.md.');
}
