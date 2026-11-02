import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { client, makeUser, resetDb, signIn } from './helpers.js';

const calls: { url: string; method: string; headers: Record<string, string>; body: Record<string, unknown> | null }[] = [];
let notch: { status: string; amount: number; currency: string } | null = null;
const original = { ...env };
const HASH = 'hsk_test.secret-hash';

beforeEach(async () => {
  await resetDb();
  Object.assign(env, {
    PAYMENTS_MODE: 'fapshi+notchpay', ACCESS_FEE_XAF: 2500, ACCESS_FEE_USD: 0, ACCESS_PERIOD_DAYS: 30,
    FAPSHI_API_USER: 'u', FAPSHI_API_KEY: 'FAK_TEST_x',
    NOTCHPAY_PUBLIC_KEY: 'pk_test.abc', NOTCHPAY_HASH_KEY: HASH,
  });
  calls.length = 0;
  notch = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : null });
    if (url === 'https://api.notchpay.co/payments' && init?.method === 'POST') {
      return new Response(JSON.stringify({ message: 'Payment initialized', transaction: { reference: 'trx.test1', status: 'pending' }, authorization_url: 'https://pay.notchpay.co/trx.test1' }), { status: 201 });
    }
    if (url === 'https://api.notchpay.co/payments/trx.test1') {
      if (!notch) return new Response(JSON.stringify({ message: 'Payment pending', transaction: { reference: 'trx.test1', status: 'pending', amount: 2500, currency: 'XAF' } }), { status: 200 });
      return new Response(JSON.stringify({ transaction: { reference: 'trx.test1', ...notch } }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }));
});

afterEach(() => {
  for (const k of ['PAYMENTS_MODE', 'ACCESS_FEE_XAF', 'ACCESS_FEE_USD', 'FAPSHI_API_USER', 'FAPSHI_API_KEY', 'NOTCHPAY_PUBLIC_KEY', 'NOTCHPAY_HASH_KEY'] as const) (env as Record<string, unknown>)[k] = original[k];
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const me = async (c: ReturnType<typeof client>) => (await c.get('/api/auth/me')).body.data.user;
async function later(ms: number) { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Date.now() + ms); }
const sign = (body: string, key = HASH) => createHmac('sha256', key).update(body).digest('hex');

describe('paying by card with Notch Pay', () => {
  it('offers Notch Pay next to MTN MoMo', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    expect((await me(c)).access.providers).toEqual(['fapshi', 'notchpay']);
  });

  it('starts a payment with the price from the server and returns the Notch Pay page', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const res = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey001', provider: 'notchpay', amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.redirectUrl).toBe('https://pay.notchpay.co/trx.test1');
    expect(res.body.data.simulation).toBe(true);
    const call = calls.find((x) => x.url === 'https://api.notchpay.co/payments')!;
    expect(call.headers.Authorization).toBe('pk_test.abc');
    expect(call.body!.amount).toBe(2500);
    expect(call.body!.currency).toBe('XAF');
    expect(String(call.body!.reference)).toMatch(/^lvf-/);
    expect(String(call.body!.callback)).toContain('/payment/return?payment=');
    expect((call.body!.customer as { email: string }).email).toBe(u.email);
    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: u.id } });
    expect(payment.providerRef).toMatch(/^lvf-.+\|trx\.test1$/);
  });

  it('refuses Notch Pay when it is not switched on', async () => {
    env.PAYMENTS_MODE = 'fapshi';
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    expect((await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey002', provider: 'notchpay' })).status).toBe(503);
  });

  it('grants access only when Notch Pay reports the right amount, and never because the browser came back', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const id = (await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey003', provider: 'notchpay' })).body.data.paymentId;
    // Still waiting: Notch Pay says pending.
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('PENDING');
    // Paid too little: refused.
    notch = { status: 'complete', amount: 100, currency: 'XAF' };
    await later(11_000);
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('FAILED');
    expect((await me(c)).access.active).toBe(false);
  });

  it('confirms a full payment when the payer comes back', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const id = (await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey004', provider: 'notchpay' })).body.data.paymentId;
    notch = { status: 'complete', amount: 2500, currency: 'XAF' };
    await later(11_000);
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('PAID');
    expect((await me(c)).access.active).toBe(true);
  });

  it('shows a cancelled payment as cancelled', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    const id = (await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey005', provider: 'notchpay' })).body.data.paymentId;
    notch = { status: 'canceled', amount: 2500, currency: 'XAF' };
    await later(11_000);
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('CANCELLED');
  });

  it('accepts a correctly signed webhook, and rejects forged, unsigned and unknown ones', async () => {
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'notchkey006', provider: 'notchpay' });
    const anon = client();
    const body = JSON.stringify({ type: 'payment.complete', data: { reference: 'trx.test1', status: 'complete' } });
    const post = (b: string, sig?: string) => {
      const r = anon.post('/api/payments/webhooks/notchpay').set('Content-Type', 'application/json');
      return (sig ? r.set('x-notch-signature', sig) : r).send(b);
    };
    expect((await post(body, 'f'.repeat(64))).status).toBe(400);
    expect((await post(body)).status).toBe(400);
    expect((await post(body, sign(body, 'wrong-key'))).status).toBe(400);
    notch = { status: 'complete', amount: 2500, currency: 'XAF' };
    expect((await post(body, sign(body))).status).toBe(200);
    expect((await me(c)).access.active).toBe(true);
    // The same webhook again changes nothing.
    const first = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).accessUntil!;
    expect((await post(body, sign(body))).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).accessUntil!.getTime()).toBe(first.getTime());
    // A reference that is not ours is rejected.
    const other = JSON.stringify({ type: 'payment.complete', data: { reference: 'trx.someoneelse' } });
    expect((await post(other, sign(other))).status).toBe(400);
  });
});
