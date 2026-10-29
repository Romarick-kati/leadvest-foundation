import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Spinner } from '../../components/ui';
import { ArrowRight } from '../../components/ui/icons';
import { useT } from '../../i18n';
import { AuthShell, safeNext } from './AuthShell';

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');

/** Whether the server has Google sign in configured. Hidden when the API cannot be reached. */
export function useGoogleEnabled() {
  const q = useQuery({ queryKey: ['auth-providers'], queryFn: () => api.get<{ google: boolean }>('/auth/providers'), staleTime: 5 * 60_000, retry: false });
  // Shown whenever the server answers, so people can always see the option. If Google has not been
  // configured on the server yet, the click returns here with a clear message (auth.google.unavailable).
  return q.data !== undefined;
}

export function googleStartUrl(intent: 'login' | 'register' | 'link', next?: string | null) {
  const p = new URLSearchParams({ intent });
  if (next) p.set('next', next);
  return `${API_BASE}/api/auth/google/start?${p}`;
}

/** The multi colour Google "G" (Google's brand colours). */
function GoogleLogo() {
  return (
    <svg className="g-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * A full page link, not a fetch: the browser goes to Google and back so the server can verify
 * the result. Nothing about the sign in is decided in the browser.
 */
export function GoogleButton({ href, label, disabled, hint }: { href: string; label: string; disabled?: boolean; hint?: string }) {
  if (disabled) {
    return (
      <div>
        <button type="button" disabled aria-describedby="google-hint" className="google-btn">
          <span className="g-chip"><GoogleLogo /></span> {label}
        </button>
        {hint && (
          <p id="google-hint" className="mt-2 text-caption text-ink-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
  return (
    <a href={href} className="google-btn">
      <span className="g-chip"><GoogleLogo /></span>
      <span>{label}</span>
      <ArrowRight size={14} className="g-arrow" aria-hidden />
    </a>
  );
}

export function OrDivider() {
  const t = useT();
  return (
    <div className="or-divider my-5 flex items-center gap-3 text-caption uppercase tracking-wide text-ink-muted" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="or-text">{t('auth.or')}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Shows the reason a Google sign in came back with ?error=google_<code>. */
export function GoogleError() {
  const t = useT();
  const [params] = useSearchParams();
  const raw = params.get('error');
  if (!raw?.startsWith('google_')) return null;
  const code = raw.slice('google_'.length);
  const key = `auth.google.${code}`;
  const text = t(key);
  return <Alert tone="warning">{text === key ? t('auth.google.failed') : text}</Alert>;
}

/** Landing page after a Google sign in without two factor: loads the session, then moves on. */
export default function SignInComplete() {
  const t = useT();
  useDocumentTitle(t('auth.completing'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .get<{ user: User | null }>('/auth/me')
      .then(({ user }) => {
        if (user) setUser(user);
        navigate(user ? safeNext(params.get('next'), homeFor(user)) : '/sign-in?error=google_expired', { replace: true });
      })
      .catch(() => navigate('/sign-in?error=google_failed', { replace: true }));
  }, [setUser, navigate, params]);
  return (
    <AuthShell title={t('auth.completing')}>
      <div className="flex justify-center py-6">
        <Spinner size={28} />
      </div>
    </AuthShell>
  );
}
