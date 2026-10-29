import { formatNumber } from '../../lib/format';
import { useEffect, useState } from 'react';
import type { ImpactItem, SiteSettings } from '../../lib/types';
import { useInView } from '../motion/Reveal';
import { useCalmMotion } from '../../lib/preferences';
import { cn } from '../../lib/cn';

const format = (n: number) => formatNumber(n, { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 });

function CountUp({ item, run }: { item: ImpactItem; run: boolean }) {
  const calm = useCalmMotion();
  const [shown, setShown] = useState(calm ? item.value : 0);
  useEffect(() => {
    if (!run) return;
    if (calm) return setShown(item.value);
    let frame = 0;
    const start = performance.now();
    const duration = 1600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Number.isInteger(item.value) ? Math.round(item.value * eased) : item.value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, calm, item.value]);
  return (
    <>
      <span aria-hidden="true" className="tabular-nums">
        {item.prefix}
        {format(shown)}
        {item.suffix}
      </span>
      <span className="sr-only">
        {item.prefix}
        {format(item.value)}
        {item.suffix}
      </span>
    </>
  );
}

/**
 * "At a glance" figures with counters that run once when scrolled into view. Shows only
 * figures an administrator entered in Dashboard > Settings > Impact figures; renders
 * nothing when there are none, so no number is ever invented.
 */
export function ImpactStats({ impact, tone = 'light', title = 'At a glance' }: { impact: SiteSettings['impact']; tone?: 'light' | 'dark'; title?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  if (!impact.items.length) return null;
  const dark = tone === 'dark';
  return (
    <div ref={ref}>
      <h2 className={cn('text-h2', dark && '!text-white')}>{title}</h2>
      <dl className={cn('mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5', impact.items.length >= 3 && 'lg:grid-cols-3', impact.items.length === 4 && 'lg:grid-cols-4')}>
        {impact.items.map((item, i) => (
          <div key={i} className={cn('flex min-w-0 flex-col-reverse gap-2 rounded-2xl p-6 sm:p-8', dark ? 'bg-white/[0.06] ring-1 ring-inset ring-white/10 backdrop-blur' : 'bg-surface shadow-card ring-1 ring-line')}>
            <dt className={cn('text-[0.95rem] font-semibold', dark ? 'text-white/75' : 'text-ink-muted')}>{item.label}</dt>
            <dd className={cn('text-[clamp(2.25rem,5vw,3.25rem)] font-extrabold leading-none tracking-tight', dark ? 'text-white' : 'text-heading')}>
              <CountUp item={item} run={inView} />
            </dd>
          </div>
        ))}
      </dl>
      {(impact.asOf || impact.note) && (
        <p className={cn('mt-4 text-caption', dark ? 'text-white/60' : 'text-ink-muted')}>{[impact.asOf, impact.note].filter(Boolean).join('. ')}</p>
      )}
    </div>
  );
}
