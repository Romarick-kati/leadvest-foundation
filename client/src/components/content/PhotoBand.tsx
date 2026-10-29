import { useEffect, useRef, type ReactNode } from 'react';
import { images, type ImageEntry, type ImageKey } from '../../config/images';
import { Illustration } from '../brand/Illustration';
import { Ambient } from '../motion/Ambient';
import { Reveal } from '../motion/Reveal';
import { useTx, useTxNode } from '../../i18n/phrases';

/**
 * Full width band with a photo behind navy tint. The photo is taller than the band and
 * moves a little slower than the page (parallax), measured from the band itself so the
 * movement never feeds back into the measurement. Reduced motion keeps it still.
 */
export function PhotoBand({ image, eyebrow, title, children, actions }: { image: ImageKey; eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  const band = useRef<HTMLElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const entry: ImageEntry = images[image];
  const tx = useTx();
  const n = useTxNode();

  useEffect(() => {
    const el = band.current;
    const bg = layer.current;
    const calm = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));
    if (!el || !bg || calm()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      bg.style.transform = `translate3d(0, ${(progress * -60).toFixed(1)}px, 0)`;
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
  }, []);

  return (
    <section ref={band} className="relative isolate overflow-hidden bg-navy py-14 text-white sm:py-20">
      <div ref={layer} data-parallax className="absolute inset-x-0 -inset-y-16 -z-20 will-change-transform">
        {entry.src ? (
          <img src={entry.src} srcSet={entry.srcSet} sizes="100vw" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <Illustration scene={entry.scene} className="h-full w-full opacity-40" />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/55" />
      <Ambient tone="dark" />
      <div className="container-page">
        <Reveal className="max-w-2xl">
          {eyebrow && <p className="mb-3 text-label uppercase tracking-[0.12em] text-sun">{tx(eyebrow)}</p>}
          <h2 className="text-h2 !text-white">{tx(title)}</h2>
          {children && <div className="mt-4 text-lead text-white/85">{n(children)}</div>}
          {actions && <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">{actions}</div>}
        </Reveal>
      </div>
    </section>
  );
}
