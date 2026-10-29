import fs from 'node:fs';

let cached: string | null | undefined;

/**
 * The website's built index.html, copied next to the server by the Netlify build. Without it
 * (local development, or a server hosted away from the website) the page renderer is simply off.
 */
export function loadTemplate(): string | null {
  if (cached !== undefined) return cached;
  try {
    cached = fs.readFileSync(new URL('./seo-template.html', import.meta.url), 'utf8');
  } catch {
    cached = null;
  }
  return cached;
}

/** For tests. */
export function setTemplateForTests(html: string | null) {
  cached = html;
}
