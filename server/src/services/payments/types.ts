export interface CheckoutRequest {
  paymentId: string;
  amountCents: number;
  currency: string;
  description: string;
  payerEmail?: string | null;
  payerName?: string | null;
  idempotencyKey: string;
  /** The site address the payer is sent back to afterwards. */
  returnBaseUrl: string;
  /** An id for the payer in our system, so the provider's records can be matched to a person. */
  payerId?: string | null;
}

export interface CheckoutSession {
  providerRef: string;
  /** Where the browser should go next. The browser reaching a return URL never marks anything paid. */
  redirectUrl: string;
}

/** What the payer's browser reported when it came back. Only a hint: the provider's own answer decides. */
export interface StatusHint {
  returnStatus?: string;
  transactionId?: string;
}

export type ProviderPaymentStatus = 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PENDING';

export interface VerifiedWebhookEvent {
  eventId: string;
  type: string;
  providerRef: string;
  status: ProviderPaymentStatus;
  /** What the provider says was actually paid, in hundredths of the currency. Checked against the price before access is given. */
  amountMinor?: number;
  currency?: string;
}

/**
 * Every payment provider (for example a card processor or a mobile money aggregator)
 * implements this interface, so the provider can change without touching business logic.
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isSimulation: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Must verify the provider's signature and throw if it is not authentic. */
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): VerifiedWebhookEvent | Promise<VerifiedWebhookEvent>;
  /** Asks the provider for the real status of a payment. Used when the payer comes back and for webhook checks. */
  fetchStatus?(providerRef: string, hint?: StatusHint): Promise<VerifiedWebhookEvent>;
}
