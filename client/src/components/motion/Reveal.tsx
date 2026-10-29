import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Scroll reveal. Elements that are already on screen when the page opens are left alone, so
 * the first screen never waits for JavaScript and the largest paint is not delayed. Elements
 * further down fade and rise in once as they scroll into view. Plain CSS transitions (see
 * index.css); switched off for reduced motion by the operating system or the site setting.
 */
function calm() {
  return document.documentElement.classList.contains('reduce-motion') || (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));
}

function useRevealAttr<T extends HTMLElement>(attr: 'reveal' | 'revealStagger') {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || calm()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset[attr] = 'hidden';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset[attr] = 'shown';
        io.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [attr]);
  return ref;
}

type As = 'div' | 'section' | 'li' | 'ul' | 'ol' | 'article' | 'aside';

export function Reveal({ children, className, as = 'div', delay = 0, from }: { children: ReactNode; delay?: number; className?: string; as?: As; from?: 'left' | 'right' | 'scale' | 'fade' }) {
  const ref = useRevealAttr<HTMLDivElement>('reveal');
  const Comp = as as 'div';
  const style = delay ? ({ '--reveal-delay': `${Math.round(delay * 1000)}ms` } as CSSProperties) : undefined;
  return (
    <Comp ref={ref} className={className} style={style} data-reveal-from={from}>
      {children}
    </Comp>
  );
}

/** Reveals each direct child in turn, for card grids and lists. */
export function Stagger({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: As }) {
  const ref = useRevealAttr<HTMLDivElement>('revealStagger');
  const Comp = as as 'div';
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}

/** True once the element has been on screen. */
export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setInView(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setInView(true), io.disconnect()), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/**
 * Moves an element a little as the page scrolls, for depth behind hero images. Uses one
 * passive listener and requestAnimationFrame, and does nothing for reduced motion.
 */
export function useParallax<T extends HTMLElement>(strength = 0.08) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -strength;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [strength]);
  return ref;
}
