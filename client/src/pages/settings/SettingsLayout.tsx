import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Accessibility, Bell, BookOpen, Globe, KeyRound, Lock, ShieldCheck, User, Users } from '../../components/ui/icons';
import { useAuth } from '../../lib/auth';
import type { Role } from '../../lib/types';
import { cn } from '../../lib/cn';
import { Alert, Button, PageLoader } from '../../components/ui';
import { useT } from '../../i18n';

const sections: { to: string; label: string; icon: React.ReactNode; roles?: Role[] }[] = [
  { to: 'profile', label: 'settings.profile', icon: <User size={18} /> },
  { to: 'account', label: 'settings.account', icon: <KeyRound size={18} />, roles: ['PARENT', 'YOUTH', 'INSTRUCTOR', 'ADMIN'] },
  { to: 'security', label: 'settings.security', icon: <ShieldCheck size={18} /> },
  { to: 'privacy', label: 'settings.privacy', icon: <Lock size={18} /> },
  { to: 'notifications', label: 'settings.notifications', icon: <Bell size={18} />, roles: ['PARENT', 'YOUTH', 'INSTRUCTOR', 'ADMIN'] },
  { to: 'appearance', label: 'settings.appearance', icon: <Globe size={18} /> },
  { to: 'accessibility', label: 'settings.accessibility', icon: <Accessibility size={18} /> },
  { to: 'learning', label: 'settings.learning', icon: <BookOpen size={18} />, roles: ['LEARNER', 'YOUTH'] },
  { to: 'family', label: 'settings.family', icon: <Users size={18} />, roles: ['PARENT'] },
];

export default function SettingsLayout() {
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visible = sections.filter((s) => !s.roles || (user && s.roles.includes(user.role)));
  const current = visible.find((s) => pathname.endsWith(`/${s.to}`))?.to ?? 'profile';

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-h1">{t('settings.title')}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <label htmlFor="settings-section" className="text-label text-heading">{t('settings.section')}</label>
          <select id="settings-section" value={current} onChange={(e) => navigate(e.target.value)} className="mt-1.5 block w-full rounded border border-line-strong bg-surface px-3.5 py-3 font-semibold text-heading">
            {visible.map((s) => <option key={s.to} value={s.to}>{t(s.label)}</option>)}
          </select>
        </div>
        <nav aria-label={t('settings.title')} className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {visible.map((s) => (
              <li key={s.to}>
                <NavLink to={s.to} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-4 py-2.5 font-semibold no-underline transition-colors', isActive ? 'bg-blue-50 text-blue-700' : 'text-heading hover:bg-navy-50')}>
                  {s.icon}
                  {t(s.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export function SettingsHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h2 className="text-h2">{title}</h2>
      {description && <p className="mt-2 text-ink-muted">{description}</p>}
    </header>
  );
}

/** Shown instead of an endless loading state when a settings page cannot load. */
export function SettingsLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="error">
      <p>{message}</p>
      <Button className="mt-3" variant="secondary" onClick={onRetry}>Try again</Button>
    </Alert>
  );
}
