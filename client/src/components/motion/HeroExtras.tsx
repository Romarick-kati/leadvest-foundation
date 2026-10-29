import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Extra decoration. All of it is aria-hidden, uses only transform and opacity, and is frozen by
 * the reduced motion rules (unless the visitor switched animation on themselves).
 */

/** The words of a headline rise in one after another. The text stays ordinary text. */
export function SplitWords({ text, start = 0.1, step = 0.06, className }: { text: string; start?: number; step?: number; className?: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className={cn('word-rise', className)} style={{ '--i': i, '--start': `${start}s`, '--step': `${step}s` } as CSSProperties}>{w}</span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}

const dots = [
  { l: '6%', s: 8, d: 11, w: 0 }, { l: '14%', s: 12, d: 15, w: 3 }, { l: '22%', s: 6, d: 10, w: 6 },
  { l: '31%', s: 10, d: 13, w: 1.5 }, { l: '40%', s: 7, d: 12, w: 8 }, { l: '49%', s: 14, d: 17, w: 4 },
  { l: '57%', s: 8, d: 11, w: 9 }, { l: '65%', s: 11, d: 14, w: 2 }, { l: '73%', s: 6, d: 10, w: 7 },
  { l: '81%', s: 13, d: 16, w: 5 }, { l: '88%', s: 8, d: 12, w: 10 }, { l: '95%', s: 10, d: 13, w: 3.5 },
];

/** Soft bubbles that float up the hero, like confetti slowly rising. */
export function HeroParticles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((p, i) => (
        <span
          key={i}
          className={cn('hero-bubble-up absolute bottom-0 rounded-full', i % 3 === 0 ? 'bg-sun/70' : i % 3 === 1 ? 'bg-white/60' : 'bg-teal/70', i > 6 && 'hidden sm:block')}
          style={{ left: p.l, width: p.s, height: p.s, '--dur': `${p.d}s`, '--delay': `${p.w}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Slowly turning rays of light behind the hero text, plus a glow that follows the pointer. */
export function HeroRays() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-rays absolute left-[62%] top-[46%] hidden h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 sm:block" />
      <div className="hero-spot absolute inset-0" />
    </div>
  );
}

/** Two rows of big words that glide in opposite directions. Decoration only. */
export function WordRibbon({ words = ['Learn', 'Grow', 'Lead', 'Care', 'Share', 'Inspire'] }: { words?: string[] }) {
  const row = (reverse: boolean) => (
    <div className={cn('ribbon-track flex w-max items-center whitespace-nowrap', reverse && 'ribbon-reverse')}>
      {Array.from({ length: 2 }, (_, k) => (
        <div key={k} className="flex items-center gap-8 pr-8" aria-hidden={k === 1}>
          {[...words, ...words].map((w, i) => (
            <span key={`${k}-${i}`} className="flex items-center gap-8">
              <span className={cn('ribbon-word text-[clamp(2.25rem,1.5rem+4vw,4.5rem)] font-extrabold uppercase tracking-tight', i % 2 ? 'ribbon-fill' : 'ribbon-outline')}>{w}</span>
              <span className="ribbon-star text-sun">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
  return (
    <section aria-hidden="true" className="relative overflow-hidden border-y border-line bg-surface py-5 sm:py-7">
      <div className="space-y-2 sm:space-y-3">{row(false)}{row(true)}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent sm:w-32" />
    </section>
  );
}

const field = [
  { l: '5%', t: '14%', s: 14, d: '4.4s', w: '0s' }, { l: '92%', t: '20%', s: 18, d: '5s', w: '1s' },
  { l: '80%', t: '78%', s: 12, d: '4s', w: '2s' }, { l: '12%', t: '82%', s: 16, d: '4.8s', w: '1.4s' },
  { l: '50%', t: '8%', s: 10, d: '3.8s', w: '2.6s' },
];

/** A few twinkling stars for the corners of a band. Place it inside a `relative isolate` parent. */
export function SparkleField({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      {field.map((s, i) => (
        <svg key={i} viewBox="0 0 24 24" width={s.s} height={s.s} className={cn('sparkle absolute text-sun', i > 2 && 'hidden sm:block')} style={{ left: s.l, top: s.t, '--dur': s.d, '--delay': s.w } as CSSProperties} fill="currentColor">
          <path d="M12 0C12 8 16 12 24 12C16 12 12 16 12 24C12 16 8 12 0 12C8 12 12 8 12 0Z" />
        </svg>
      ))}
      {children}
    </div>
  );
}
