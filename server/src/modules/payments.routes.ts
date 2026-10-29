import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, h, notFound, send } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { audit } from '../lib/audit.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { requireRole, requireVerifiedEmail } from '../middleware/auth.js';
import { getPaymentProvider, getProviderByName } from '../services/payments/index.js';
import { MockPaymentProvider } from '../services/payments/mock.js';
import { siteUrl } from '../lib/siteUrl.js';
import { accessState, grantAccess } from '../services/access.js';
import type { VerifiedWebhookEvent } from '../services/payments/types.js';

export const paymentsRouter = Router();

/** Starts checkout for a registration that needs payment. Amount always comes from the database. */
paymentsRouter.post(
  '/checkout',
  requireRole('PARENT', 'YOUTH', 'MEMBER'),
  requireVerifiedEmail,
  h(async (req, res) => {
    const body = parse(z.object({ registrationId: z.string().max(40), idempotencyKey: z.string().min(8).max(80), provider: z.enum(['fapshi', 'flutterwave', 'mock']).optional() }), req.body);
    // The payer can choose how to pay (mobile money or card) when more than one way is switched on.
    const provider = getPaymentProvider(body.provider);
    if (!provider) throw new ApiError(503, 'payments_disabled', body.provider ? 'That way of paying is not available.' : 'Online payment is not available yet. The foundation will contact you about payment.');
    const reg = await prisma.registration.findFirst({
      where: { id: body.registrationId, registrantId: req.auth!.user.id },
      include: { event: true, program: true },
    });
    if (!reg) throw notFound('Registration not found.');
    if (reg.status === 'CANCELLED' || reg.paymentStatus !== 'PENDING') throw badRequest('This registration does not need payment.');
    const item = reg.event ?? reg.program!;
    if (!item.priceCents) throw badRequest('This registration does not have an approved price.');
    const currency = item.currency || 'XAF';

    // Idempotency: the same key from the same user returns the same payment.
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
    if (existing) {
      if (existing.registrationId !== reg.id) throw new ApiError(409, 'conflict', 'Idempotency key already used.');
      return send(res, { paymentId: existing.id, redirectUrl: existing.checkoutUrl ?? `${siteUrl(req)}/payments/simulated/${existing.id}`, simulation: existing.isSimulation });
    }
    const payment = await prisma.payment.create({
      data: {
        purpose: 'REGISTRATION',
        registrationId: reg.id,
        provider: provider.name,
        idempotencyKey: body.idempotencyKey,
        amountCents: item.priceCents,
        currency,
        payerEmail: req.auth!.user.email,
        isSimulation: provider.isSimulation,
      },
    });
    const session = await provider.createCheckout({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: item.title,
      payerEmail: payment.payerEmail,
      payerName: req.auth!.user.displayName,
      idempotencyKey: payment.idempotencyKey,
      returnBaseUrl: siteUrl(req),
      payerId: req.auth!.user.id,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: session.providerRef, checkoutUrl: session.redirectUrl } });
    send(res, { paymentId: payment.id, redirectUrl: session.redirectUrl, simulation: provider.isSimulation }, 201);
  }),
);

/**
 * Starts payment of the access fee. The amount is the site's configured fee, never something the
 * browser sends. Access is only granted when the provider confirms the payment (see applyWebhookEvent).
 */
