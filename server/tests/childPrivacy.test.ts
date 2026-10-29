import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, makeUser, PASSWORD, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(resetDb);

async function guardianWithChild() {
  const parent = await makeUser('PARENT');
  const { c } = await signIn(parent.email!);
  const res = await c.post('/api/guardian/learners').send({
    displayName: 'Mia', username: 'mia_reads', password: 'Kid-password-12', ageBand: '7-9', relationship: 'parent', consent: true,
  });
  return { parent, c, learner: res.body.data, res };
}

describe('guardian controls', () => {
  it('creates a learner with consent recorded and a verified link', async () => {
    const { res, parent, learner } = await guardianWithChild();
    expect(res.status).toBe(201);
    const link = await prisma.guardianLink.findFirstOrThrow({ where: { guardianId: parent.id, learnerId: learner.id } });
    expect(link.status).toBe('VERIFIED');
    expect(await prisma.consentRecord.count({ where: { subjectId: learner.id, type: 'learning_account', granted: true } })).toBe(1);
  });

  it('requires a verified email before creating child accounts', async () => {
    const parent = await makeUser('PARENT', { verified: false });
    const { c } = await signIn(parent.email!);
    const res = await c.post('/api/guardian/learners').send({ displayName: 'X', username: 'x_kid', password: 'Kid-password-12', relationship: 'parent', consent: true });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('email_unverified');
  });

  it('stops another parent managing or viewing a child they are not linked to', async () => {
    const { learner } = await guardianWithChild();
    const stranger = await makeUser('PARENT');
    const { c } = await signIn(stranger.email!);
    expect((await c.patch(`/api/guardian/learners/${learner.id}`).send({ displayName: 'Hacked' })).status).toBe(403);
    expect((await c.get(`/api/guardian/learners/${learner.id}/progress`)).status).toBe(403);
    expect((await c.post(`/api/guardian/learners/${learner.id}/password`).send({ password: 'Taken-over-123' })).status).toBe(403);
  });

  it('keeps a requested second guardian link pending until an admin verifies it', async () => {
    const { learner } = await guardianWithChild();
    const second = await makeUser('PARENT');
    const { c } = await signIn(second.email!);
    const req = await c.post('/api/guardian/links').send({ username: 'mia_reads', relationship: 'guardian' });
    expect(req.status).toBe(202);
    expect((await c.get(`/api/guardian/learners/${learner.id}/progress`)).status).toBe(403);
    const listed = await c.get('/api/guardian/learners');
    expect(listed.body.data[0]).toEqual({ linkStatus: 'PENDING', relationship: 'guardian', learner: { id: learner.id, username: 'mia_reads' } });

    const { c: admin } = await adminClient();
    const pending = await admin.get('/api/admin/guardian-links');
    await admin.post(`/api/admin/guardian-links/${pending.body.data[0].id}/verify`);
    expect((await c.get(`/api/guardian/learners/${learner.id}/progress`)).status).toBe(200);
  });

  it('gives the same answer for unknown usernames when requesting a link', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    const res = await c.post('/api/guardian/links').send({ username: 'does_not_exist', relationship: 'parent' });
    expect(res.status).toBe(202);
  });

  it('lets the guardian reset the child password, which signs the child out', async () => {
    const { c } = await guardianWithChild();
    const kid = await signIn('mia_reads', 'Kid-password-12');
    const learnerId = kid.res.body.data.user.id;
    expect((await c.post(`/api/guardian/learners/${learnerId}/password`).send({ password: 'New-kid-pass-34' })).status).toBe(200);
    expect((await kid.c.get('/api/auth/me')).body.data.user).toBeNull();
    expect((await signIn('mia_reads', 'New-kid-pass-34')).res.status).toBe(200);
  });

  it('suspends the learner when learning consent is withdrawn', async () => {
    const { c, learner } = await guardianWithChild();
    await c.post(`/api/guardian/learners/${learner.id}/consents`).send({ type: 'learning_account', granted: false });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe('SUSPENDED');
    expect((await signIn('mia_reads', 'Kid-password-12')).res.status).toBe(403);
  });
});

describe('learner restrictions', () => {
  it('cannot change their own password, opt into marketing, register or reach guardian routes', async () => {
    await guardianWithChild();
    const { c } = await signIn('mia_reads', 'Kid-password-12');
    expect((await c.post('/api/account/password').send({ currentPassword: 'Kid-password-12', newPassword: 'Another-pass-12' })).status).toBe(403);
    expect((await c.patch('/api/account/preferences').send({ newsletterOptIn: true })).status).toBe(403);
    expect((await c.post('/api/registrations').send({ eventId: 'x', consent: true })).status).toBe(403);
    expect((await c.get('/api/guardian/learners')).status).toBe(403);
  });

  it('only ever sees their own progress', async () => {
    const { learner } = await guardianWithChild();
    const mod = await prisma.learningModule.create({ data: { slug: 'm', title: 'M', description: 'd', status: 'PUBLISHED', lessons: { create: { slug: 'l', title: 'L' } } }, include: { lessons: true } });
    await prisma.lessonProgress.create({ data: { learnerId: learner.id, lessonId: mod.lessons[0].id } });
    const other = await makeUser('LEARNER');
    const { c } = await signIn(other.username!);
    const res = await c.get('/api/learning/me');
    expect(res.body.data.totalCompleted).toBe(0);
  });
});

describe('public endpoints never expose child data', () => {
  it('returns no learner, registration or guardian data from public routes', async () => {
    const { parent, learner } = await guardianWithChild();
    const event = await prisma.event.create({
      data: { slug: 'e', title: 'E', summary: 's', description: 'd', startsAt: new Date(Date.now() + 86400000), status: 'PUBLISHED', capacity: 10, registrationOpen: true },
    });
    const program = await prisma.program.create({ data: { slug: 'p', title: 'P', summary: 's', description: 'd', status: 'PUBLISHED' } });
    await prisma.registration.create({ data: { eventId: event.id, registrantId: parent.id, learnerId: learner.id, status: 'CONFIRMED' } });
    await prisma.registration.create({ data: { programId: program.id, registrantId: parent.id, learnerId: learner.id, status: 'CONFIRMED' } });

    const c = client();
    const bodies = await Promise.all(
      ['/api/events', '/api/events/e', '/api/programs', '/api/programs/p', '/api/learning/modules', '/api/site'].map((u) => c.get(u)),
    );
    for (const res of bodies) {
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('Mia');
      expect(text).not.toContain('mia_reads');
      expect(text).not.toContain(parent.email!);
      expect(text).not.toContain(learner.id);
    }
    const ev = bodies[1].body.data;
    expect(ev.spacesLeft).toBe(9);
  });

  it('hides draft programs and events from the public', async () => {
    await prisma.program.create({ data: { slug: 'draft', title: 'Draft', summary: 's', description: 'd', status: 'DRAFT' } });
    expect((await client().get('/api/programs/draft')).status).toBe(404);
    expect((await client().get('/api/programs')).body.data).toHaveLength(0);
  });

  it('does not let visitors reach guardian or learner routes', async () => {
    expect((await client().get('/api/guardian/learners')).status).toBe(401);
    expect((await client().get('/api/learning/me')).status).toBe(401);
    void PASSWORD;
  });
});
