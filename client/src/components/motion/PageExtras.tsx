import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from '../ui/icons';

const calm = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));

/** Thin colour bar at the top that fills as the page is scrolled. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return <div ref={ref} aria-hidden="true" className="scroll-progress" />;
}

/** Round button that appears after scrolling down and returns to the top. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button type="button" className="back-top" data-show={show} aria-label="Back to top" tabIndex={show ? 0 : -1} onClick={() => window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' })}>
      <ArrowUp size={20} />
    </button>
  );
}
