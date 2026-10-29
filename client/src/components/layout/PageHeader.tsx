import type { ReactNode } from 'react';
import type { ImageKey } from '../../config/images';
import { SmartImage } from '../brand/SmartImage';
import { Ambient } from '../motion/Ambient';
import { Reveal, useParallax } from '../motion/Reveal';
import { SparkleField } from '../motion/HeroExtras';
import { useTx, useTxNode } from '../../i18n/phrases';

/**
 * Intro band for inner pages. With an image it becomes two columns on larger screens and
 * stacks on phones (text first, so the heading is the first thing people see).
 */
export function PageHeader({ eyebrow, title, children, actions, image }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode; image?: ImageKey }) {
  const parallax = useParallax<HTMLDivElement>(0.05);
  const n = useTxNode();
  const tx = useTx();
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-gradient-to-b from-canvas to-surface">
      <Ambient />
      <SparkleField />
      <div className={`container-page grid items-center gap-10 py-9 sm:py-12 lg:py-14 ${image ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12' : ''}`}>
        <div className="hero-rise min-w-0 max-w-3xl">
          {eyebrow && <p className="eyebrow mb-3">{tx(eyebrow)}</p>}
          <h1 className="text-h1">{tx(title)}</h1>
          {children && <div className="mt-5 text-lead text-ink-muted">{n(children)}</div>}
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {image && (
          <div className="relative isolate min-w-0 motion-safe:animate-rise-in" style={{ animationDelay: '120ms' }}>
            {/* Floating shapes around the photo, large screens only */}
            <span aria-hidden="true" className="absolute -right-5 -top-5 -z-10 hidden h-20 w-20 animate-drift rounded-3xl bg-sun/70 lg:block" />
            <span aria-hidden="true" className="absolute -bottom-6 -left-6 -z-10 hidden h-24 w-24 animate-float-delayed rounded-full border-[10px] border-teal/25 lg:block" />
            <div ref={parallax} data-parallax className="will-change-transform">
              <SmartImage image={image} priority rounded="rounded-[1.75rem]" className="shadow-lift ring-1 ring-black/5 motion-safe:animate-float-slow" sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function Section({ children, className = '', id, tone = 'white', labelledBy }: { children: ReactNode; className?: string; id?: string; tone?: 'white' | 'pale' | 'canvas'; labelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`relative isolate ${tone === 'white' ? 'bg-surface' : 'bg-canvas'} py-10 sm:py-14 lg:py-16 ${className}`}>
      <div aria-hidden="true" className="section-decor pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className="section-blob section-blob-a" />
        <span className="section-blob section-blob-b" />
      </div>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children, align = 'left', id, action }: { eyebrow?: string; title: string; children?: ReactNode; align?: 'left' | 'center'; id?: string; action?: ReactNode }) {
  const n = useTxNode();
  const tx = useTx();
  return (
    <Reveal className={`mb-7 sm:mb-8 flex flex-wrap items-end justify-between gap-4 ${align === 'center' ? 'justify-center text-center' : ''}`}>
      <div className={`min-w-0 max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
        {eyebrow && <p className="eyebrow mb-3">{tx(eyebrow)}</p>}
        <h2 id={id} className="text-h2">{tx(title)}</h2>
        <span aria-hidden="true" className="heading-bar" />
        {children && <div className="mt-4 text-lead text-ink-muted">{n(children)}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
