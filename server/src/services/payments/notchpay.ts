import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';
import { safeEqual } from '../../lib/crypto.js';
import { ApiError, badRequest } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import type { CheckoutRequest, PaymentProvider, ProviderPaymentStatus, StatusHint, VerifiedWebhookEvent } from './types.js';

/**
 * Notch Pay "Collect": the payer is sent to Notch Pay's own secure page and pays there with a card
 * (Visa or Mastercard, including cards from abroad) or Mobile Money. Nothing is trusted because the
 * browser came back or because a webhook arrived: the real status, amount and currency are always
 * read from Notch Pay's server with our key before anything is marked paid.
 *
 * API: https://developer.notchpay.co
 *   start:   POST /payments            (Authorization: public key)  -> authorization_url, transaction.reference
 *   check:   GET  /payments/{reference} (Authorization: public key)  -> transaction.status
 *   webhook: header x-notch-signature = HMAC SHA-256 of the raw body with the hash key (hsk_...)
 *
 * We keep both references in providerRef as "<our reference>|<Notch reference>". Ours (lvf-...) is
 * unique to the payment; Notch's (trx....) is what its API looks payments up by.
 */
const BASE = 'https://api.notchpay.co';

/** Currencies we offer through Notch Pay. Only FCFA is confirmed for this account; add others here once tested. */
export const NOTCHPAY_CURRENCIES = ['XAF'];

const MAP: Record<string, ProviderPaymentStatus> = {
  complete: 'PAID',
  completed: 'PAID',
  successful: 'PAID',
  success: 'PAID',
  failed: 'FAILED',
  canceled: 'CANCELLED',
  cancelled: 'CANCELLED',
  abandoned: 'CANCELLED',
  expired: 'CANCELLED',
  pending: 'PENDING',
  processing: 'PENDING',
  initialized: 'PENDING',
};

const split = (providerRef: string) => {
  const [ours = '', notch = ''] = providerRef.split('|');
  return { ours, notch };
};

export class NotchPayPaymentProvider implements PaymentProvider {
  readonly name = 'notchpay';

  private get key() { return env.NOTCHPAY_PUBLIC_KEY ?? ''; }
  /** Sandbox keys start with pk_test: no real money moves. */
  get isSimulation() { return /^pk[._-]?test/i.test(this.key); }
  private get headers() { return { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: this.key }; }

  async createCheckout(req: CheckoutRequest) {
    if (!req.payerEmail) throw badRequest('An email address is needed to pay by card.');
    const reference = `lvf-${req.paymentId}`;
    const major = req.amountCents / 100;
    let res: Response;
    try {
      res = await fetch(`${BASE}/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          amount: Number.isInteger(major) ? major : Number(major.toFixed(2)),
          currency: req.currency,
          reference,
          description: req.description.slice(0, 120),
          callback: `${req.returnBaseUrl}/payment/return?payment=${encodeURIComponent(req.paymentId)}`,
          customer: { name: (req.payerName || req.payerEmail.split('@')[0]).slice(0, 80), email: req.payerEmail },
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      logger.error({ err: (e as Error).message }, 'notchpay request failed');
      throw new ApiError(502, 'payment_provider_unreachable', 'The payment service could not be reached. Please try again in a moment.');
    }
    const json = (await res.json().catch(() => ({}))) as { message?: string; errors?: unknown; authorization_url?: string; transaction?: { reference?: string } };
    if (!res.ok || !json.authorization_url || !json.transaction?.reference) {
      logger.error({ status: res.status, message: json.message, errors: json.errors }, 'notchpay returned an error');
      throw new ApiError(502, 'payment_provider_error', 'The payment service could not start this payment. Please try again, or contact us.');
    }
    return { providerRef: `${reference}|${json.transaction.reference}`, redirectUrl: json.authorization_url };
  }

  async fetchStatus(providerRef: string, hint?: StatusHint): Promise<VerifiedWebhookEvent> {
    const { notch } = split(providerRef);
    const cancelled = /^(cancelled|canceled|failed)$/i.test(hint?.returnStatus ?? '');
    if (!notch) return { eventId: `${providerRef}:PENDING`, type: 'payment.pending', providerRef, status: 'PENDING' };
    let res: Response;
    try {
      res = await fetch(`${BASE}/payments/${encodeURIComponent(notch)}`, { headers: this.headers, signal: AbortSignal.timeout(8_000) });
    } catch (e) {
      logger.error({ err: (e as Error).message }, 'notchpay status check failed');
      throw new ApiError(502, 'payment_provider_unreachable', 'The payment service could not be reached.');
    }
    const json = (await res.json().catch(() => ({}))) as { message?: string; transaction?: { status?: string; reference?: string; amount?: number | string; currency?: string } };
    const tx = res.ok ? json.transaction : undefined;
    if (!tx) {
      if (!res.ok) logger.warn({ status: res.status, message: json.message }, 'notchpay verify returned no transaction');
      // The payer pressed cancel: say so, instead of leaving the return page waiting for ever.
      if (cancelled) return { eventId: `${providerRef}:cancelled`, type: 'payment.cancelled', providerRef, status: 'CANCELLED' };
      return { eventId: `${providerRef}:PENDING`, type: 'payment.pending', providerRef, status: 'PENDING' };
    }
    const raw = String(tx.status ?? '').toLowerCase();
    const status = MAP[raw] ?? 'PENDING';
    const amount = Number(tx.amount);
    const paid = status === 'PAID' && Number.isFinite(amount) && tx.currency ? { amountMinor: Math.round(amount * 100), currency: String(tx.currency).toUpperCase() } : {};
    return { eventId: `${providerRef}:${raw || 'unknown'}`, type: `payment.${raw || 'unknown'}`, providerRef, status, ...paid };
  }

  /**
   * Notch Pay signs the exact body it sends: x-notch-signature is the HMAC SHA-256 (hex) of that body
   * with our hash key. Without the hash key every webhook is refused (the return page still confirms
   * payments directly with Notch Pay). The body only tells us which payment to look up: the status,
   * amount and currency are asked from Notch Pay, so a forged webhook cannot mark anything paid.
   */
  async verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<VerifiedWebhookEvent> {
    const secret = env.NOTCHPAY_HASH_KEY;
    const sent = headers['x-notch-signature'];
    if (!secret || typeof sent !== 'string') throw badRequest('Invalid webhook signature.');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(sent.trim().toLowerCase(), expected)) throw badRequest('Invalid webhook signature.');

    const candidates: string[] = [];
    try {
      const body = JSON.parse(rawBody.toString('utf8')) as { data?: Record<string, unknown> & { transaction?: Record<string, unknown> } };
      const d = body.data ?? {};
      for (const v of [d.reference, d.trxref, d.merchant_reference, d.transaction?.reference, d.transaction?.trxref]) if (typeof v === 'string' && v.length <= 120) candidates.push(v);
    } catch {
      /* handled below */
    }
    if (candidates.length === 0) throw badRequest('Unrecognised webhook.');
    // Match either of the two references to the payment we stored.
    for (const ref of candidates) {
      const payment = await prisma.payment.findFirst({ where: { provider: 'notchpay', providerRef: { contains: ref } }, select: { providerRef: true } });
      if (payment?.providerRef) return this.fetchStatus(payment.providerRef);
    }
    throw badRequest('Unrecognised webhook.');
  }
}
