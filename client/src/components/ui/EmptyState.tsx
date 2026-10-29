import type { ReactNode } from 'react';
import { Sprout } from './icons';
import { useTx, useTxNode } from '../../i18n/phrases';

export function EmptyState({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const tx = useTx();
  const n = useTxNode();
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint-50 text-mint-700">{icon ?? <Sprout size={28} aria-hidden />}</div>
      <h3 className="text-h4">{tx(title)}</h3>
      {children && <div className="mt-2 max-w-md text-ink-muted">{n(children)}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
