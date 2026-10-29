/**
 * Settings for running as a Netlify Function. Imported before anything reads the environment.
 * Values set in the Netlify dashboard always win over these defaults.
 */
import fs from 'node:fs';

const set = (key: string, value: string | undefined) => {
  if (value !== undefined && !process.env[key]) process.env[key] = value;
};

set('NODE_ENV', 'production');
set('STORAGE_DRIVER', 'netlify-blobs');
// Never print emails (which can hold reset links) to function logs. Set smtp to send them.
set('EMAIL_TRANSPORT', 'disabled');
set('CLIENT_IP_HEADER', 'x-nf-client-connection-ip');
// The API is only reachable through the site's own domain, so same host requests are same site.
set('TRUST_SAME_HOST_ORIGIN', 'true');
// Function requests are limited to 6 MB and uploads arrive base64 encoded.
set('MAX_UPLOAD_MB', '4');

// The build writes the site address here, because Netlify's URL variable is a build time value.
try {
  const site = JSON.parse(fs.readFileSync(new URL('./netlify-site.json', import.meta.url), 'utf8')) as { url?: string };
  const local = (v?: string) => !v || /localhost|127\.0\.0\.1/.test(v);
  // A localhost value copied into the dashboard from .env.example must not stop the real address being used.
  if (site.url && local(process.env.PUBLIC_APP_URL)) process.env.PUBLIC_APP_URL = site.url;
  if (site.url && local(process.env.APP_ORIGIN)) process.env.APP_ORIGIN = site.url;
} catch {
  // Not built by the Netlify build script; rely on the configured variables.
}

// Netlify DB (Neon) pooled connections go through PgBouncer, which needs this Prisma flag.
const db = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
if (db && db.includes('-pooler.') && !db.includes('pgbouncer=')) {
  process.env.DATABASE_URL = db + (db.includes('?') ? '&' : '?') + 'pgbouncer=true';
}
