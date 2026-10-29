import { beforeEach, describe, expect, it } from 'vitest';
import en from '../i18n/locales/en';
import fr from '../i18n/locales/fr';
import es from '../i18n/locales/es';
import pt from '../i18n/locales/pt';
import { saveConsent, resetConsentCache, openCookieSettings } from '../components/privacy/consent';

type Tree = { [k: string]: string | Tree };
function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}
function has(tree: Tree, key: string) {
  const [head, ...rest] = key.split('.');
  if (head === 'server') return rest.join('.') in (tree.server as Tree);
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined;
  return typeof node === 'string';
}
// Every source file's text, bundled by Vite at test time (no Node file APIs needed).
const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../test/**', '!../i18n/locales/**'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('translations', () => {
  const enKeys = keys(en as unknown as Tree);

  it.each([['fr', fr], ['es', es], ['pt', pt]] as const)('%s has every English key and no extras', (_, dict) => {
    const theirs = keys(dict as unknown as Tree);
    expect(enKeys.filter((k) => !theirs.includes(k))).toEqual([]);
    expect(theirs.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it.each([['fr', fr], ['es', es], ['pt', pt]] as const)('%s keeps every {placeholder}', (_, dict) => {
    for (const k of enKeys) {
      const get = (t: Tree) => k.split('.').reduce<string | Tree>((n, p) => (n as Tree)[p], t) as string;
      const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      if (k.startsWith('server.')) continue;
      expect(vars(get(dict as unknown as Tree)), k).toBe(vars(get(en as unknown as Tree)));
    }
  });

  it('every literal t() key used in the code exists in English', () => {
    const missing: string[] = [];
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    for (const [file, src] of Object.entries(sources)) {
      for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) if (!has(en as unknown as Tree, m[1])) missing.push(`${file}: ${m[1]}`);
      for (const m of src.matchAll(/label: '((?:nav|footer|settings|admin)\.[a-zA-Z0-9_.]+)'/g)) if (!has(en as unknown as Tree, m[1])) missing.push(`${file}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('cookie consent store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetConsentCache();
  });

  it('saves a versioned choice with a timestamp', () => {
    const c = saveConsent(false);
    const stored = JSON.parse(localStorage.getItem('lvf.cookieConsent')!);
    expect(stored).toMatchObject({ necessary: true, analytics: false, version: 1 });
    expect(Date.parse(stored.decidedAt)).toBeGreaterThan(0);
    expect(c.analytics).toBe(false);
  });

  it('opens settings through a window event', () => {
    let opened = false;
    window.addEventListener('lvf:cookie-settings', () => (opened = true), { once: true });
    openCookieSettings();
    expect(opened).toBe(true);
  });
});
