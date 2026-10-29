import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import type { Role } from '../../lib/types';
import { PageLoader } from '../ui';

/**
 * Interface level guard for a better experience. Real protection is enforced by the API:
 * every protected endpoint checks the session and role on the server.
 */
/** Tells search engines not to list a page. Used on everything behind a sign in (account, dashboard, payments). */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);
}

export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  useNoIndex();
  const { user, loading, mfaPending } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (mfaPending) return <Navigate to={`/sign-in/verify?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  // A new member who has not chosen a role yet is sent to the one-tap role choice, not an error page.
  if (roles && user.role === 'MEMBER' && !roles.includes('MEMBER')) return <Navigate to="/welcome" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

/**
 * Keeps people who have not paid out of the areas that need payment (their account and the
 * learning area). The server enforces the same rule; this just gives a smooth redirect.
 */
export function PaywallGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (user?.access?.required && !user.access.active && /^\/(account|learning)(\/|$)/.test(pathname)) return <Navigate to="/subscribe" replace />;
  return null;
}
