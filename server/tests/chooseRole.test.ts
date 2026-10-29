import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { client, makeUser, resetDb, signIn } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('choosing how to use the platform', () => {
  it('lets a new member become a learner after confirming they are 16 or older', async () => {
    const u = await makeUser('MEMBER');
    const { c } = await signIn(u.email!);
    const missing = await c.post('/api/account/choose-role').send({ role: 'YOUTH' });
    expect(missing.status).toBe(400);
    const ok = await c.post('/api/account/choose-role').send({ role: 'YOUTH', confirmAge: true });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.role).toBe('YOUTH');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe('YOUTH');
    expect(await prisma.consentRecord.count({ where: { giverId: u.id, type: 'youth_self_registration_16plus' } })).toBe(1);
    const progress = await c.get('/api/learning/me');
    expect(progress.status).toBe(200);
  });

  it('lets a new member become a parent or guardian', async () => {
    const u = await makeUser('MEMBER');
    const { c } = await signIn(u.email!);
    const ok = await c.post('/api/account/choose-role').send({ role: 'PARENT' });
    expect(ok.body.data.user.role).toBe('PARENT');
  });

  it('does not let anyone pick a staff role or change a staff account', async () => {
    const u = await makeUser('MEMBER');
    const { c } = await signIn(u.email!);
    expect((await c.post('/api/account/choose-role').send({ role: 'ADMIN' })).status).toBe(400);
    const admin = await makeUser('INSTRUCTOR');
    const staff = await signIn(admin.email!);
    expect((await staff.c.post('/api/account/choose-role').send({ role: 'PARENT' })).status).toBe(403);
  });

  it('keeps a parent with linked children as a parent', async () => {
    const parent = await makeUser('PARENT');
    const child = await makeUser('LEARNER');
    await prisma.guardianLink.create({ data: { guardianId: parent.id, learnerId: child.id, relationship: 'parent', status: 'VERIFIED' } });
    const { c } = await signIn(parent.email!);
    const res = await c.post('/api/account/choose-role').send({ role: 'YOUTH', confirmAge: true });
    expect(res.status).toBe(400);
  });

  it('requires sign in', async () => {
    expect((await client().post('/api/account/choose-role').send({ role: 'PARENT' })).status).toBe(401);
  });
});
