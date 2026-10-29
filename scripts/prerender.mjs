/**
 * Writes one real HTML file for every page that does not come from the database (about, parents,
 * contact, the policies and so on), each with its own title, description, canonical address and
 * content, so search engines and link previews see it without running any JavaScript.
 * Pages from the database (programs, events, articles, lessons) are made on demand by the server.
 * Runs after both the server and the website are built.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const dist = `${root}client/dist`;
const { applyTemplate, staticPages } = await import(pathToFileURL(`${root}server/dist/seo/pages.js`).href);

const base = (process.env.PUBLIC_APP_URL || process.env.URL || '').replace(/\/$/, '');
const template = readFileSync(`${dist}/index.html`, 'utf8');

// app.html is the plain shell for every page that is not prerendered (sign in, account, dashboard).
// It is not for search engines, so it says so. The server also uses the plain shell to make the
// pages that come from the database.
writeFileSync(`${dist}/app.html`, template.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>'));
writeFileSync(`${root}server/dist/seo-template.html`, template);

let count = 0;
for (const page of staticPages) {
  const html = applyTemplate(template, base, page);
  const file = page.path === '/' ? `${dist}/index.html` : `${dist}${page.path}/index.html`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  count++;
}
console.log(`Prerendered ${count} pages.`);
