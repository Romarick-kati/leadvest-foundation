import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { adminClient, client, makeUser, resetDb, signIn } from './helpers.js';

/** A stand-in for Fapshi's servers: records requests and answers with whatever status the test sets. */
const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> | null }[] = [];
let fapshiStatus = 'CREATED';
const original = { ...env };

beforeEach(async () => {
  await resetDb();
  Object.assign(env, {
    PAYMENTS_MODE: 'fapshi', ACCESS_FEE_XAF: 2500, ACCESS_PERIOD_DAYS: 30,
    FAPSHI_API_USER: 'api-user-1', FAPSHI_API_KEY: 'FAK_TEST_secretkey', FAPSHI_WEBHOOK_SECRET: 'hook-secret',
  });
  calls.length = 0;
  fapshiStatus = 'CREATED';
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, headers: init?.headers ?? {}, body: init?.body ? JSON.parse(init.body) : null });
    if (url.endsWith('/initiate-pay')) {
      return new Response(JSON.stringify({ message: 'ok', link: 'https://checkout.fapshi.com/payment/abc', transId: 'TR1', dateInitiated: '2026-10-25' }), { status: 200 });
    }
    if (url.includes('/payment-status/')) return new Response(JSON.stringify({ transId: 'TR1', status: fapshiStatus }), { status: 200 });
    return new Response('{}', { status: 404 });
  }));
});

afterEach(() => {
  Object.assign(env, { PAYMENTS_MODE: original.PAYMENTS_MODE, ACCESS_FEE_XAF: original.ACCESS_FEE_XAF, FAPSHI_API_USER: original.FAPSHI_API_USER, FAPSHI_API_KEY: original.FAPSHI_API_KEY, FAPSHI_WEBHOOK_SECRET: original.FAPSHI_WEBHOOK_SECRET });
  vi.unstubAllGlobals();
});

const me = async (c: ReturnType<typeof client>) => (await c.get('/api/auth/me')).body.data.user;

