import { env } from '../../config/env.js';
import { safeEqual } from '../../lib/crypto.js';
import { ApiError, badRequest } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import type { CheckoutRequest, PaymentProvider, ProviderPaymentStatus, VerifiedWebhookEvent } from './types.js';

/**
 * Fapshi mobile money (MTN MoMo and Orange Money, Cameroon). Uses "initiate-pay": the person is
 * sent to Fapshi's own checkout page, pays there, and comes back to our return page. Nothing is
 * marked paid because of the browser coming back: the status is always read from Fapshi's server
 * with our secret keys (see fetchStatus), both on return and when a webhook arrives.
 *
 * API: https://docs.fapshi.com  (headers apiuser and apikey; amounts are whole XAF, minimum 100)
 */
const SANDBOX = 'https://sandbox.fapshi.com';
const LIVE = 'https://live.fapshi.com';

const MAP: Record<string, ProviderPaymentStatus> = {
  SUCCESSFUL: 'PAID',
  FAILED: 'FAILED',
  EXPIRED: 'CANCELLED',
  CREATED: 'PENDING',
  PENDING: 'PENDING',
};

export class FapshiPaymentProvider implements PaymentProvider {
  readonly name = 'fapshi';

  private get key() { return env.FAPSHI_API_KEY ?? ''; }
  /** Sandbox keys start with FAK_TEST_: they use the test server and no real money moves. */
  get isSimulation() { return this.key.startsWith('FAK_TEST_'); }
  private get base() { return this.isSimulation ? SANDBOX : LIVE; }
  private get headers() { return { 'Content-Type': 'application/json', apiuser: env.FAPSHI_API_USER ?? '', apikey: this.key }; }

  private async call(path: string, init: { method: 'GET' | 'POST'; body?: unknown }) {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method: init.method,
        headers: this.headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      logger.error({ err: (e as Error).message, path }, 'fapshi request failed');
      throw new ApiError(502, 'payment_provider_unreachable', 'The payment service could not be reached. Please try again in a moment.');
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      // Never log the keys. The message from Fapshi is safe to log and tells us what is wrong.
      logger.error({ status: res.status, message: data.message, path }, 'fapshi returned an error');
      if (res.status === 429) throw new ApiError(429, 'rate_limited', 'Please wait a few seconds and try again.');
      throw new ApiError(502, 'payment_provider_error', 'The payment service could not start this payment. Please try again, or contact us.');
    }
    return data;
  }

  async createCheckout(req: CheckoutRequest) {
    if (req.currency !== 'XAF') throw badRequest('Online payment is only available in XAF (FCFA).');
    // The site stores amounts in hundredths of the currency; Fapshi wants whole francs.
    const amount = Math.round(req.amountCents / 100);
    if (amount < 100) throw badRequest('The amount is below the minimum of 100 FCFA.');
    const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const body: Record<string, unknown> = {
      amount,
      redirectUrl: `${req.returnBaseUrl}/payment/return?payment=${encodeURIComponent(req.paymentId)}`,
      externalId: safeId(req.paymentId),
      message: req.description.slice(0, 100),
    };
    if (req.payerEmail) body.email = req.payerEmail;
    if (req.payerId) body.userId = safeId(req.payerId);
    const data = await this.call('/initiate-pay', { method: 'POST', body });
    const link = typeof data.link === 'string' ? data.link : '';
    const transId = typeof data.transId === 'string' ? data.transId : '';
    if (!link || !transId) throw new ApiError(502, 'payment_provider_error', 'The payment service gave an unexpected answer. Please try again.');
    return { providerRef: transId, redirectUrl: link };
  }

  async fetchStatus(providerRef: string): Promise<VerifiedWebhookEvent> {
    const data = await this.call(`/payment-status/${encodeURIComponent(providerRef)}`, { method: 'GET' });
    const raw = String(data.status ?? '').toUpperCase();
    const status = MAP[raw] ?? 'PENDING';
    // One event id per transaction and status, so a repeated delivery is recognised and ignored.
    const paid = typeof data.amount === 'number' ? { amountMinor: Math.round(data.amount * 100), currency: 'XAF' } : {};
    return { eventId: `${providerRef}:${raw || 'UNKNOWN'}`, type: `payment.${raw.toLowerCase() || 'unknown'}`, providerRef, status, ...paid };
  }

  /**
   * Fapshi can send the secret you set on its dashboard in the x-wh-secret header. When we have
   * one it must match. Either way, the payload is only used to find the transaction: the real
   * status is asked from Fapshi, so a forged webhook cannot mark anything paid.
   */
  async verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<VerifiedWebhookEvent> {
    const secret = env.FAPSHI_WEBHOOK_SECRET;
    if (secret) {
      const sent = headers['x-wh-secret'];
      if (typeof sent !== 'string' || !safeEqual(sent, secret)) throw badRequest('Invalid webhook secret.');
    }
    let transId = '';
    try {
      const parsed = JSON.parse(rawBody.toString('utf8')) as { transId?: unknown };
      if (typeof parsed.transId === 'string') transId = parsed.transId;
    } catch {
      /* handled below */
    }
    if (!transId || transId.length > 100) throw badRequest('Unrecognised webhook.');
    return this.fetchStatus(transId);
  }
}
