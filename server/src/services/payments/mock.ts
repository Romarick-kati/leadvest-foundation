import { env } from '../../config/env.js';
import { hmacSign, randomToken, safeEqual } from '../../lib/crypto.js';
import { badRequest } from '../../lib/http.js';
import type { CheckoutRequest, PaymentProvider, VerifiedWebhookEvent } from './types.js';

/**
 * SIMULATION ONLY. No money moves. Used for development so the registration and payment
 * state machine can be exercised. Refused at startup in production.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  readonly isSimulation = true;

  private get secret() {
    return env.PAYMENT_WEBHOOK_SECRET ?? `mock:${env.SESSION_SECRET}`;
  }

  async createCheckout(req: CheckoutRequest) {
    const providerRef = `mock_${randomToken(12)}`;
    return { providerRef, redirectUrl: `${req.returnBaseUrl || env.publicAppUrl}/payments/simulated/${req.paymentId}` };
  }

  /** Builds a signed webhook exactly as a real provider would send it. */
  signedEvent(providerRef: string, status: VerifiedWebhookEvent['status']) {
    const body = JSON.stringify({ id: `evt_${randomToken(12)}`, type: `payment.${status.toLowerCase()}`, providerRef, status });
    return { body, signature: hmacSign(body, this.secret) };
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): VerifiedWebhookEvent {
    const signature = headers['x-mock-signature'];
    if (typeof signature !== 'string' || !safeEqual(signature, hmacSign(rawBody.toString('utf8'), this.secret))) {
      throw badRequest('Invalid webhook signature.');
    }
    const parsed = JSON.parse(rawBody.toString('utf8'));
    return { eventId: parsed.id, type: parsed.type, providerRef: parsed.providerRef, status: parsed.status };
  }
}
