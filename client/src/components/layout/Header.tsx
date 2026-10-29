import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { Menu, X, LogOut } from '../ui/icons';
import { Logo } from '../brand/Logo';
import { ButtonLink } from '../ui';
import { useAuth, homeFor } from '../../lib/auth';
import { useSite } from '../../lib/site';
import { SocialIcons } from '../../lib/contact';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n';
import { LanguageSelect, TextSizeToggle, ThemeToggle } from './QuickPrefs';
import { mobileNav } from './nav';
import { DesktopNav } from './DesktopNav';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const t = useT();
  const { user, loading, signOut } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on navigation.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While open: lock page scroll, close on Escape, keep Tab inside the menu, and close if the
  // window grows to desktop width.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    const focusables = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      } else if (e.key === 'Tab') {
        const items = [toggleRef.current!, ...focusables()];
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : i === items.length - 1 ? 0 : i + 1;
        e.preventDefault();
        items[next]?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1280px)');
    const onResize = () => desktop.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [open]);

  return (
    <header className={cn('sticky top-0 z-40 border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85', scrolled || open ? 'border-line shadow-soft' : 'border-transparent')}>
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-3 !max-w-[92rem]">
        <Logo size={44} fluid className="min-w-0" />

        <DesktopNav />

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <LanguageSelect compact className="hidden xl:inline-flex" />
          <TextSizeToggle className="hidden lg:inline-flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          {!loading && !user && (
            <NavLink to="/sign-in" className="hidden min-h-11 items-center rounded-full px-3 text-[0.95rem] font-semibold text-heading no-underline hover:bg-canvas hover:text-blue-700 2xl:px-4 xl:inline-flex">
              {t('common.signIn')}
            </NavLink>
          )}
          {user && <NotificationBell />}
          {user && (
            <div className="hidden xl:block">
              <AccountMenu />
            </div>
          )}
          <ButtonLink to="/contact" size="sm" className="ml-1 hidden whitespace-nowrap sm:inline-flex motion-safe:animate-glow-ring">
            {t('common.contactUs')}
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-heading transition-colors hover:bg-canvas xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('common.closeMenu') : t('common.openMenu')}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={cn('absolute transition-[transform,opacity] duration-200', open ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100')}>
              <Menu size={22} />
            </span>
            <span className={cn('absolute transition-[transform,opacity] duration-200', open ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0')}>
              <X size={24} />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <m.div
              key="scrim"
              aria-hidden
              className="fixed inset-x-0 bottom-0 top-[4.5rem] z-30 bg-navy/30 xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <m.div
              key="menu"
              ref={panelRef}
              id="mobile-menu"
              className="fixed inset-x-0 top-[4.5rem] z-40 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-line bg-surface pb-[max(2rem,env(safe-area-inset-bottom))] shadow-lift xl:hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav aria-label={t('nav.main')} className="container-page pt-3">
                <ul className="hero-rise divide-y divide-line">
                  {mobileNav.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          cn('flex min-h-14 items-center gap-4 px-1 text-lg font-semibold no-underline', isActive ? 'text-blue-700' : 'text-heading hover:text-blue-700')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', isActive ? 'bg-blue-600 text-white' : 'bg-canvas text-blue-700')}>
                              <Icon size={16} />
                            </span>
                            {t(label)}
                            {isActive && <span className="sr-only">{t('common.currentPage')}</span>}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {user ? (
                    <>
                      <ButtonLink to={homeFor(user)} variant="secondary" size="lg">
                        {user.role === 'ADMIN' ? t('nav.dashboard') : user.role === 'LEARNER' || user.role === 'YOUTH' ? t('nav.myLearning') : user.role === 'INSTRUCTOR' ? t('nav.myPrograms') : t('nav.myAccount')}
                      </ButtonLink>
                      <button
                        type="button"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line-strong font-semibold text-heading hover:border-blue-600"
                        onClick={async () => {
                          await signOut();
                          navigate('/');
                        }}
                      >
                        <LogOut size={16} /> {t('common.signOut')}
                      </button>
                    </>
                  ) : (
                    <ButtonLink to="/sign-in" variant="secondary" size="lg">
                      {t('common.signIn')}
                    </ButtonLink>
                  )}
                  <ButtonLink to="/contact" size="lg" className="sm:col-span-2">
                    {t('common.contactUs')}
                  </ButtonLink>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                  <LanguageSelect className="border border-line" />
                  <ThemeToggle className="border border-line" />
                  <div className="ml-auto">
                    <SocialIcons site={site} size={16} />
                  </div>
                </div>
              </nav>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
