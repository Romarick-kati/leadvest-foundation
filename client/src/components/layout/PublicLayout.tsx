import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { BackBar } from './BackBar';
import { PageLoader } from '../ui';
import { ServiceNotice } from './ServiceNotice';
import { WhatsAppButton } from './WhatsAppButton';
import { CookieConsent } from '../privacy/consent';
import { BackToTop, ScrollProgress } from '../motion/PageExtras';
import { PaywallGate } from './Guards';

export function SkipLink() {
  return (
    <a href="#main" className="sr-only z-[200] rounded bg-navy px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      Skip to main content
    </a>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' } }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/** Scrolls to #hash targets after navigation, since client side routing does not. */
function HashScroller() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' }), 120);
    return () => clearTimeout(t);
  }, [hash, pathname]);
  return null;
}

/**
 * Scroll animation for every page: blocks and grid items that are below the first screen fade
 * and rise in, one after another, as they come into view. Watches for content that loads later
 * (lists from the server). Skipped for reduced motion. Uses the data-reveal rules in index.css.
 */
function AutoReveal() {
  const { pathname } = useLocation();
  useEffect(() => {
    const calm = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));
    if (typeof IntersectionObserver === 'undefined' || calm()) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (e.target as HTMLElement).dataset.reveal = 'shown';
        io.unobserve(e.target);
      }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    const scan = () => {
      const targets = document.querySelectorAll<HTMLElement>('main .container-page > *, main .container-page .grid > *, main .container-page ul.grid > li');
      targets.forEach((el, i) => {
        if (el.dataset.auto || el.hasAttribute('data-reveal') || el.hasAttribute('data-reveal-stagger') || el.closest('[data-reveal],[data-reveal-stagger],[data-no-reveal]')) return;
        el.dataset.auto = '1';
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        const index = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : i;
        el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 90}ms`);
        el.dataset.reveal = 'hidden';
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(scan, 120); });
    let timer = 0;
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); window.clearTimeout(timer); };
  }, [pathname]);
  return null;
}

export function PublicLayout() {
  return (
    <>
      <PaywallGate />
      <HashScroller />
      <AutoReveal />
      <SkipLink />
      <ScrollProgress />
      <ServiceNotice />
      <Header />
      <BackBar />
      <main id="main" tabIndex={-1} className="min-h-dvh overflow-x-clip focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
      <BackToTop />
      <CookieConsent />
      <ScrollRestoration />
    </>
  );
}
