import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, makeUser, PASSWORD, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(resetDb);

const adminRoutes = ['/api/admin/overview', '/api/admin/users', '/api/admin/enquiries', '/api/admin/audit-logs', '/api/admin/settings', '/api/admin/registrations'];

describe('administrator access', () => {
  it('blocks visitors from every admin route', async () => {
    for (const route of adminRoutes) expect((await client().get(route)).status).toBe(401);
  });

  it('blocks parents, learners and instructors from admin routes', async () => {
    for (const role of ['PARENT', 'INSTRUCTOR'] as const) {
      const u = await makeUser(role);
      const { c } = await signIn(u.email!);
      for (const route of adminRoutes) expect((await c.get(route)).status).toBe(403);
    }
    const kid = await makeUser('LEARNER');
    const { c } = await signIn(kid.username!);
    expect((await c.get('/api/admin/users')).status).toBe(403);
  });

  it('requires administrators to turn on two factor first', async () => {
    const admin = await makeUser('ADMIN');
    const { c } = await signIn(admin.email!);
    const res = await c.get('/api/admin/overview');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('admin_mfa_required');
  });

  it('lets an administrator with two factor in', async () => {
    const { c } = await adminClient();
    const res = await c.get('/api/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toBeDefined();
  });

  it('never returns authentication secrets in user listings', async () => {
    const { c } = await adminClient();
    const res = await c.get('/api/admin/users');
    const text = JSON.stringify(res.body);
    for (const secret of ['passwordHash', 'totpSecretEnc', 'totpPendingSecretEnc', 'codeHash', 'tokenHash']) expect(text).not.toContain(secret);
  });

  it('stops an administrator removing their own access or the last admin', async () => {
    const { c, admin } = await adminClient();
    const res = await c.patch(`/api/admin/users/${admin.id}`).send({ role: 'PARENT' });
    expect(res.status).toBe(400);
  });

  it('records role changes in the audit log without secrets', async () => {
    const { c } = await adminClient();
    const target = await makeUser('PARENT');
    await c.patch(`/api/admin/users/${target.id}`).send({ role: 'INSTRUCTOR' });
    const log = await prisma.auditLog.findFirst({ where: { action: 'user.updated', targetId: target.id } });
    expect(log?.metadata).toEqual({ role: { from: 'PARENT', to: 'INSTRUCTOR' } });
  });

  it('creates staff accounts without the admin ever choosing a password', async () => {
    const { c } = await adminClient();
    const res = await c.post('/api/admin/users').send({ email: 'new.staff@example.test', displayName: 'New Staff', role: 'INSTRUCTOR', password: 'ignored-123' });
    expect(res.status).toBe(201);
    expect(res.body.data.setupLink).toMatch(/\/reset-password\?token=/);
    expect((await signIn('new.staff@example.test', 'ignored-123')).res.status).toBe(401);
  });
});

describe('instructor scope', () => {
  it('limits rosters to assigned programs', async () => {
    const mine = await prisma.program.create({ data: { slug: 'mine', title: 'Mine', summary: 's', description: 'd', status: 'PUBLISHED' } });
    const other = await prisma.program.create({ data: { slug: 'other', title: 'Other', summary: 's', description: 'd', status: 'PUBLISHED' } });
    const teacher = await makeUser('INSTRUCTOR');
    await prisma.instructorAssignment.create({ data: { programId: mine.id, instructorId: teacher.id } });
    const parent = await makeUser('PARENT');
    const kid = await makeUser('LEARNER', { displayName: 'Kiddo' });
    await prisma.registration.create({ data: { programId: other.id, registrantId: parent.id, learnerId: kid.id, status: 'CONFIRMED' } });

    const { c } = await signIn(teacher.email!);
    const list = await c.get('/api/instructor/programs');
    expect(list.body.data.map((p: { slug: string }) => p.slug)).toEqual(['mine']);
    expect((await c.get(`/api/instructor/programs/${mine.id}/roster`)).status).toBe(200);
    const blocked = await c.get(`/api/instructor/programs/${other.id}/roster`);
    expect(blocked.status).toBe(404);
    expect(JSON.stringify(blocked.body)).not.toContain('Kiddo');
  });

  it('shows learner display names only, no guardian contact details', async () => {
    const program = await prisma.program.create({ data: { slug: 'p', title: 'P', summary: 's', description: 'd', status: 'PUBLISHED' } });
    const teacher = await makeUser('INSTRUCTOR');
    await prisma.instructorAssignment.create({ data: { programId: program.id, instructorId: teacher.id } });
    const parent = await makeUser('PARENT', { email: 'private.parent@example.test' });
    const kid = await makeUser('LEARNER', { displayName: 'Kiddo' });
    await prisma.registration.create({ data: { programId: program.id, registrantId: parent.id, learnerId: kid.id, status: 'CONFIRMED' } });
    const { c } = await signIn(teacher.email!);
    const res = await c.get(`/api/instructor/programs/${program.id}/roster`);
    expect(res.body.data.participants[0].learner.displayName).toBe('Kiddo');
    expect(JSON.stringify(res.body)).not.toContain('private.parent@example.test');
  });
});

describe('protected settings belong to their owner', () => {
  it('cannot revoke another user’s session', async () => {
    const a = await makeUser('PARENT');
    const b = await makeUser('PARENT');
    await signIn(b.email!);
    const bSession = await prisma.session.findFirstOrThrow({ where: { userId: b.id } });
    const { c } = await signIn(a.email!);
    expect((await c.delete(`/api/account/sessions/${bSession.id}`)).status).toBe(404);
    expect(await prisma.session.count({ where: { id: bSession.id } })).toBe(1);
  });

  it('ignores attempts to set protected fields through profile updates', async () => {
    const u = await makeUser('PARENT');
    const { c } = await signIn(u.email!);
    await c.patch('/api/account/profile').send({ displayName: 'New name', role: 'ADMIN', id: 'someone-else' });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(stored.role).toBe('PARENT');
    expect(stored.displayName).toBe('New name');
  });

  it('rejects unknown preference keys', async () => {
    const u = await makeUser('PARENT');
    const { c } = await signIn(u.email!);
    expect((await c.patch('/api/account/preferences').send({ userId: 'x' })).status).toBe(400);
  });

  it('requires the current password to change password and signs out other sessions', async () => {
    const u = await makeUser('PARENT');
    const { c: other } = await signIn(u.email!);
    const { c } = await signIn(u.email!);
    expect((await c.post('/api/account/password').send({ currentPassword: 'wrong', newPassword: 'Fresh-pass-77' })).status).toBe(401);
    expect((await c.post('/api/account/password').send({ currentPassword: PASSWORD, newPassword: 'Fresh-pass-77' })).status).toBe(200);
    expect((await other.get('/api/auth/me')).body.data.user).toBeNull();
    expect((await c.get('/api/auth/me')).body.data.user).not.toBeNull();
  });

  it('persists preferences in the database', async () => {
    const u = await makeUser('PARENT');
    const { c } = await signIn(u.email!);
    await c.patch('/api/account/preferences').send({ reduceMotion: true, textSize: 'large', newsletterOptIn: true });
    const prefs = await prisma.userPreferences.findUniqueOrThrow({ where: { userId: u.id } });
    expect(prefs).toMatchObject({ reduceMotion: true, textSize: 'large', newsletterOptIn: true, securityAlerts: true });
  });
});
