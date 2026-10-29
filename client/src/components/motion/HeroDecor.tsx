import { useEffect, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { BookOpen, Compass, GraduationCap, Heart, Lightbulb, Star } from '../ui/icons';
import { cn } from '../../lib/cn';
import { HeroParticles, HeroRays } from './HeroExtras';

const calm = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.documentElement.classList.contains('motion-on'));

/**
 * Moves the hero's decorative layers a little as the pointer moves (mouse and trackpad only).
 * Sets --mx and --my (-1 to 1) on the element; layers read them with the .hero-layer class.
 */
export function usePointerParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || calm() || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const leave = () => { x = 0; y = 0; if (!frame) frame = requestAnimationFrame(apply); };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); cancelAnimationFrame(frame); };
  }, [ref]);
}

// m: also shown on phones (placed in the margins above and below the text, never over it).
const sparkles = [
  { l: '3%', t: '6%', s: 16, d: '4.2s', w: '0s', m: false },
  { l: '44%', t: '4%', s: 14, d: '5s', w: '0.5s', m: false },
  { l: '73%', t: '10%', s: 20, d: '4.6s', w: '1.4s', m: true },
  { l: '90%', t: '5%', s: 14, d: '3.9s', w: '0.8s', m: true },
  { l: '62%', t: '3%', s: 11, d: '3.8s', w: '2s', m: true },
  { l: '97%', t: '52%', s: 16, d: '4.8s', w: '1s', m: false },
  { l: '96%', t: '30%', s: 12, d: '4s', w: '2.8s', m: false },
  { l: '60%', t: '95%', s: 14, d: '3.7s', w: '1.7s', m: false },
  { l: '92%', t: '88%', s: 12, d: '4.1s', w: '3s', m: false },
  { l: '14%', t: '94%', s: 14, d: '4.4s', w: '2.4s', m: true },
  { l: '40%', t: '95%', s: 12, d: '5.2s', w: '0.2s', m: true },
  { l: '24%', t: '3%', s: 10, d: '3.6s', w: '1.1s', m: true },
];

const bubbles: { icon: ReactNode; cls: string; depth: number; delay: string; bob: string; size: string }[] = [
  { icon: <GraduationCap size={22} />, cls: 'right-[5%] top-[7%] flex', depth: 22, delay: '0.4s', bob: '6s', size: 'h-9 w-9 sm:h-12 sm:w-12' },
  { icon: <BookOpen size={20} />, cls: 'right-[2%] bottom-[30%] hidden md:flex', depth: -16, delay: '0.7s', bob: '7s', size: 'h-11 w-11' },
  { icon: <Lightbulb size={20} />, cls: 'right-[6%] bottom-[11%] flex', depth: 30, delay: '1s', bob: '5.5s', size: 'h-9 w-9 sm:h-11 sm:w-11' },
  { icon: <Star size={18} />, cls: 'left-[52%] top-[4%] hidden md:flex', depth: -26, delay: '1.2s', bob: '6.5s', size: 'h-10 w-10' },
  { icon: <Heart size={18} />, cls: 'left-[52%] bottom-[5%] hidden lg:flex', depth: 18, delay: '0.9s', bob: '7.5s', size: 'h-10 w-10' },
  { icon: <Compass size={20} />, cls: 'left-[2%] bottom-[8%] hidden 2xl:flex', depth: -22, delay: '1.4s', bob: '6.2s', size: 'h-11 w-11' },
];

/** Decorative hero background: sparkles, floating icon bubbles, pulsing rings and morphing blobs. */
export function HeroDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <HeroRays />
      <HeroParticles />
      <div className="hero-layer absolute inset-0" style={{ '--depth': 8 } as CSSProperties}>
        <div className="hero-blob absolute -right-20 top-[8%] h-72 w-72 bg-gradient-to-br from-sun/30 to-blue-600/10 blur-2xl sm:h-96 sm:w-96" />
        <div className="hero-blob absolute -left-16 bottom-[6%] h-64 w-64 bg-gradient-to-tr from-teal/30 to-transparent blur-2xl" style={{ animationDelay: '-5s' }} />
      </div>
      <div className="hero-layer absolute right-[12%] top-[38%] hidden xl:block" style={{ '--depth': 14 } as CSSProperties}>
        {[0, 1.5, 3].map((d) => (
          <span key={d} className="hero-ring absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun/50" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
      {sparkles.map((s, i) => (
        <span key={i} className={cn('hero-layer absolute', !s.m && 'hidden sm:block')} style={{ left: s.l, top: s.t, '--depth': 6 + (i % 4) * 5 } as CSSProperties}>
          <svg viewBox="0 0 24 24" width={s.s} height={s.s} className="sparkle text-sun" style={{ '--dur': s.d, '--delay': s.w } as CSSProperties} fill="currentColor">
            <path d="M12 0C12 8 16 12 24 12C16 12 12 16 12 24C12 16 8 12 0 12C8 12 12 8 12 0Z" />
          </svg>
        </span>
      ))}
      {bubbles.map((b, i) => (
        <span key={i} className={cn('hero-layer absolute', b.cls)} style={{ '--depth': b.depth } as CSSProperties}>
          <span className="hero-bubble block" style={{ '--delay': b.delay } as CSSProperties}>
            <span className={cn('items-center justify-center rounded-full border border-white/25 bg-white/10 text-sun shadow-lift backdrop-blur-sm', b.size)} style={{ '--bob': b.bob, '--delay': b.delay } as CSSProperties}>
              {b.icon}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

/** Two layers of slowly moving waves along the bottom edge of the hero. `className` sets the colour of the next section. */
export function HeroWave({ className }: { className?: string }) {
  const d = 'M0 60 C240 10 480 110 720 60 C960 10 1200 110 1440 60 C1680 10 1920 110 2160 60 C2400 10 2640 110 2880 60 V120 H0 Z';
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 -bottom-px -z-10 h-12 overflow-hidden sm:h-16 lg:h-20', className)}>
      <svg className="hero-wave-b absolute bottom-0 left-0 h-full w-[200%] max-w-none opacity-40" viewBox="0 0 2880 120" preserveAspectRatio="none"><path d={d} fill="currentColor" /></svg>
      <svg className="hero-wave-a absolute bottom-0 left-0 h-[78%] w-[200%] max-w-none" viewBox="0 0 2880 120" preserveAspectRatio="none"><path d={d} fill="currentColor" /></svg>
    </div>
  );
}

/** Rotating text badge for large screens: a ring of words around a graduation cap. */
export function HeroBadge() {
  return (
    <div aria-hidden="true" className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="hero-badge-ring absolute inset-0 animate-spin-slow" style={{ animationDuration: '24s' }}>
        <defs><path id="hero-badge-path" d="M60 60 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0" /></defs>
        <text fontSize="11" fontWeight="700"><textPath href="#hero-badge-path" textLength="292" lengthAdjust="spacing">LEARN • GROW • LEAD • CARE • SHARE •</textPath></text>
      </svg>
      <span className="absolute inset-[26%] flex items-center justify-center rounded-full bg-sun text-navy shadow-lift"><GraduationCap size={26} /></span>
    </div>
  );
}
