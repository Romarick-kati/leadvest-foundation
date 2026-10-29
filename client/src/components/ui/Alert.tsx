import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from './icons';
import { cn } from '../../lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'error';

const styles: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-blue-100 bg-blue-50 text-heading', icon: <Info className="text-blue-600" size={20} aria-hidden /> },
  success: { box: 'border-mint bg-mint-50 text-heading', icon: <CheckCircle2 className="text-mint-700" size={20} aria-hidden /> },
  warning: { box: 'border-sun bg-warn-50 text-heading', icon: <AlertTriangle className="text-warn" size={20} aria-hidden /> },
  error: { box: 'border-[#FECDCA] bg-danger-50 text-heading', icon: <XCircle className="text-danger" size={20} aria-hidden /> },
};

export function Alert({ tone = 'info', title, children, className, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const s = styles[tone];
  return (
    <m.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded border p-4 text-sm', s.box, className)}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title ? 'mt-1' : '', 'text-ink')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </m.div>
  );
}

/** A visible marker for content the foundation still needs to supply or approve. */
export function Placeholder({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-block rounded border border-dashed border-sun-600/40 bg-sun-100 px-2 py-0.5 text-sm font-medium text-heading', className)}>
      {children}
    </span>
  );
}
