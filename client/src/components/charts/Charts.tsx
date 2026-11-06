import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Colours are chosen to stay readable on both the light and the dark theme. */
export const COLORS = {
  confirmed: '#2FA36B',
  pending: '#F2A516',
  waitlisted: '#3B82F6',
  refused: '#E0524D',
  purple: '#8B5CF6',
  teal: '#14B8A6',
  blue: '#3B82F6',
  navy: '#6366F1',
  grey: '#94A3B8',
} as const;

export interface Series { key: string; label: string; color: string }

export function Legend({ items }: { items: { label: string; color: string; value?: ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-ink">
          <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: i.color }} aria-hidden />
          <span>{i.label}</span>
          {i.value != null && <span className="font-bold text-heading">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Columns, optionally stacked. Tap or focus a column to read its exact numbers underneath, which
 * works on phones where there is no mouse hover.
 */
export function Columns({
  data,
  series,
  label,
  height = 176,
  unit = '',
  format = (n: number) => String(n),
  describe,
}: {
  data: { id: string; label: string; values: Record<string, number> }[];
  series: Series[];
  label: string;
  height?: number;
  unit?: string;
  format?: (n: number) => string;
  /** Text read out for the active column. */
  describe?: (d: { id: string; label: string; values: Record<string, number> }) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((n, s) => n + (d.values[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const step = Math.max(1, Math.ceil(data.length / 7));
  const current = active != null ? data[active] : null;
  const grand = totals.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="relative pl-9" style={{ height }} role="group" aria-label={label}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 left-0 w-8 text-right text-[11px] leading-none text-ink-muted">{format(Math.round(max * f))}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-[2px]">
          {data.map((d, i) => {
            const total = totals[i]!;
            return (
              <button
                key={d.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                aria-label={describe ? describe(d) : `${d.label}: ${format(total)}${unit}`}
                className="group flex h-full min-w-0 flex-1 items-end rounded-t-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                <span className={cn('flex w-full flex-col-reverse overflow-hidden rounded-t-sm transition-opacity', active != null && active !== i && 'opacity-50')} style={{ height: `${(total / max) * 100}%`, minHeight: total > 0 ? 3 : 0 }}>
                  {series.map((s) => {
                    const v = d.values[s.key] ?? 0;
                    return v > 0 ? <span key={s.key} style={{ height: `${(v / total) * 100}%`, background: s.color }} /> : null;
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-1 flex gap-[2px] pl-9 text-[11px] text-ink-muted" aria-hidden>
        {data.map((d, i) => (
          <span key={d.id} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">{i % step === 0 ? d.label : ''}</span>
        ))}
      </div>
      <p className="mt-3 min-h-[2.75rem] text-sm" aria-live="polite">
        {current ? (
          <>
            <span className="font-bold text-heading">{current.label}: </span>
            {series.length > 1
              ? series.filter((s) => (current.values[s.key] ?? 0) > 0).map((s) => `${format(current.values[s.key] ?? 0)} ${s.label.toLowerCase()}`).join(' · ') || 'nothing'
              : `${format(totals[active!]!)}${unit}`}
          </>
        ) : (
          <span className="text-ink-muted">{grand === 0 ? 'Nothing to show for this period yet.' : 'Tap or hover a bar to see its numbers.'}</span>
        )}
      </p>
    </div>
  );
}

/** One horizontal bar per name, split by colour, with the number written next to it. */
export function NamedBars({
  rows,
  series,
  empty = 'Nothing to show yet.',
}: {
  rows: { id: string; label: string; sublabel?: string; values: Record<string, number> }[];
  series: Series[];
  empty?: string;
}) {
  if (rows.length === 0) return <p className="text-ink-muted">{empty}</p>;
  const totals = rows.map((r) => series.reduce((n, s) => n + (r.values[s.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <ul className="space-y-4">
      {rows.map((r, i) => (
        <li key={r.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="min-w-0 break-words font-semibold text-heading">{r.label}{r.sublabel && <span className="ml-2 text-caption font-medium text-ink-muted">{r.sublabel}</span>}</p>
            <p className="shrink-0 text-lg font-extrabold text-heading">{totals[i]}</p>
          </div>
          <div className="flex h-3.5 overflow-hidden rounded-full bg-navy-50" role="img" aria-label={`${r.label}: ${series.map((s) => `${r.values[s.key] ?? 0} ${s.label.toLowerCase()}`).join(', ')}`}>
            <div className="flex h-full" style={{ width: `${(totals[i]! / max) * 100}%` }}>
              {series.map((s) => {
                const v = r.values[s.key] ?? 0;
                return v > 0 ? <span key={s.key} className="h-full" style={{ width: `${(v / totals[i]!) * 100}%`, background: s.color }} title={`${v} ${s.label.toLowerCase()}`} /> : null;
              })}
            </div>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 text-caption text-ink-muted">
            {series.filter((s) => (r.values[s.key] ?? 0) > 0).map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />{r.values[s.key]} {s.label.toLowerCase()}</span>
            ))}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A ring with its legend beside it; the numbers and percentages are always written out. */
export function Donut({ slices, centre, label }: { slices: { label: string; value: number; color: string }[]; centre?: ReactNode; label: string }) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={label}>
          <circle cx="70" cy="70" r={R} fill="none" strokeWidth="18" className="stroke-navy-50" />
          {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * C;
            const el = <circle key={s.label} cx="70" cy="70" r={R} fill="none" strokeWidth="18" stroke={s.color} strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold leading-none text-heading">{total}</span>
          {centre && <span className="mt-1 text-caption text-ink-muted">{centre}</span>}
        </div>
      </div>
      <ul className="min-w-[10rem] flex-1 space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden />{s.label}</span>
            <span className="whitespace-nowrap"><span className="font-bold text-heading">{s.value}</span><span className="ml-1.5 text-ink-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
