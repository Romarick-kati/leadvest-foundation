import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { Button, Modal } from '../ui';
import { CookieBite } from '../ui/icons';
import { useT } from '../../i18n';

/**
 * Cookie consent. Strictly necessary storage (session cookie, CSRF protection, theme,
 * language and this choice) is always on. Analytics is off until the visitor allows it, and
 * no analytics script is requested before that. The choice is stored with a version and an
 * expiry, so changing the categories or waiting twelve months asks again.
 */
export interface Consent {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
  version: number;
}

const KEY = 'lvf.cookieConsent';
const VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = 'lvf:cookie-settings';

const listeners = new Set<() => void>();
let cached: Consent | null | undefined;

function read(): Consent | null {
  if (cached !== undefined) return cached;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Consent | null;
    const fresh = raw && raw.version === VERSION && Date.now() - Date.parse(raw.decidedAt) < MAX_AGE_MS;
    cached = fresh ? raw : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function saveConsent(analytics: boolean): Consent {
  const value: Consent = { necessary: true, analytics, decidedAt: new Date().toISOString(), version: VERSION };
  cached = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  listeners.forEach((l) => l());
  return value;
}

/** For tests. */
export function resetConsentCache() {
  cached = undefined;
}

export function useConsent() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
}

/** Opens the cookie settings dialog from anywhere, such as the footer link. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const analyticsSrc = (import.meta.env.VITE_ANALYTICS_SRC as string | undefined)?.trim() || '';
const analyticsDomain = (import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined)?.trim() || '';
export const analyticsConfigured = Boolean(analyticsSrc && analyticsDomain);

/**
 * Loads the optional privacy friendly analytics script (Plausible compatible) only after
 * consent, never in the children's learning area or signed in dashboards, and removes it
 * again if consent is withdrawn.
 */
function AnalyticsLoader({ allowed }: { allowed: boolean }) {
  const { pathname } = useLocation();
  const excluded = /^\/(learning|dashboard|admin|account|settings)(\/|$)/.test(pathname);
  useEffect(() => {
    const existing = document.getElementById('lvf-analytics');
    if (!analyticsConfigured || !allowed || excluded) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const s = document.createElement('script');
    s.id = 'lvf-analytics';
    s.defer = true;
    s.src = analyticsSrc;
    s.dataset.domain = analyticsDomain;
    document.head.appendChild(s);
  }, [allowed, excluded]);
  return null;
}

export function CookieConsent() {
  const t = useT();
  const consent = useConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const open = () => {
      setAnalytics(read()?.analytics ?? false);
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const decide = (value: boolean) => {
    saveConsent(value);
    setSettingsOpen(false);
    setAnnounce(t('cookies.saved'));
  };

  return (
    <>
      <AnalyticsLoader allowed={Boolean(consent?.analytics)} />
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
      <AnimatePresence>
        {!consent && !settingsOpen && (
          <m.section
            role="region"
            aria-labelledby="cookie-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.16 } }}
            className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-xl border border-line bg-surface p-4 shadow-lift sm:inset-x-6 sm:bottom-6 sm:p-5"
          >
            <div className="flex gap-3">
              <span className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-sun-100 text-sun-600 sm:grid" aria-hidden>
                <CookieBite size={18} />
              </span>
              <div className="min-w-0">
                <h2 id="cookie-title" className="text-base font-semibold text-heading">
                  {t('cookies.title')}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {t('cookies.intro')}{' '}
                  <Link to="/cookies" className="font-medium underline">
                    {t('cookies.policy')}
                  </Link>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide(true)}>
                    {t('cookies.acceptAll')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => decide(false)}>
                    {t('cookies.rejectAll')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAnalytics(false);
                      setSettingsOpen(true);
                    }}
                  >
                    {t('cookies.customize')}
                  </Button>
                </div>
              </div>
            </div>
          </m.section>
        )}
      </AnimatePresence>
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('cookies.settingsTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => decide(false)}>
              {t('cookies.rejectAll')}
            </Button>
            <Button onClick={() => decide(analytics)}>{t('cookies.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-heading">{t('cookies.necessaryTitle')}</h3>
              <span className="rounded-full bg-mint-50 px-2.5 py-0.5 text-xs font-semibold text-mint-700">{t('cookies.alwaysOn')}</span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{t('cookies.necessaryText')}</p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-semibold text-heading">{t('cookies.analyticsTitle')}</span>
              <input
                type="checkbox"
                role="switch"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="h-5 w-5 accent-blue-600"
                aria-describedby="cookie-analytics-text"
              />
            </label>
            <p id="cookie-analytics-text" className="mt-1 text-sm text-ink-muted">
              {t('cookies.analyticsText')}
              {!analyticsConfigured && <span className="mt-1 block">{t('cookies.analyticsNotConfigured')}</span>}
            </p>
          </div>
          <Link to="/cookies" onClick={() => setSettingsOpen(false)} className="inline-block text-sm font-medium underline">
            {t('cookies.policy')}
          </Link>
        </div>
      </Modal>
    </>
  );
}
