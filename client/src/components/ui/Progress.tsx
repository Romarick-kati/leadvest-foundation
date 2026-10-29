import { Check } from './icons';
import { m } from 'framer-motion';
import { cn } from '../../lib/cn';

export function ProgressBar({ value, max = 100, label, tone = 'blue', className, showValue = true }: { value: number; max?: number; label: string; tone?: 'blue' | 'mint' | 'sun'; className?: string; showValue?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill = { blue: 'bg-blue', mint: 'bg-[#3BB27A]', sun: 'bg-sun' }[tone];
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-caption font-semibold text-heading">
        <span>{label}</span>
        {showValue && <span>{pct}%</span>}
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden rounded-full bg-navy-50">
        <m.div className={cn('h-full rounded-full', fill)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

/** Numbered steps for multi step flows such as two factor setup. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-caption font-semibold" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2',
              i < current && 'border-mint-700 bg-mint text-heading',
              i === current && 'border-blue-600 bg-blue-600 text-white',
              i > current && 'border-line-strong text-ink-muted',
            )}
          >
            {i < current ? <Check size={12} /> : i + 1}
          </span>
          <span className={i === current ? 'text-heading' : 'text-ink-muted'}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-6 bg-line-strong sm:block" />}
        </li>
      ))}
    </ol>
  );
}
