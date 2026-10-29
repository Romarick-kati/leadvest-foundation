import { useT } from '../../i18n';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'blue' | 'mint' | 'sun' | 'danger' | 'navy';

const tones: Record<Tone, string> = {
  neutral: 'bg-navy-50 text-ink border-line',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  mint: 'bg-mint-50 text-mint-700 border-mint',
  sun: 'bg-sun-100 text-heading border-sun',
  danger: 'bg-danger-50 text-danger border-[#FECDCA]',
  navy: 'bg-navy text-white border-navy',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-caption font-semibold', tones[tone], className)}>{children}</span>;
}

const statusTones: Record<string, Tone> = {
  PUBLISHED: 'mint', DRAFT: 'sun', ARCHIVED: 'neutral',
  ACTIVE: 'mint', SUSPENDED: 'danger', DEACTIVATED: 'neutral',
  CONFIRMED: 'mint', PENDING: 'sun', WAITLISTED: 'blue', CANCELLED: 'neutral',
  NEW: 'blue', IN_PROGRESS: 'sun', RESOLVED: 'mint',
  PAID: 'mint', FAILED: 'danger', REFUNDED: 'neutral', NOT_REQUIRED: 'neutral',
  SCHEDULED: 'blue', POSTPONED: 'sun', COMPLETED: 'neutral',
  VERIFIED: 'mint', REVOKED: 'neutral', OPEN: 'blue', DECLINED: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return <Badge tone={statusTones[status] ?? 'neutral'}>{label}</Badge>;
}

/** Marks development sample content so it is never mistaken for real foundation information. */
export function SampleBadge() {
  const t = useT();
  return (
    <Badge tone="sun" className="uppercase tracking-wide">
      {t('common.sample')}
    </Badge>
  );
}