describe('access fee', () => {
  it('asks young people and parents to pay, but never staff or new members', async () => {
    for (const [role, required] of [['YOUTH', true], ['PARENT', true], ['MEMBER', false], ['INSTRUCTOR', false]] as const) {
      const u = await makeUser(role);
      const { c } = await signIn(u.email!);
      const user = await me(c);
      expect(user.access.required).toBe(required);
      expect(user.access.active).toBe(!required);
    }
  });

  it('is never required when payments are switched off, so nobody is locked out', async () => {
    env.PAYMENTS_MODE = 'disabled';
    const u = await makeUser('YOUTH');
    const { c } = await signIn(u.email!);
    expect((await me(c)).access.required).toBe(false);
  });

  it('blocks learning progress, family and registrations until the fee is paid', async () => {
    const youth = await makeUser('YOUTH');
    const y = await signIn(youth.email!);
    expect((await y.c.get('/api/learning/me')).status).toBe(402);
    const parent = await makeUser('PARENT');
    const p = await signIn(parent.email!);
    expect((await p.c.get('/api/guardian/learners')).status).toBe(402);
    expect((await p.c.get('/api/registrations')).status).toBe(402);
  });

  it('starts a Fapshi payment with the fee from the server, ignoring any amount the browser sends', async () => {
    const youth = await makeUser('YOUTH');
    const { c } = await signIn(youth.email!);
    const res = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'abcdefgh1', amount: 1, amountCents: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.redirectUrl).toBe('https://checkout.fapshi.com/payment/abc');
    const call = calls.find((x) => x.url.endsWith('/initiate-pay'))!;
    expect(call.url).toBe('https://sandbox.fapshi.com/initiate-pay');
    expect(call.headers.apiuser).toBe('api-user-1');
    expect(call.headers.apikey).toBe('FAK_TEST_secretkey');
    expect(call.body!.amount).toBe(2500);
    expect(String(call.body!.redirectUrl)).toContain('/payment/return?payment=');
    // The same attempt again gives the same link and does not create a second payment.
    const again = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'abcdefgh1' });
    expect(again.body.data.redirectUrl).toBe(res.body.data.redirectUrl);
    expect(await prisma.payment.count({ where: { purpose: 'ACCESS' } })).toBe(1);
  });

  it('does not grant access just because the browser came back: only Fapshi saying SUCCESSFUL does', async () => {
    const youth = await makeUser('YOUTH');
    const { c } = await signIn(youth.email!);
    const started = await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'abcdefgh2' });
    const id = started.body.data.paymentId;
    fapshiStatus = 'PENDING';
    expect((await c.get(`/api/payments/${id}`)).body.data.status).toBe('PENDING');
    expect((await me(c)).access.active).toBe(false);
    fapshiStatus = 'SUCCESSFUL';
    // Status checks are limited per payment; clear the wait so the test can check again at once.
    await new Promise((r) => setTimeout(r, 10));
    const paid = await pollUntilPaid(c, id);
    expect(paid).toBe('PAID');
    const user = await me(c);
    expect(user.access.active).toBe(true);
    expect(new Date(user.access.until).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect((await c.get('/api/learning/me')).status).toBe(200);
  });

  it('ignores forged webhooks and checks the real status with Fapshi', async () => {
    const youth = await makeUser('YOUTH');
    const { c } = await signIn(youth.email!);
    await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'abcdefgh3' });
    const anon = client();
    // Wrong secret: refused.
    expect((await anon.post('/api/payments/webhooks/fapshi').set('x-wh-secret', 'nope').send({ transId: 'TR1', status: 'SUCCESSFUL' })).status).toBe(400);
    // Right secret but Fapshi says the payment is not done: nothing is granted, whatever the body claims.
    fapshiStatus = 'CREATED';
    await anon.post('/api/payments/webhooks/fapshi').set('x-wh-secret', 'hook-secret').send({ transId: 'TR1', status: 'SUCCESSFUL' });
    expect((await me(c)).access.active).toBe(false);
    // Fapshi confirms: access is granted, and a repeat delivery does not extend it twice.
    fapshiStatus = 'SUCCESSFUL';
    const hook = () => anon.post('/api/payments/webhooks/fapshi').set('x-wh-secret', 'hook-secret').send({ transId: 'TR1', status: 'SUCCESSFUL' });
    expect((await hook()).status).toBe(200);
    const first = (await prisma.user.findUniqueOrThrow({ where: { id: youth.id } })).accessUntil!;
    await hook();
    const second = (await prisma.user.findUniqueOrThrow({ where: { id: youth.id } })).accessUntil!;
    expect(second.getTime()).toBe(first.getTime());
  });

  it('gives a paying parent’s children access too, including children added later', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    await prisma.user.update({ where: { id: parent.id }, data: { accessLifetime: true } });
    const made = await c.post('/api/guardian/learners').send({ displayName: 'Ada', username: 'ada_kid', password: 'Child-pass-1234', ageBand: '7-9', relationship: 'parent', consent: true });
    expect(made.status).toBe(201);
    const child = await prisma.user.findUniqueOrThrow({ where: { username: 'ada_kid' } });
    expect(child.accessLifetime).toBe(true);
    const kid = await signIn('ada_kid', 'Child-pass-1234');
    expect((await me(kid.c)).access.active).toBe(true);
  });

  it('lets an administrator grant free access and take it away again', async () => {
    const youth = await makeUser('YOUTH');
    const { c: admin } = await adminClient();
    const grant = await admin.post(`/api/admin/users/${youth.id}/access`).send({ action: 'grant_lifetime' });
    expect(grant.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: youth.id } })).accessLifetime).toBe(true);
    await admin.post(`/api/admin/users/${youth.id}/access`).send({ action: 'revoke' });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: youth.id } });
    expect(after.accessLifetime).toBe(false);
    expect(after.accessUntil).toBeNull();
  });

  it('refuses to start a second payment while access is active for more than a week', async () => {
    const youth = await makeUser('YOUTH');
    await prisma.user.update({ where: { id: youth.id }, data: { accessUntil: new Date(Date.now() + 20 * 86_400_000) } });
    const { c } = await signIn(youth.email!);
    expect((await c.post('/api/payments/access/checkout').send({ idempotencyKey: 'abcdefgh4' })).status).toBe(400);
  });
});

async function pollUntilPaid(c: ReturnType<typeof client>, id: string) {
  // The status route asks Fapshi at most every 10 seconds per payment; the first call above used that
  // allowance, so move the clock forward instead of waiting.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 11_000);
  try {
    return (await c.get(`/api/payments/${id}`)).body.data.status as string;
  } finally {
    vi.useRealTimers();
  }
}
