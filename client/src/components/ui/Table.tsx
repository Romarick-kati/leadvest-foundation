import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hidden in the stacked mobile layout when false. */
  mobile?: boolean;
}

/**
 * Responsive table: a real table from the md breakpoint, stacked cards on phones,
 * so nothing scrolls horizontally on small screens.
 */
export function DataTable<T>({ columns, rows, rowKey, caption, onRowClick }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; caption?: string; onRowClick?: (row: T) => void }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-navy-50/60">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3 text-caption font-semibold uppercase tracking-wide text-ink-muted', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-blue-50/50')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className={cn('space-y-1.5 p-4', onRowClick && 'cursor-pointer active:bg-blue-50')} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns
              .filter((c) => c.mobile !== false)
              .map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                  <span className="shrink-0 text-caption font-semibold uppercase tracking-wide text-ink-muted">{c.header}</span>
                  <span className="min-w-0 break-words text-right">{c.cell(row)}</span>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </>
  );
}
