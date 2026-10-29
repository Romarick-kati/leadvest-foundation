import { env } from '../../config/env.js';
import { FapshiPaymentProvider } from './fapshi.js';
import { FlutterwavePaymentProvider } from './flutterwave.js';
import { MockPaymentProvider } from './mock.js';
import type { PaymentProvider } from './types.js';

const providers: Partial<Record<string, PaymentProvider>> = {};

function make(name: string): PaymentProvider | null {
  providers[name] ??= name === 'fapshi' ? new FapshiPaymentProvider() : name === 'flutterwave' ? new FlutterwavePaymentProvider() : name === 'mock' ? new MockPaymentProvider() : undefined;
  return providers[name] ?? null;
}

/** The provider asked for if it is switched on, otherwise the first one that is. Null when payments are off. */
export function getPaymentProvider(name?: string): PaymentProvider | null {
  const on = env.paymentProviders;
  if (on.length === 0) return null;
  if (name) return on.includes(name) ? make(name) : null;
  return make(on[0]);
}

export function getProviderByName(name: string): PaymentProvider | null {
  return env.paymentProviders.includes(name) ? make(name) : null;
}
