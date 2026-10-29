import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { client, makeUser, resetDb, signIn } from './helpers.js';

const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> | null }[] = [];
let flw: { status: string; amount: number; currency: string } | null = null;
const original = { ...env };

beforeEach(async () => {
  await resetDb();
  Object.assign(env, {
    PAYMENTS_MODE: 'both', ACCESS_FEE_XAF: 2500, ACCESS_FEE_USD: 5, ACCESS_PERIOD_DAYS: 30,
    FAPSHI_API_USER: 'u', FAPSHI_API_KEY: 'FAK_TEST_x',
    FLUTTERWAVE_SECRET_KEY: 'FLWSECK_TEST-secret', FLUTTERWAVE_SECRET_HASH: 'hash-secret',
  });
  calls.length = 0;
  flw = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : null });
    if (url.endsWith('/v3/payments')) return new Response(JSON.stringify({ status: 'success', message: 'Hosted Link', data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-1' } }), { status: 200 });
    if (url.includes('verify_by_reference')) {
      if (!flw) return new Response(JSON.stringify({ status: 'error', message: 'No transaction was found for this id' }), { status: 400 });
      return new Response(JSON.stringify({ status: 'success', data: { id: 99, ...flw } }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }));
});

afterEach(() => {
  for (const k of ['PAYMENTS_MODE', 'ACCESS_FEE_XAF', 'ACCESS_FEE_USD', 'FAPSHI_API_USER', 'FAPSHI_API_KEY', 'FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_SECRET_HASH'] as const) (env as Record<string, unknown>)[k] = original[k];
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const me = async (c: ReturnType<typeof client>) => (await c.get('/api/auth/me')).body.data.user;
async function later(ms: number) { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Date.now() + ms); }

describe('paying by card with Flutterwave', () => {
  it('offers both ways to pay and the dollar price for people abroad', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const access = (await me(c)).access;
    expect(access.providers).toEqual(['fapshi', 'flutterwave']);
    expect(access.feeUsd).toBe(5);
    expect(access.feeXaf).toBe(2500);
  });

  it('starts a dollar payment with the price from the server and returns Flutterwave’s link', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const res = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'flwkey001', provider: 'flutterwave', amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.redirectUrl).toContain('checkout.flutterwave.com');
    const call = calls.find((x) => x.url.endsWith('/v3/payments'))!;
    expect(call.headers.Authorization).toBe('Bearer FLWSECK_TEST-secret');
    expect(call.body!.amount).toBe(5);
    expect(call.body!.currency).toBe('USD');
    expect(String(call.body!.tx_ref)).toMatch(/^lvf-/);
    expect((call.body!.customer as { email: string }).email).toBe(u.email);
    expect(String(call.body!.redirect_url)).toContain('/payment/return?payment=');
  });

  it('refuses a provider that is not switched on', async () => {
    env.PAYMENTS_MODE = 'fapshi';
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    expect((await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'flwkey002', provider: 'flutterwave' })).status).toBe(503);
  });

  it('grants access only when Flutterwave reports the right amount in the right currency', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const started = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'flwkey003', provider: 'flutterwave' });
    const id = started.body.data.paymentId;
    // Nothing paid yet: Flutterwave knows no transaction, so we stay waiting.
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('PENDING');
    // Paid too little (1 dollar instead of 5): refused.
    flw = { status: 'successful', amount: 1, currency: 'USD' };
    await later(11_000);
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('FAILED');
    expect((await me(c)).access.active).toBe(false);
  });

  it('grants access for a full payment, and ignores forged or secret-less webhooks', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'flwkey004', provider: 'flutterwave' });
    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: u.id } });
    const ref = payment.providerRef!;
    const anon = client();
    expect((await anon.post('/api/payments/webhooks/flutterwave').set('verif-hash', 'wrong').send({ event: 'charge.completed', data: { tx_ref: ref } })).status).toBe(400);
    flw = { status: 'successful', amount: 5, currency: 'USD' };
    const ok = await anon.post('/api/payments/webhooks/flutterwave').set('verif-hash', 'hash-secret').send({ event: 'charge.completed', data: { tx_ref: ref, status: 'successful' } });
    expect(ok.status).toBe(200);
    const user = await me(c);
    expect(user.access.active).toBe(true);
    // The same webhook again changes nothing.
    const first = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).accessUntil!;
    await anon.post('/api/payments/webhooks/flutterwave').set('verif-hash', 'hash-secret').send({ event: 'charge.completed', data: { tx_ref: ref } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).accessUntil!.getTime()).toBe(first.getTime());
    // A webhook for a reference that is not ours is rejected.
    expect((await anon.post('/api/payments/webhooks/flutterwave').set('verif-hash', 'hash-secret').send({ data: { tx_ref: 'other-123' } })).status).toBe(400);
  });
});
