import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import en, { type Dict } from './locales/en';
import { usePreferences, type Lang } from '../lib/preferences';
import { setFormatLocale } from '../lib/format';
import { DomTranslator } from './DomTranslator';

/**
 * Small translation layer with no extra library. English ships with the page; other
 * languages load on demand. Any key missing from a language falls back to English, so the
 * interface never shows a raw key. Editorial content stays in the language it was written in.
 */
const loaders: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Dict }>> = {
  fr: () => import('./locales/fr'),
  es: () => import('./locales/es'),
  pt: () => import('./locales/pt'),
};

export const localeTags: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES', pt: 'pt-PT' };

type Vars = Record<string, string | number>;
export type TFunction = (key: string, vars?: Vars) => string;

function lookup(dict: unknown, key: string): string | undefined {
  // Keys are dot separated, except under "server", whose keys are whole English sentences.
  const [head, ...rest] = key.split('.');
  if (head === 'server') return (dict as Dict).server?.[rest.join('.') as keyof Dict['server']];
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

const fill = (text: string, vars?: Vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text);

function makeT(dict: Dict): TFunction {
  return (key, vars) => fill(lookup(dict, key) ?? lookup(en, key) ?? key, vars);
}

const I18nContext = createContext<{ lang: Lang; t: TFunction }>({ lang: 'en', t: makeT(en) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const { prefs } = usePreferences();
  const [dicts, setDicts] = useState<Partial<Record<Lang, Dict>>>({ en });
  const lang = prefs.language;

  useEffect(() => {
    if (lang === 'en' || dicts[lang]) return;
    let cancelled = false;
    loaders[lang]()
      .then((m) => !cancelled && setDicts((d) => ({ ...d, [lang]: m.default })))
      .catch(() => undefined); // offline: English stays in place
    return () => {
      cancelled = true;
    };
  }, [lang, dicts]);

  const active = dicts[lang] ?? en;
  setFormatLocale(localeTags[dicts[lang] ? lang : 'en']);
  return <I18nContext.Provider value={{ lang, t: makeT(active) }}>{children}<DomTranslator /></I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;

/** Server messages in the visitor's language when a translation exists, otherwise as sent. */
export function translateServer(t: TFunction, message: string) {
  const out = t(`server.${message}`);
  return out === `server.${message}` ? message : out;
}
