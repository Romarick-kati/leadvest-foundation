import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useT } from '../../i18n';
import { asCurrency } from '../../lib/format';
import { FormError, Spinner } from '../ui';
import { CardIcon, MastercardMark, MomoIcon, VisaMark } from './PayIcons';

/**
 * Lets the payer choose how to pay and opens the secure payment page. The price is not repeated on
 * the buttons: it is shown on the page itself, so a forgotten or changed price can never disagree
 * with a button. MTN MoMo (Fapshi) handles FCFA only; card payment (Flutterwave) works from any
 * country, so a price in dollars or euros is offered by card only.
 */
export function PayButtons({ registrationId, currency }: { registrationId: string; currency?: string | null }) {
  const { site } = useSite();
  const t = useT();
  const all = site.integrations?.paymentProviders ?? [];
  // MTN MoMo and Notch Pay are for prices in FCFA; Flutterwave also takes dollars and euros.
  const providers = all.filter((p) => !((p === 'fapshi' || p === 'notchpay') && currency && asCurrency(currency) !== 'XAF'));
  const isCard = (p: string) => p === 'flutterwave' || p === 'notchpay';
  const cardRows = providers.filter(isCard).length;
  const checkout = useMutation({
    mutationFn: (provider?: string) => api.post<{ redirectUrl: string }>('/payments/checkout', { registrationId, idempotencyKey: `reg-${registrationId}${provider ? `-${provider}` : ''}`, provider }),
    onSuccess: (r) => {
      const url = new URL(r.redirectUrl, window.location.origin);
      window.location.assign(url.origin === window.location.origin ? url.pathname : r.redirectUrl);
    },
  });
  if (site.integrations?.payments === 'disabled') return <p className="text-sm text-ink-muted">Online payment is not available yet. The foundation will contact you with payment instructions.</p>;
  if (providers.length === 0) return <p className="text-sm text-ink-muted">Online payment is not available for this price yet. The foundation will contact you with payment instructions.</p>;
  const err = checkout.error instanceof ApiError ? checkout.error.message : checkout.error ? 'Payment could not start. Please try again.' : null;
  // If two card services are on at once, say which is which. With one, plain "Pay with a card".
  const label = (p: string) => (isCard(p) ? `${t('pay.card')}${cardRows > 1 ? ` (${p === 'notchpay' ? 'Notch Pay' : 'Flutterwave'})` : ''}` : p === 'mock' ? t('pay.test') : t('pay.momo'));
  const hint = (p: string) => (isCard(p) ? t('pay.cardHint') : p === 'mock' ? t('pay.testHint') : t('pay.momoHint'));
  return (
    <div className="space-y-3">
      <FormError message={err} />
      <ul className="space-y-3">
        {providers.map((p) => {
          const busy = checkout.isPending && checkout.variables === p;
          return (
            <li key={p}>
              <button type="button" disabled={checkout.isPending} onClick={() => checkout.mutate(p)} className="flex w-full items-center gap-4 rounded-2xl border-2 border-line-strong bg-surface p-4 text-left transition hover:border-blue-600 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60">
                {isCard(p) ? <CardIcon className="h-12 w-12 shrink-0" /> : <MomoIcon className="h-12 w-12 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-heading">{label(p)}</span>
                  <span className="block text-sm text-ink-muted">{busy ? 'Opening the secure payment page…' : hint(p)}</span>
                  {isCard(p) && !busy && <span className="mt-1.5 flex items-center gap-2" aria-hidden><VisaMark /><MastercardMark /></span>}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-blue-700">{busy ? <Spinner size={16} /> : 'Pay'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
