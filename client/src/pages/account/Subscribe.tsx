import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check, Lock } from '../../components/ui/icons';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Button, FormError } from '../../components/ui';
import { AuthShell } from '../auth/AuthShell';
import { useT } from '../../i18n';

const money = (n: number) => `${n.toLocaleString('en')} FCFA`;

/** Shown to anyone who has to pay before continuing. One price, one button. */
export default function Subscribe() {
  const t = useT();
  useDocumentTitle(t('pay.title'));
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  // One key per visit, so pressing the button twice never creates two payments.
  const key = useRef(`a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: (provider: string) => api.post<{ redirectUrl: string }>('/payments/access/checkout', { idempotencyKey: key.current, provider }),
    onSuccess: (r) => window.location.assign(r.redirectUrl),
    onError: (e: Error) => { setError(e.message); setChosen(null); },
  });
  if (!user) return null;
  const access = user.access;

  // A child cannot pay. The grown up who set up the account does.
  if (user.role === 'LEARNER') {
    return (
      <AuthShell title={t('pay.childTitle')}>
        <p className="text-ink-muted">{t('pay.childText')}</p>
        <Button className="mt-6 w-full" size="lg" variant="secondary" onClick={() => signOut().then(() => navigate('/sign-in'))}>{t('common.signOut')}</Button>
      </AuthShell>
    );
  }

  const active = !access?.required || access.active;
  const soon = active && access?.until && !access.lifetime && new Date(access.until).getTime() - Date.now() < 7 * 86_400_000;
  if (active && !soon) {
    return (
      <AuthShell title={t('pay.activeTitle')}>
        {access?.until && !access.lifetime && <p className="text-ink-muted">{t('pay.until')} {new Date(access.until).toLocaleDateString()}</p>}
        <Button className="mt-6 w-full" size="lg" onClick={() => navigate(homeFor(user), { replace: true })}>{t('pay.continue')}</Button>
      </AuthShell>
    );
  }

  const fee = access?.feeXaf ?? 0;
  const days = access?.periodDays ?? 0;
  const per = days === 0 ? t('pay.once') : days === 30 ? t('pay.perMonth') : days === 365 ? t('pay.perYear') : `${t('pay.for_')} ${days} ${t('pay.days')}`;
  const perks = user.role === 'PARENT' ? [t('pay.perkParent1'), t('pay.perkParent2'), t('pay.perkParent3')] : [t('pay.perkYouth1'), t('pay.perkYouth2'), t('pay.perkYouth3')];

  return (
    <AuthShell title={soon ? t('pay.renewTitle') : t('pay.title')}>
      <p className="text-center text-sm font-semibold text-ink-muted">{per}</p>
      <ul className="mt-5 space-y-2.5">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-3 text-ink">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-white"><Check size={12} aria-hidden /></span>
            {p}
          </li>
        ))}
      </ul>
      <FormError message={error} />
      <div className="mt-6 space-y-3">
        {(access?.providers ?? []).map((p) => {
          const card = p === 'flutterwave';
          const price = card && access?.feeUsd ? `$${access.feeUsd}` : money(fee);
          const busy = start.isPending && chosen === p;
          return (
            <button
              key={p}
              type="button"
              disabled={start.isPending}
              onClick={() => { setError(null); setChosen(p); start.mutate(p); }}
              className={cn('pay-option flex w-full items-center justify-between gap-4 rounded-xl border-2 border-line-strong bg-surface p-4 text-left transition hover:border-teal hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60')}
            >
              <span>
                <span className="block text-base font-bold text-heading">{card ? t('pay.card') : p === 'mock' ? t('pay.test') : t('pay.momo')}</span>
                <span className="block text-sm text-ink-muted">{card ? t('pay.cardHint') : p === 'mock' ? t('pay.testHint') : t('pay.momoHint')}</span>
              </span>
              <span className="shrink-0 text-lg font-extrabold text-heading">{busy ? '…' : price}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center justify-center gap-2 text-center text-caption text-ink-muted"><Lock size={13} aria-hidden /> {t('pay.secure')}</p>
      <p className="mt-4 text-center text-sm">
        {soon ? <Link to={homeFor(user)}>{t('pay.later')}</Link> : <button type="button" className="font-semibold" onClick={() => signOut().then(() => navigate('/sign-in'))}>{t('common.signOut')}</button>}
      </p>
      {user.access?.required && !user.access.active && <Alert tone="info" className="mt-4">{t('pay.note')}</Alert>}
    </AuthShell>
  );
}
