import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import {
  BarChart3, Bell, BookOpen, CalendarDays, ClipboardList, CreditCard, FileText, GraduationCap, Home, Image, Inbox, LayoutDashboard, LogOut, Menu, Newspaper, ScrollText, Settings, ShieldCheck, UserCheck, Users, X, Lock,
} from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/cn';
import { Logo } from '../../components/brand/Logo';
import { SkipLink } from '../../components/layout/PublicLayout';
import { Avatar, ButtonLink, PageLoader } from '../../components/ui';
import { LanguageSelect, TextSizeToggle, ThemeToggle } from '../../components/layout/QuickPrefs';
import { NotificationBell } from '../../components/layout/NotificationBell';
import { useT } from '../../i18n';

const groups = [
  { title: '', items: [{ to: '/admin', label: 'admin.overview', icon: LayoutDashboard, end: true }] },
  { title: 'admin.content', items: [
    { to: '/admin/programs', label: 'admin.programs', icon: GraduationCap },
    { to: '/admin/events', label: 'admin.events', icon: CalendarDays },
    { to: '/admin/learning', label: 'admin.learning', icon: BookOpen },
    { to: '/admin/articles', label: 'admin.articles', icon: Newspaper },
    { to: '/admin/pages', label: 'admin.pages', icon: FileText },
    { to: '/admin/media', label: 'admin.media', icon: Image },
  ] },
  { title: 'admin.people', items: [
    { to: '/admin/registrations', label: 'admin.registrations', icon: ClipboardList },
    { to: '/admin/enquiries', label: 'admin.enquiries', icon: Inbox },
    { to: '/admin/users', label: 'admin.users', icon: Users },
    { to: '/admin/announcements', label: 'admin.announcements', icon: Bell },
    { to: '/admin/instructors', label: 'admin.instructors', icon: UserCheck },
    { to: '/admin/guardians', label: 'admin.guardians', icon: ShieldCheck },
  ] },
  { title: 'admin.operations', items: [
    { to: '/admin/payments', label: 'admin.payments', icon: CreditCard },
    { to: '/admin/reports', label: 'admin.reports', icon: BarChart3 },
    { to: '/admin/privacy', label: 'admin.privacyRequests', icon: Lock },
    { to: '/admin/audit', label: 'admin.audit', icon: ScrollText },
    { to: '/admin/settings', label: 'admin.settings', icon: Settings },
    { to: '/admin/help', label: 'admin.help', icon: BookOpen },
  ] },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  return (
    <nav aria-label={t('admin.dashboard')} className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.title || 'main'}>
          {g.title && <p className="mb-1.5 px-3 text-caption font-semibold uppercase tracking-[0.1em] text-white/60">{t(g.title)}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item}
                  onClick={onNavigate}
                  className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[0.95rem] font-medium no-underline transition-colors', isActive ? 'bg-surface text-heading' : 'text-white/85 hover:bg-white/10 hover:text-white')}
                >
                  <item.icon size={18} aria-hidden />
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // Probes the server policy. The API refuses every admin route until 2FA is on.
  const gate = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get('/admin/overview'), retry: false });
  useEffect(() => setOpen(false), [pathname]);
  // Drawer on smaller screens: lock page scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const mfaRequired = gate.error instanceof ApiError && gate.error.code === 'admin_mfa_required';

  return (
    <div className="min-h-dvh bg-canvas">
      <SkipLink />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5"><Logo size={32} tone="white" to="/admin" /></div>
        <Sidebar />
        <div className="border-t border-white/10 p-3">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/85 no-underline hover:bg-white/10"><Home size={16} aria-hidden /> {t('admin.viewSite')}</Link>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <m.div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <m.aside role="dialog" aria-modal="true" aria-label={t('admin.menu')} className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-navy pb-[env(safe-area-inset-bottom)] lg:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.22 }}>
              <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
                <Logo size={30} tone="white" to="/admin" />
                <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10" aria-label={t('common.closeMenu')}><X size={22} /></button>
              </div>
              <Sidebar onNavigate={() => setOpen(false)} />
            </m.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-navy bg-navy text-white shadow-soft transition-colors hover:bg-navy-700 lg:hidden dark:border-white/40 dark:bg-white/10" onClick={() => setOpen(true)} aria-label={t('common.openMenu')}><Menu size={24} /></button>
            <span className="font-semibold text-heading">{t('admin.dashboard')}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <LanguageSelect compact className="hidden sm:inline-flex" />
            <TextSizeToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <NotificationBell />
            <Link to="/settings/profile" aria-label={user?.displayName ?? 'Profile'} title={user?.displayName} className="flex items-center no-underline"><Avatar name={user?.displayName ?? ''} src={user?.avatarUrl} size={36} /></Link>
            <button type="button" onClick={async () => { await signOut(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-heading hover:bg-navy-50"><LogOut size={16} aria-hidden /> <span className="hidden min-[400px]:inline">{t('common.signOut')}</span></button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[90rem] px-4 py-6 focus:outline-none sm:px-6 lg:py-8">
          {gate.isLoading ? <PageLoader /> : mfaRequired ? (
            <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-8 text-center shadow-soft">
              <ShieldCheck className="mx-auto text-blue-600" size={40} aria-hidden />
              <h1 className="mt-4 text-h3">{t('admin.require2faTitle')}</h1>
              <p className="mt-2 text-ink-muted">{t('admin.require2faText')}</p>
              <ButtonLink to="/settings/security" className="mt-6">{t('admin.goSecurity')}</ButtonLink>
            </div>
          ) : (
            <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
          )}
        </main>
      </div>
    </div>
  );
}