paymentsRouter.post(
  '/access/checkout',
  requireRole('PARENT', 'YOUTH', 'MEMBER'),
  h(async (req, res) => {
    const user = req.auth!.user;
    const state = accessState(user);
    const choice = parse(z.object({ provider: z.enum(['fapshi', 'flutterwave', 'mock']).optional() }), req.body).provider;
    const provider = getPaymentProvider(choice);
    if (!provider || !state.required) throw new ApiError(503, 'payments_disabled', choice ? 'That way of paying is not available.' : 'There is no fee to pay right now.');
    if (state.lifetime) throw badRequest('Your access has no end date, so there is nothing to pay.');
    // Avoid paying twice by accident: renewing opens in the last week of an active period.
    if (state.active && state.until && state.until.getTime() - Date.now() > 7 * 86_400_000) {
      throw badRequest('Your access is already active. You can renew in the last week.');
    }
    const body = parse(z.object({ idempotencyKey: z.string().min(8).max(80) }), req.body);
    const key = `access:${user.id}:${provider.name}:${body.idempotencyKey}`;
    // Card payers from abroad can be charged in US dollars; everyone else pays in FCFA.
    const usd = provider.name === 'flutterwave' && env.ACCESS_FEE_USD > 0;
    const price = usd ? { amountCents: Math.round(env.ACCESS_FEE_USD * 100), currency: 'USD' } : { amountCents: env.ACCESS_FEE_XAF * 100, currency: 'XAF' };
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.userId !== user.id) throw new ApiError(409, 'conflict', 'Idempotency key already used.');
      if (existing.status === 'PENDING' && existing.checkoutUrl) return send(res, { paymentId: existing.id, redirectUrl: existing.checkoutUrl, simulation: existing.isSimulation });
      throw badRequest('This payment attempt is finished. Please start again.');
    }
    const payment = await prisma.payment.create({
      data: {
        purpose: 'ACCESS',
        userId: user.id,
        provider: provider.name,
        idempotencyKey: key,
        amountCents: price.amountCents,
        currency: price.currency,
        payerEmail: user.email,
        isSimulation: provider.isSimulation,
      },
    });
    const session = await provider.createCheckout({
      paymentId: payment.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: 'Lead Vest Foundation access',
      payerEmail: payment.payerEmail,
      payerName: user.displayName,
      idempotencyKey: payment.idempotencyKey,
      returnBaseUrl: siteUrl(req),
      payerId: user.id,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: session.providerRef, checkoutUrl: session.redirectUrl } });
    send(res, { paymentId: payment.id, redirectUrl: session.redirectUrl, simulation: provider.isSimulation }, 201);
  }),
);

/** Looked up recently, per payment, so a payer refreshing the page cannot flood the provider (Fapshi allows 6 per minute). */
const lastChecked = new Map<string, number>();

/**
 * Status for the return page. If the payment is still waiting, the provider is asked for the real
 * status (at most every 10 seconds per payment), so the result does not depend on a webhook arriving.
 */
paymentsRouter.get(
  '/:id',
  requireRole('PARENT', 'YOUTH', 'MEMBER', 'ADMIN'),
  h(async (req, res) => {
    let payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { registration: true } });
    if (!payment) throw notFound();
    const user = req.auth!.user;
    if (user.role !== 'ADMIN' && payment.registration?.registrantId !== user.id && payment.userId !== user.id) throw notFound();
    const provider = getProviderByName(payment.provider);
    if (payment.status === 'PENDING' && provider?.fetchStatus && payment.providerRef) {
      const last = lastChecked.get(payment.id) ?? 0;
      if (Date.now() - last > 10_000) {
        lastChecked.set(payment.id, Date.now());
        const q = req.query as Record<string, unknown>;
        const hint = {
          returnStatus: typeof q.status === 'string' ? q.status.slice(0, 20) : undefined,
          transactionId: typeof q.transaction_id === 'string' ? q.transaction_id.slice(0, 20) : undefined,
        };
        try {
          await applyWebhookEvent(provider.name, await provider.fetchStatus(payment.providerRef, hint));
          payment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { registration: true } });
        } catch (e) {
          logger.warn({ err: (e as Error).message }, 'could not refresh payment status');
        }
      }
    }
    send(res, {
      id: payment.id,
      purpose: payment.purpose,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      isSimulation: payment.isSimulation,
      provider: payment.provider,
    });
  }),
);

/**
 * Development only: asks the mock provider to send a signed webhook, exactly like a real
 * provider would after the payer completes or abandons checkout.
 */
