import { env } from '../../config/env.js';
import { safeEqual } from '../../lib/crypto.js';
import { ApiError, badRequest } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import type { CheckoutRequest, PaymentProvider, ProviderPaymentStatus, StatusHint, VerifiedWebhookEvent } from './types.js';

/**
 * Flutterwave Standard checkout: cards from anywhere in the world, plus mobile money and bank
 * transfer where the payer's country supports them. The payer is sent to Flutterwave's hosted
 * page, pays there and comes back. As with Fapshi, nothing is trusted because the browser came
 * back: the status, the amount and the currency are always read from Flutterwave's server with
 * our secret key before access is given.
 *
 * API: https://developer.flutterwave.com  (Bearer secret key; verify by tx_ref; verif-hash on webhooks)
 */
const BASE = 'https://api.flutterwave.com/v3';

const MAP: Record<string, ProviderPaymentStatus> = {
  successful: 'PAID',
  completed: 'PAID',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
  pending: 'PENDING',
  new: 'PENDING',
};

export class FlutterwavePaymentProvider implements PaymentProvider {
  readonly name = 'flutterwave';

  private get key() { return env.FLUTTERWAVE_SECRET_KEY ?? ''; }
  /** Test keys contain FLWSECK_TEST: no real money moves. */
  get isSimulation() { return /TEST/i.test(this.key); }
  private get headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` }; }

  async createCheckout(req: CheckoutRequest) {
    if (!req.payerEmail) throw badRequest('An email address is needed to pay by card.');
    // Our own unique reference. Flutterwave rejects a reused one, so each attempt has its own payment id.
    const txRef = `lvf-${req.paymentId}`;
    const major = req.amountCents / 100;
    let res: Response;
    try {
      res = await fetch(`${BASE}/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          tx_ref: txRef,
          amount: Number.isInteger(major) ? major : Number(major.toFixed(2)),
          currency: req.currency,
          redirect_url: `${req.returnBaseUrl}/payment/return?payment=${encodeURIComponent(req.paymentId)}`,
          customer: { email: req.payerEmail, name: (req.payerName || req.payerEmail.split('@')[0]).slice(0, 80) },
          customizations: { title: 'Lead Vest Foundation', description: req.description.slice(0, 100) },
          meta: { paymentId: req.paymentId },
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      logger.error({ err: (e as Error).message }, 'flutterwave request failed');
      throw new ApiError(502, 'payment_provider_unreachable', 'The payment service could not be reached. Please try again in a moment.');
    }
    const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { link?: string } };
    if (!res.ok || json.status !== 'success' || !json.data?.link) {
      logger.error({ status: res.status, message: json.message }, 'flutterwave returned an error');
      throw new ApiError(502, 'payment_provider_error', 'The payment service could not start this payment. Please try again, or contact us.');
    }
    return { providerRef: txRef, redirectUrl: json.data.link };
  }

  async fetchStatus(providerRef: string, hint?: StatusHint): Promise<VerifiedWebhookEvent> {
    // When Flutterwave sends the payer back it adds the transaction id. Looking it up by id is
    // faster and more reliable than by reference; the reference is still checked below.
    const byId = hint?.transactionId && /^\d{1,20}$/.test(hint.transactionId);
    const url = byId ? `${BASE}/transactions/${hint!.transactionId}/verify` : `${BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: this.headers, signal: AbortSignal.timeout(8_000) });
    } catch (e) {
      logger.error({ err: (e as Error).message }, 'flutterwave status check failed');
      throw new ApiError(502, 'payment_provider_unreachable', 'The payment service could not be reached.');
    }
    const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: { status?: string; tx_ref?: string; amount?: number | string; currency?: string } };
    const found = res.ok && json.status === 'success' && json.data && (!byId || json.data.tx_ref === providerRef);
    if (!found) {
      if (!res.ok) logger.warn({ status: res.status, message: json.message }, 'flutterwave verify returned no transaction');
      // The payer pressed cancel (or closed the page and came back): there is no transaction, so this
      // would otherwise stay "pending" for ever and the return page would spin without end.
      if (/^(cancelled|canceled|failed)$/i.test(hint?.returnStatus ?? '')) {
        return { eventId: `${providerRef}:cancelled`, type: 'payment.cancelled', providerRef, status: 'CANCELLED' };
      }
      // Before the payer has tried to pay there is no transaction yet: that is simply "still waiting".
      return { eventId: `${providerRef}:PENDING`, type: 'payment.pending', providerRef, status: 'PENDING' };
    }
    const data = json.data!;
    const raw = String(data.status ?? '').toLowerCase();
    const status = MAP[raw] ?? 'PENDING';
    const amount = Number(data.amount);
    const paid = Number.isFinite(amount) ? { amountMinor: Math.round(amount * 100), currency: String(data.currency ?? '') } : {};
    return { eventId: `${providerRef}:${raw || 'unknown'}`, type: `payment.${raw || 'unknown'}`, providerRef, status, ...paid };
  }

  /**
   * Flutterwave sends the secret hash you typed into its dashboard in the verif-hash header. When we
   * have one it must match. The payload only tells us which payment to look up: the real status,
   * amount and currency are asked from Flutterwave, so a forged webhook cannot mark anything paid.
   */
  async verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<VerifiedWebhookEvent> {
    const secret = env.FLUTTERWAVE_SECRET_HASH;
    if (secret) {
      const sent = headers['verif-hash'];
      if (typeof sent !== 'string' || !safeEqual(sent, secret)) throw badRequest('Invalid webhook secret.');
    }
    let ref = '';
    try {
      const body = JSON.parse(rawBody.toString('utf8')) as { data?: { tx_ref?: unknown }; txRef?: unknown; tx_ref?: unknown };
      const candidate = body.data?.tx_ref ?? body.txRef ?? body.tx_ref;
      if (typeof candidate === 'string') ref = candidate;
    } catch {
      /* handled below */
    }
    if (!ref || ref.length > 120 || !ref.startsWith('lvf-')) throw badRequest('Unrecognised webhook.');
    return this.fetchStatus(ref);
  }
}
