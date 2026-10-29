import { beforeEach, describe, expect, it } from 'vitest';
import { client, makeUser, PASSWORD, resetDb, signIn, totpFor } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(resetDb);

async function enrol() {
  const user = await makeUser('PARENT');
  const { c } = await signIn(user.email!);
  const setup = await c.post('/api/account/2fa/setup').send({ currentPassword: PASSWORD });
  return { user, c, setup };
}

describe('two factor enrolment', () => {
  it('requires the current password to start setup', async () => {
    const user = await makeUser('PARENT');
    const { c } = await signIn(user.email!);
    const res = await c.post('/api/account/2fa/setup').send({ currentPassword: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns a QR code and manual key and stores the secret encrypted', async () => {
    const { user, setup } = await enrol();
    expect(setup.status).toBe(200);
    expect(setup.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const manual = setup.body.data.manualKey.replace(/\s/g, '');
    expect(stored.totpPendingSecretEnc).toBeTruthy();
    expect(stored.totpPendingSecretEnc).not.toContain(manual);
    expect(stored.totpEnabledAt).toBeNull();
  });

  it('does not enable two factor on a wrong code', async () => {
    const { user, c } = await enrol();
    const res = await c.post('/api/account/2fa/enable').send({ code: '000000' });
    expect(res.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).totpEnabledAt).toBeNull();
  });

  it('enables after a valid code and returns ten hashed recovery codes once', async () => {
    const { user, c } = await enrol();
    const res = await c.post('/api/account/2fa/enable').send({ code: await totpFor(user.id, { pending: true }) });
    expect(res.status).toBe(200);
    expect(res.body.data.recoveryCodes).toHaveLength(10);
    const rows = await prisma.recoveryCode.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.codeHash)).not.toContain(res.body.data.recoveryCodes[0]);
    const security = await c.get('/api/account/security');
    expect(security.body.data).toMatchObject({ twoFactorEnabled: true, recoveryCodesRemaining: 10 });
  });
});

describe('two factor sign in', () => {
  async function enabled() {
    const { user, c } = await enrol();
    const res = await c.post('/api/account/2fa/enable').send({ code: await totpFor(user.id, { pending: true }) });
    return { user, recoveryCodes: res.body.data.recoveryCodes as string[] };
  }

  it('requires the second factor before any protected route works', async () => {
    const { user } = await enabled();
    const { c, res } = await signIn(user.email!);
    expect(res.body.data).toEqual({ mfaRequired: true });
    const me = await c.get('/api/auth/me');
    expect(me.body.data).toEqual({ user: null, mfaPending: true });
    const profile = await c.get('/api/account/profile');
    expect(profile.status).toBe(401);
    expect(profile.body.error.code).toBe('mfa_required');
  });

  it('rejects a wrong code and accepts a valid one', async () => {
    const { user } = await enabled();
    const { c } = await signIn(user.email!);
    expect((await c.post('/api/auth/2fa').send({ code: '123456' })).status).toBe(401);
    const ok = await c.post('/api/auth/2fa').send({ code: await totpFor(user.id, { stepOffset: 1 }) });
    expect(ok.status).toBe(200);
    expect((await c.get('/api/account/profile')).status).toBe(200);
  });

  it('prevents replay of a code that was already used', async () => {
    const { user } = await enabled();
    const code = await totpFor(user.id, { stepOffset: 1 });
    const first = await signIn(user.email!);
    expect((await first.c.post('/api/auth/2fa').send({ code })).status).toBe(200);
    const second = await signIn(user.email!);
    expect((await second.c.post('/api/auth/2fa').send({ code })).status).toBe(401);
  });

  it('accepts each recovery code exactly once', async () => {
    const { user, recoveryCodes } = await enabled();
    const a = await signIn(user.email!);
    const ok = await a.c.post('/api/auth/2fa').send({ recoveryCode: recoveryCodes[0].toUpperCase() });
    expect(ok.status).toBe(200);
    expect(ok.body.data.usedRecoveryCode).toBe(true);
    const b = await signIn(user.email!);
    expect((await b.c.post('/api/auth/2fa').send({ recoveryCode: recoveryCodes[0] })).status).toBe(401);
    const sec = await a.c.get('/api/account/security');
    expect(sec.body.data.recoveryCodesRemaining).toBe(9);
  });

  it('cannot complete the second factor without a password first', async () => {
    await enabled();
    const res = await client().post('/api/auth/2fa').send({ code: '123456' });
    expect(res.status).toBe(401);
  });
});

describe('disabling and regenerating', () => {
  it('requires password and a valid code to disable', async () => {
    const { user, c } = await enrol();
    await c.post('/api/account/2fa/enable').send({ code: await totpFor(user.id, { pending: true }) });
    expect((await c.post('/api/account/2fa/disable').send({ currentPassword: PASSWORD, code: '000000' })).status).toBe(400);
    expect((await c.post('/api/account/2fa/disable').send({ currentPassword: 'nope', code: await totpFor(user.id, { stepOffset: 1 }) })).status).toBe(401);
    const ok = await c.post('/api/account/2fa/disable').send({ currentPassword: PASSWORD, code: await totpFor(user.id, { stepOffset: 1 }) });
    expect(ok.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.totpSecretEnc).toBeNull();
    expect(await prisma.recoveryCode.count({ where: { userId: user.id } })).toBe(0);
  });

  it('regenerates recovery codes and invalidates the old ones', async () => {
    const { user, c } = await enrol();
    const en = await c.post('/api/account/2fa/enable').send({ code: await totpFor(user.id, { pending: true }) });
    const regen = await c.post('/api/account/2fa/recovery-codes').send({ currentPassword: PASSWORD, code: await totpFor(user.id, { stepOffset: 1 }) });
    expect(regen.status).toBe(200);
    const { c: c2 } = await signIn(user.email!);
    expect((await c2.post('/api/auth/2fa').send({ recoveryCode: en.body.data.recoveryCodes[0] })).status).toBe(401);
    expect((await c2.post('/api/auth/2fa').send({ recoveryCode: regen.body.data.recoveryCodes[0] })).status).toBe(200);
  });

  it('keeps two factor on after a password reset', async () => {
    const { user, c } = await enrol();
    await c.post('/api/account/2fa/enable').send({ code: await totpFor(user.id, { pending: true }) });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash } });
    const { res } = await signIn(user.email!);
    expect(res.body.data.mfaRequired).toBe(true);
  });

  it('is not offered to learner accounts', async () => {
    const learner = await makeUser('LEARNER');
    const { c } = await signIn(learner.username!);
    expect((await c.post('/api/account/2fa/setup').send({ currentPassword: PASSWORD })).status).toBe(403);
  });
});
