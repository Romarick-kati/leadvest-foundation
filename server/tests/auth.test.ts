import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, client, makeUser, PASSWORD, resetDb, signIn } from './helpers.js';
import { testOutbox } from '../src/services/email/index.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(async () => {
  await resetDb();
  testOutbox.length = 0;
});

describe('registration and sign in', () => {
  it('registers a new member with one short form, hashes the password and signs them in', async () => {
    const c = client();
    const res = await c.post('/api/auth/register').send({ displayName: 'Ada', email: 'ADA@example.test', password: PASSWORD, acceptTerms: true });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'ada@example.test', role: 'MEMBER', emailVerified: false });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.verificationEmailDelivered).toBe(false);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ada@example.test' } });
    expect(stored.passwordHash).not.toContain(PASSWORD);
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
    const me = await c.get('/api/auth/me');
    expect(me.body.data.user.email).toBe('ada@example.test');
  });

  it('rejects weak passwords and missing terms with field errors', async () => {
    const res = await client().post('/api/auth/register').send({ displayName: 'A', email: 'bad', password: 'short' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['email', 'password', 'acceptTerms']));
  });

  it('ignores a role sent by the client during registration', async () => {
    const res = await client().post('/api/auth/register').send({ displayName: 'Eve', email: 'eve@example.test', password: PASSWORD, acceptTerms: true, role: 'ADMIN' });
    expect(res.body.data.user.role).toBe('MEMBER');
  });

  it('gives the same error for unknown accounts and wrong passwords', async () => {
    const user = await makeUser('PARENT');
    const a = await signIn('nobody@example.test');
    const b = await signIn(user.email!, 'Wrong-password-1');
    expect(a.res.status).toBe(401);
    expect(b.res.status).toBe(401);
    expect(a.res.body.error.message).toBe(b.res.body.error.message);
  });

  it('locks the account after repeated failures', async () => {
    const user = await makeUser('PARENT');
    for (let i = 0; i < 10; i++) await signIn(user.email!, 'Wrong-password-1');
    const { res } = await signIn(user.email!);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('locked');
  });

  it('refuses suspended accounts', async () => {
    const user = await makeUser('PARENT');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });
    const { res } = await signIn(user.email!);
    expect(res.status).toBe(403);
  });

  it('signs learners in by username', async () => {
    await makeUser('LEARNER', { username: 'kid_one' });
    const { res } = await signIn('kid_one');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('LEARNER');
  });

  it('sets an http only session cookie and signs out', async () => {
    const user = await makeUser('PARENT');
    const { c, res } = await signIn(user.email!);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    await c.post('/api/auth/logout');
    const me = await c.get('/api/auth/me');
    expect(me.body.data.user).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });
});

describe('CSRF protection', () => {
  it('rejects state changing requests without the client header', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: 'x', password: 'y' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf');
  });

  it('rejects requests from other origins', async () => {
    const res = await request(app).post('/api/auth/login').set('X-Requested-With', 'lvf-web').set('Origin', 'https://evil.example').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('bad_origin');
  });
});

describe('email verification and password reset', () => {
  it('verifies email with the emailed single use link', async () => {
    const c = client();
    await c.post('/api/auth/register').send({ displayName: 'Bo', email: 'bo@example.test', password: PASSWORD, acceptTerms: true });
    const mail = testOutbox.find((m) => m.subject.includes('confirm'))!;
    const token = /token=([^\s"&<]+)/.exec(mail.text)![1];
    const ok = await c.post('/api/auth/verify-email').send({ token: decodeURIComponent(token) });
    expect(ok.status).toBe(200);
    const again = await c.post('/api/auth/verify-email').send({ token: decodeURIComponent(token) });
    expect(again.status).toBe(400);
    const me = await c.get('/api/auth/me');
    expect(me.body.data.user.emailVerified).toBe(true);
  });

  it('resets a password, signs out other sessions and rejects reuse of the link', async () => {
    const user = await makeUser('PARENT');
    const { c: oldSession } = await signIn(user.email!);
    const res = await client().post('/api/auth/forgot-password').send({ email: user.email });
    expect(res.status).toBe(200);
    const token = decodeURIComponent(/token=([^\s"&<]+)/.exec(testOutbox.at(-1)!.text)![1]);
    const reset = await client().post('/api/auth/reset-password').send({ token, password: 'Brand-new-pass-9' });
    expect(reset.status).toBe(200);
    expect((await oldSession.get('/api/auth/me')).body.data.user).toBeNull();
    expect((await signIn(user.email!, 'Brand-new-pass-9')).res.status).toBe(200);
    expect((await client().post('/api/auth/reset-password').send({ token, password: 'Another-pass-99' })).status).toBe(400);
  });

  it('does not reveal whether an email is registered', async () => {
    const res = await client().post('/api/auth/forgot-password').send({ email: 'unknown@example.test' });
    expect(res.status).toBe(200);
    expect(testOutbox).toHaveLength(0);
  });
});
