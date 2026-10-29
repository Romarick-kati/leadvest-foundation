import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { api } from './api';
import type { User } from './types';

/**
 * Interface preferences. Signed in users' choices are saved on the server (Settings), so they
 * follow them to other devices. Visitors' choices are a convenience kept in this browser only
 * and are not security sensitive. Theme and language can be changed by anyone from the header.
 */
export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'fr' | 'es' | 'pt';
export const LANGS: Lang[] = ['en', 'fr', 'es', 'pt'];

export type Accent = 'blue' | 'teal' | 'violet' | 'rose' | 'orange' | 'green';
export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'blue', label: 'Blue', swatch: '#2563EB' },
  { value: 'teal', label: 'Teal', swatch: '#0F766E' },
  { value: 'violet', label: 'Violet', swatch: '#6D28D9' },
  { value: 'rose', label: 'Rose', swatch: '#BE123C' },
  { value: 'orange', label: 'Orange', swatch: '#C2410C' },
  { value: 'green', label: 'Green', swatch: '#15803D' },
];

export interface Prefs {
  accent: Accent;
  reduceMotion: boolean;
  /** The person switched animation on themselves, which wins over a phone setting such as battery saver. */
  motionOn?: boolean;
  textSize: 'standard' | 'large' | 'larger';
  underlineLinks: boolean;
  theme: Theme;
  language: Lang;
}

const KEY = 'lvf.visitorPrefs';

/** First visit: follow the browser's language when we support it. */
function browserLang(): Lang {
  const tags = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  for (const tag of tags) {
    const base = tag?.slice(0, 2).toLowerCase() as Lang;
    if (LANGS.includes(base)) return base;
  }
  return 'en';
}

const defaults = (): Prefs => ({ reduceMotion: false, textSize: 'standard', underlineLinks: false, accent: 'blue', theme: 'light', language: browserLang() });

function readLocal(): Prefs {
  try {
    return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults();
  }
}

interface Ctx {
  prefs: Prefs;
  systemReducedMotion: boolean;
  /** The theme actually shown, after resolving "system". */
  resolvedTheme: 'light' | 'dark';
  setVisitorPrefs: (p: Partial<Prefs>) => void;
  /** Saves to the account when signed in, otherwise to this browser. */
  setPreference: (p: Partial<Pick<Prefs, 'theme' | 'language' | 'reduceMotion' | 'textSize' | 'underlineLinks' | 'accent'>>) => Promise<void>;
}

const PrefsContext = createContext<Ctx>({
  prefs: { reduceMotion: false, textSize: 'standard', underlineLinks: false, accent: 'blue', theme: 'light', language: 'en' },
  systemReducedMotion: false,
  resolvedTheme: 'light',
  setVisitorPrefs: () => undefined,
  setPreference: async () => undefined,
});

const media = (q: string) => (typeof window !== 'undefined' ? window.matchMedia?.(q) : undefined);
function useMedia(q: string) {
  const [matches, setMatches] = useState(() => Boolean(media(q)?.matches));
  useEffect(() => {
    const mq = media(q);
    if (!mq) return;
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return matches;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [local, setLocal] = useState<Prefs>(readLocal);
  const systemReducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const systemDark = useMedia('(prefers-color-scheme: dark)');
  const prefs: Prefs = user?.preferences ? { ...local, ...user.preferences } : local;
  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', prefs.reduceMotion);
    root.classList.toggle('motion-on', Boolean(prefs.motionOn) && !prefs.reduceMotion);
    root.dataset.textSize = prefs.textSize;
    root.dataset.underlineLinks = String(prefs.underlineLinks);
    root.dataset.accent = ACCENTS.some((a) => a.value === prefs.accent) ? prefs.accent : 'blue';
  }, [prefs.reduceMotion, prefs.motionOn, prefs.textSize, prefs.underlineLinks, prefs.accent]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#111A2E' : '#ffffff');
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);

  const setVisitorPrefs = useCallback((p: Partial<Prefs>) => {
    setLocal((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: preference lasts for this visit only */
      }
      return next;
    });
  }, []);

  const setPreference: Ctx['setPreference'] = async (p) => {
    // Always remembered locally too, so the choice survives signing out on this device.
    setVisitorPrefs(p);
    if (!user?.preferences) return;
    setUser({ ...user, preferences: { ...user.preferences, ...p } } as User);
    try {
      await api.patch('/account/preferences', p);
      qc.invalidateQueries({ queryKey: ['preferences'] });
    } catch {
      /* the local choice still applies; the settings page shows any save problem */
    }
  };

  return (
    <PrefsContext.Provider value={{ prefs, systemReducedMotion, resolvedTheme, setVisitorPrefs, setPreference }}>
      <MotionConfig reducedMotion={prefs.reduceMotion ? 'always' : prefs.motionOn ? 'never' : 'user'}>{children}</MotionConfig>
    </PrefsContext.Provider>
  );
}

export const usePreferences = () => useContext(PrefsContext);

/** True when nonessential motion should be skipped. */
export function useCalmMotion() {
  const { prefs, systemReducedMotion } = usePreferences();
  return prefs.reduceMotion || (systemReducedMotion && !prefs.motionOn);
}
