import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from '../ui/icons';
import { m } from 'framer-motion';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useSite } from '../../lib/site';
import { useT } from '../../i18n';
import { formatMoney } from '../../lib/format';
import { Alert, Button, ButtonLink, Checkbox, FormError, Select, TextArea } from '../ui';

interface LearnerLink {
  linkStatus: 'VERIFIED' | 'PENDING';
  learner: { id: string; displayName?: string; username: string | null };
}

interface RegistrationResult {
  id: string;
  status: string;
  paymentStatus: string;
  paymentRequired: boolean;
}

/**
 * Registration for an event or program. Anyone with their own account (parent, young person or
 * member) registers and pays for themselves; children's learning accounts are registered by a
 * verified guardian. Paid items need payment confirmed by the provider before confirmation.
 */
export function RegistrationPanel({ kind, id, title, open, priceCents, currency, closedMessage }: {
  kind: 'event' | 'program';
  id: string;
  title: string;
  open: boolean;
  priceCents: number | null;
  currency: string | null;
  closedMessage?: string;
}) {
  const { user } = useAuth();
  const { site } = useSite();
  const location = useLocation();
  const t = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [learnerId, setLearnerId] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const isParent = user?.role === 'PARENT';
  const canRegister = isParent || user?.role === 'YOUTH' || user?.role === 'MEMBER';
  const learners = useQuery({ queryKey: ['guardian', 'learners'], queryFn: () => api.get<LearnerLink[]>('/guardian/learners'), enabled: isParent && Boolean(user?.emailVerified) });

  const register = useMutation({
    mutationFn: () => api.post<RegistrationResult>('/registrations', { [`${kind}Id`]: id, learnerId: learnerId || undefined, notes: notes || undefined, consent }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ['registrations'] });
      qc.invalidateQueries({ queryKey: [kind === 'event' ? 'event' : 'program'] });
    },
  });

  const checkout = useMutation({
    mutationFn: (provider?: string) => api.post<{ redirectUrl: string; paymentId: string }>('/payments/checkout', { registrationId: result!.id, idempotencyKey: `reg-${result!.id}${provider ? `-${provider}` : ''}`, provider }),
    onSuccess: (r) => {
      const url = new URL(r.redirectUrl, window.location.origin);
      if (url.origin === window.location.origin) navigate(url.pathname);
      else window.location.assign(r.redirectUrl);
    },
  });

  const price = formatMoney(priceCents, currency);
  const featureOn = kind === 'event' ? site.features.eventRegistration : site.features.programRegistration;

  if (!open || !featureOn) {
    return <Alert tone="info" title="Registration is not open">{closedMessage ?? 'Please contact us if you would like to know when registration opens.'}</Alert>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <p className="text-ink">You need an account to register. It only takes a minute and lets you manage your registrations and payments in one place.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}>Sign in to register</ButtonLink>
          <ButtonLink to="/register" variant="secondary">Create an account</ButtonLink>
        </div>
      </div>
    );
  }

  if (!canRegister) {
    return <Alert tone="info">{user.role === 'LEARNER' ? 'Ask your parent or guardian to register for you.' : 'Please sign in with a personal account to register.'}</Alert>;
  }

  if (!user.emailVerified) {
    return <Alert tone="warning" title="Please confirm your email first">We sent a link when you created your account. You can send a new one from <Link to="/settings/account">Account settings</Link>.</Alert>;
  }

  if (result) {
    const statusText: Record<string, string> = {
      CONFIRMED: 'Your place is confirmed.',
      WAITLISTED: 'This is full at the moment, so you have been added to the waiting list. We will be in touch if a place becomes available.',
      PENDING: result.paymentRequired ? 'Your place is reserved until payment is confirmed.' : 'Thank you. The foundation will review your registration and confirm by email.',
    };
    return (
      <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4" role="status">
        <div className="flex items-start gap-3 rounded-lg border border-mint bg-mint-50 p-4">
          <CheckCircle2 className="mt-0.5 shrink-0 text-mint-700" aria-hidden />
          <div>
            <p className="font-semibold text-heading">Registration received for {title}</p>
            <p className="mt-1 text-sm text-ink">{statusText[result.status]}</p>
          </div>
        </div>
        {result.paymentRequired && result.status === 'PENDING' && (
          site.integrations?.payments === 'disabled' ? (
            <Alert tone="info">Online payment is not available yet. The foundation will contact you with payment instructions.</Alert>
          ) : (
            <>
              <FormError message={checkout.error instanceof ApiError ? checkout.error.message : checkout.error ? 'Payment could not start.' : null} />
              {(site.integrations?.paymentProviders?.length ?? 0) > 1 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-heading">Choose how to pay{price && ` (${price})`}</p>
                  {site.integrations!.paymentProviders!.map((p) => (
                    <button key={p} type="button" disabled={checkout.isPending} onClick={() => checkout.mutate(p)} className="flex w-full items-center justify-between gap-4 rounded-xl border-2 border-line-strong bg-surface p-4 text-left transition hover:border-teal hover:shadow-soft disabled:opacity-60">
                      <span>
                        <span className="block text-base font-bold text-heading">{p === 'flutterwave' ? t('pay.card') : t('pay.momo')}</span>
                        <span className="block text-sm text-ink-muted">{p === 'flutterwave' ? t('pay.cardHint') : t('pay.momoHint')}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-blue-700">{checkout.isPending ? '…' : 'Pay'}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <Button onClick={() => checkout.mutate(undefined)} loading={checkout.isPending}>Continue to payment {price && `(${price})`}</Button>
              )}
            </>
          )
        )}
        <Link to="/account" className="inline-block text-sm font-semibold">View my registrations</Link>
      </m.div>
    );
  }

  const verified = (learners.data ?? []).filter((l) => l.linkStatus === 'VERIFIED');
  const error = register.error instanceof ApiError ? register.error : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        register.mutate();
      }}
    >
      <FormError message={error?.message} />
      {price && <p className="text-sm text-ink">Fee: <strong className="text-heading">{price}</strong></p>}
      {isParent && <Select
        label="Who is taking part?"
        value={learnerId}
        onChange={(e) => setLearnerId(e.target.value)}
        options={[{ value: '', label: 'Me, or my family (no learner account)' }, ...verified.map((l) => ({ value: l.learner.id, label: l.learner.displayName ?? l.learner.username ?? 'Learner' }))]}
        hint={verified.length === 0 ? <>You can add a child’s learning account in <Link to="/settings/family">Family settings</Link>.</> : undefined}
      />}
      <TextArea label="Anything we should know?" optional rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} hint="For example access needs. Please do not include medical details here." />
      <Checkbox
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        error={error?.fields.consent}
        label={isParent ? <>I am the parent or guardian of any child I am registering, and I consent to their participation as described in the <Link to="/consent">consent information</Link>.</> : <>I agree to take part as described in the <Link to="/consent">consent information</Link>.</>}
      />
      <Button type="submit" loading={register.isPending} disabled={!consent}>Register</Button>
    </form>
  );
}