paymentsRouter.post(
  '/:id/simulate',
  requireRole('PARENT', 'YOUTH', 'MEMBER'),
  h(async (req, res) => {
    const provider = getPaymentProvider();
    if (!(provider instanceof MockPaymentProvider) || env.isProd) throw notFound();
    const { outcome } = parse(z.object({ outcome: z.enum(['PAID', 'FAILED', 'CANCELLED']) }), req.body);
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { registration: true } });
    if (!payment || (payment.registration?.registrantId !== req.auth!.user.id && payment.userId !== req.auth!.user.id) || !payment.providerRef) throw notFound();
    const { body, signature } = provider.signedEvent(payment.providerRef, outcome);
    const event = provider.verifyWebhook(Buffer.from(body), { 'x-mock-signature': signature });
    await applyWebhookEvent(provider.name, event);
    const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    send(res, { status: updated.status, simulation: true });
  }),
);

const FINAL = new Set(['PAID', 'REFUNDED']);

/** Applies a verified provider event. Duplicate deliveries are ignored. */
export async function applyWebhookEvent(providerName: string, event: VerifiedWebhookEvent) {
  return prisma.$transaction(async (tx) => {
    const seen = await tx.paymentWebhookEvent.findUnique({ where: { provider_eventId: { provider: providerName, eventId: event.eventId } } });
    if (seen) return { duplicate: true };
    await tx.paymentWebhookEvent.create({ data: { provider: providerName, eventId: event.eventId, type: event.type } });
    const payment = await tx.payment.findUnique({ where: { providerRef: event.providerRef } });
    if (!payment) {
      logger.warn({ provider: providerName, type: event.type }, 'webhook for unknown payment');
      return { duplicate: false, unknown: true };
    }
    // Do not move a payment backwards from a final state, except a paid payment being refunded.
    if (FINAL.has(payment.status) && !(payment.status === 'PAID' && event.status === 'REFUNDED')) return { duplicate: false, ignored: true };
    if (event.status === 'PENDING') return { duplicate: false };
    // Never accept less money (or a different currency) than the price. The provider reports what was really paid.
    if (event.status === 'PAID' && event.amountMinor !== undefined && (event.currency !== payment.currency || event.amountMinor < payment.amountCents)) {
      logger.warn({ provider: providerName, expected: payment.amountCents, got: event.amountMinor, currency: event.currency }, 'payment amount did not match, not granting access');
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      return { duplicate: false, mismatch: true };
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: event.status } });
    if (payment.purpose === 'ACCESS' && payment.userId && event.status === 'PAID') await grantAccess(tx, payment.userId);
    if (payment.registrationId) {
      const reg = await tx.registration.findUniqueOrThrow({ where: { id: payment.registrationId }, include: { event: true } });
      const data: { paymentStatus: typeof event.status; status?: 'CONFIRMED' | 'CANCELLED' } = { paymentStatus: event.status };
      if (event.status === 'PAID' && reg.eventId && reg.status === 'PENDING') data.status = 'CONFIRMED';
      if (event.status === 'REFUNDED') data.status = 'CANCELLED';
      await tx.registration.update({ where: { id: reg.id }, data });
    }
    return { duplicate: false };
  });
}

/** Provider webhooks: raw body is needed for signature verification. */
export const webhookRouter = Router();
webhookRouter.post(
  '/:provider',
  express.raw({ type: '*/*', limit: '256kb' }),
  h(async (req, res) => {
    const provider = getProviderByName(req.params.provider);
    if (!provider) throw notFound();
    const event = await provider.verifyWebhook(req.body as Buffer, req.headers);
    const result = await applyWebhookEvent(provider.name, event);
    await audit(req, 'payment.webhook_received', { type: 'payment', id: event.providerRef }, { provider: provider.name, type: event.type, duplicate: result.duplicate });
    res.json({ received: true });
  }),
);
