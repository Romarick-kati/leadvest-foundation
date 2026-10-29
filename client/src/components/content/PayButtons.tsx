import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useSite } from '../../lib/site';
import { useT } from '../../i18n';
import { Button, FormError } from '../ui';

/** Lets the payer choose how to pay (mobile money or card) and opens the secure payment page. */
export function PayButtons({ registrationId, priceLabel }: { registrationId: string; priceLabel?: string | null }) {
  const { site } = useSite();
  const t = useT();
  const providers = site.integrations?.paymentProviders ?? [];
  const checkout = useMutation({
    mutationFn: (provider?: string) => api.post<{ redirectUrl: string }>('/payments/checkout', { registrationId, idempotencyKey: `reg-${registrationId}${provider ? `-${provider}` : ''}`, provider }),
    onSuccess: (r) => {
      const url = new URL(r.redirectUrl, window.location.origin);
      window.location.assign(url.origin === window.location.origin ? url.pathname : r.redirectUrl);
    },
  });
  if (site.integrations?.payments === 'disabled') return <p className="text-sm text-ink-muted">Online payment is not available yet. The foundation will contact you with payment instructions.</p>;
  const err = checkout.error instanceof ApiError ? checkout.error.message : checkout.error ? 'Payment could not start.' : null;
  return (
    <div className="space-y-3">
      <FormError message={err} />
      {providers.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => (
            <button key={p} type="button" disabled={checkout.isPending} onClick={() => checkout.mutate(p)} className="rounded-xl border-2 border-line-strong bg-surface p-4 text-left transition hover:border-teal hover:shadow-soft disabled:opacity-60">
              <span className="block text-base font-bold text-heading">{p === 'flutterwave' ? t('pay.card') : t('pay.momo')}{priceLabel ? ` · ${priceLabel}` : ''}</span>
              <span className="block text-sm text-ink-muted">{p === 'flutterwave' ? t('pay.cardHint') : t('pay.momoHint')}</span>
            </button>
          ))}
        </div>
      ) : (
        <Button loading={checkout.isPending} onClick={() => checkout.mutate(undefined)}>Pay now{priceLabel ? ` (${priceLabel})` : ''}</Button>
      )}
    </div>
  );
}
