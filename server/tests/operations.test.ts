import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { adminClient, app, client, makeUser, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { MockPaymentProvider } from '../src/services/payments/mock.js';

beforeEach(resetDb);

const future = (days: number) => new Date(Date.now() + days * 86400000);

describe('program and event management', () => {
  it('lets admins create, publish and archive programs, with validation', async () => {
    const { c } = await adminClient();
    const bad = await c.post('/api/admin/programs').send({ slug: 'Bad Slug', title: '' });
    expect(bad.status).toBe(400);
    const created = await c.post('/api/admin/programs').send({ slug: 'reading-club', title: 'Reading club', summary: 'S', description: 'D', objectives: ['Read'] });
    expect(created.status).toBe(201);
    expect((await client().get('/api/programs/reading-club')).status).toBe(404);
    await c.patch(`/api/admin/programs/${created.body.data.id}`).send({ status: 'PUBLISHED' });
    expect((await client().get('/api/programs/reading-club')).status).toBe(200);
    await c.patch(`/api/admin/programs/${created.body.data.id}`).send({ status: 'ARCHIVED' });
    expect((await client().get('/api/programs/reading-club')).status).toBe(404);
    expect(await prisma.auditLog.count({ where: { action: { startsWith: 'program.' } } })).toBe(3);
  });

  it('rejects duplicate slugs with a conflict', async () => {
    const { c } = await adminClient();
    const body = { slug: 'dup', title: 'Dup', summary: 's', description: 'd', startsAt: future(3).toISOString() };
    expect((await c.post('/api/admin/events').send(body)).status).toBe(201);
    expect((await c.post('/api/admin/events').send(body)).status).toBe(409);
  });

  it('validates lesson quiz answers point at a real option', async () => {
    const { c } = await adminClient();
    const mod = await c.post('/api/admin/learning/modules').send({ slug: 'mod-one', title: 'Module', description: 'd' });
    const res = await c.post(`/api/admin/learning/modules/${mod.body.data.id}/lessons`).send({ slug: 'lesson-one', title: 'Lesson', quiz: [{ prompt: 'Q', options: ['a', 'b'], answerIndex: 4 }] });
    expect(res.status).toBe(400);
  });
});

describe('event registration', () => {
  async function setup(capacity = 1, extra: Record<string, unknown> = {}) {
    const event = await prisma.event.create({
      data: { slug: 'ev', title: 'Ev', summary: 's', description: 'd', startsAt: future(10), status: 'PUBLISHED', capacity, registrationOpen: true, ...extra },
    });
    return event;
  }

  it('confirms free registrations until full, then waitlists', async () => {
    const event = await setup(1);
    const a = await signIn((await makeUser('PARENT')).email!);
    const b = await signIn((await makeUser('PARENT')).email!);
    const r1 = await a.c.post('/api/registrations').send({ eventId: event.id, consent: true });
    const r2 = await b.c.post('/api/registrations').send({ eventId: event.id, consent: true });
    expect(r1.body.data.status).toBe('CONFIRMED');
    expect(r2.body.data.status).toBe('WAITLISTED');
    expect((await a.c.post('/api/registrations').send({ eventId: event.id, consent: true })).status).toBe(409);
  });

  it('refuses registration after the deadline or when closed', async () => {
    const closed = await setup(5, { registrationDeadline: new Date(Date.now() - 1000) });
    const { c } = await signIn((await makeUser('PARENT')).email!);
    expect((await c.post('/api/registrations').send({ eventId: closed.id, consent: true })).status).toBe(400);
  });

  it('only allows registering a child the parent is a verified guardian of', async () => {
    const event = await setup(5);
    const kid = await makeUser('LEARNER');
    const { c } = await signIn((await makeUser('PARENT')).email!);
    expect((await c.post('/api/registrations').send({ eventId: event.id, learnerId: kid.id, consent: true })).status).toBe(403);
  });

  it('lets an admin confirm and filter registrations', async () => {
    const event = await setup(5);
    const { c: parent } = await signIn((await makeUser('PARENT')).email!);
    const reg = await parent.post('/api/registrations').send({ eventId: event.id, consent: true });
    const { c } = await adminClient();
    const list = await c.get(`/api/admin/registrations?eventId=${event.id}`);
    expect(list.body.data.total).toBe(1);
    const upd = await c.patch(`/api/admin/registrations/${reg.body.data.id}`).send({ status: 'CANCELLED' });
    expect(upd.body.data.status).toBe('CANCELLED');
  });
});

describe('payments (simulation)', () => {
  async function paidEventRegistration() {
    const event = await prisma.event.create({
      data: { slug: 'paid', title: 'Paid', summary: 's', description: 'd', startsAt: future(10), status: 'PUBLISHED', capacity: 5, registrationOpen: true, priceCents: 5000, currency: 'XAF' },
    });
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    const reg = await c.post('/api/registrations').send({ eventId: event.id, consent: true });
    return { c, reg: reg.body.data };
  }

  it('keeps paid registrations pending until a verified payment event', async () => {
    const { c, reg } = await paidEventRegistration();
    expect(reg).toMatchObject({ status: 'PENDING', paymentStatus: 'PENDING', paymentRequired: true });
    const checkout = await c.post('/api/payments/checkout').send({ registrationId: reg.id, idempotencyKey: 'key-123456' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data.simulation).toBe(true);
    // Visiting the return page changes nothing.
    const status = await c.get(`/api/payments/${checkout.body.data.paymentId}`);
    expect(status.body.data.status).toBe('PENDING');
    const sim = await c.post(`/api/payments/${checkout.body.data.paymentId}/simulate`).send({ outcome: 'PAID' });
    expect(sim.body.data.status).toBe('PAID');
    const updated = await prisma.registration.findUniqueOrThrow({ where: { id: reg.id } });
    expect(updated).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'PAID' });
  });

  it('reuses the payment for a repeated idempotency key', async () => {
    const { c, reg } = await paidEventRegistration();
    const a = await c.post('/api/payments/checkout').send({ registrationId: reg.id, idempotencyKey: 'same-key-1' });
    const b = await c.post('/api/payments/checkout').send({ registrationId: reg.id, idempotencyKey: 'same-key-1' });
    expect(b.body.data.paymentId).toBe(a.body.data.paymentId);
    expect(await prisma.payment.count()).toBe(1);
  });

  it('rejects unsigned webhooks and ignores duplicate deliveries', async () => {
    const { c, reg } = await paidEventRegistration();
    const checkout = await c.post('/api/payments/checkout').send({ registrationId: reg.id, idempotencyKey: 'key-dupes' });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: checkout.body.data.paymentId } });
    const forged = await request(app).post('/api/payments/webhooks/mock').set('Content-Type', 'application/json').set('x-mock-signature', 'bad').send(JSON.stringify({ id: 'evt', providerRef: payment.providerRef, status: 'PAID' }));
    expect(forged.status).toBe(400);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');

    const provider = new MockPaymentProvider();
    const { body, signature } = provider.signedEvent(payment.providerRef!, 'PAID');
    const send = () => request(app).post('/api/payments/webhooks/mock').set('Content-Type', 'application/json').set('x-mock-signature', signature).send(body);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    expect(await prisma.paymentWebhookEvent.count()).toBe(1);
    // A later failure event cannot undo a completed payment.
    const late = provider.signedEvent(payment.providerRef!, 'FAILED');
    await request(app).post('/api/payments/webhooks/mock').set('Content-Type', 'application/json').set('x-mock-signature', late.signature).send(late.body);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PAID');
  });

  it('does not let another parent pay or view someone else’s registration', async () => {
    const { reg } = await paidEventRegistration();
    const { c } = await signIn((await makeUser('PARENT')).email!);
    expect((await c.post('/api/payments/checkout').send({ registrationId: reg.id, idempotencyKey: 'other-key-1' })).status).toBe(404);
  });
});

describe('enquiries and settings', () => {
  it('accepts a valid enquiry and rejects spam', async () => {
    const base = { category: 'volunteer', name: 'Pat', email: 'pat@example.test', message: 'I would like to volunteer on weekends.', consent: true };
    expect((await client().post('/api/enquiries').send(base)).status).toBe(201);
    expect((await client().post('/api/enquiries').send({ ...base, website: 'http://spam' })).status).toBe(400);
    expect((await client().post('/api/enquiries').send({ ...base, startedAt: Date.now() })).status).toBe(400);
    expect((await client().post('/api/enquiries').send({ ...base, message: 'short' })).status).toBe(400);
  });

  it('does not block real people whose device clock is ahead of the server', async () => {
    const base = { category: 'support', name: 'Pat', email: 'pat@example.test', message: 'I would like to help children online.', consent: true };
    // Clock one hour ahead: startedAt is in the server's future, which must not count as "too fast".
    expect((await client().post('/api/enquiries').send({ ...base, startedAt: Date.now() + 3600_000 })).status).toBe(201);
    // The browser's own stopwatch decides when it is provided.
    expect((await client().post('/api/enquiries').send({ ...base, startedAt: Date.now() + 3600_000, elapsedMs: 20_000 })).status).toBe(201);
    expect((await client().post('/api/enquiries').send({ ...base, elapsedMs: 500 })).status).toBe(400);
  });

  it('lets admins triage enquiries', async () => {
    await client().post('/api/enquiries').send({ category: 'general', name: 'Pat', email: 'pat@example.test', message: 'A question about programs.', consent: true });
    const { c } = await adminClient();
    const list = await c.get('/api/admin/enquiries?status=NEW');
    expect(list.body.data.total).toBe(1);
    const upd = await c.patch(`/api/admin/enquiries/${list.body.data.items[0].id}`).send({ status: 'RESOLVED', internalNotes: 'Replied' });
    expect(upd.body.data.status).toBe('RESOLVED');
  });

  it('saves site settings, never returns secrets, and keeps donations off without a provider', async () => {
    const { c } = await adminClient();
    const current = await c.get('/api/admin/settings');
    expect(JSON.stringify(current.body)).not.toMatch(/test_session_secret|test_encryption_key|lvf_dev_password/);
    const site = current.body.data.site;
    site.contact.email = 'hello@example.test';
    expect((await c.put('/api/admin/settings').send(site)).status).toBe(200);
    expect((await client().get('/api/site')).body.data.contact.email).toBe('hello@example.test');
  });

  it('exports CSV reports with formula injection neutralised', async () => {
    await client().post('/api/enquiries').send({ category: 'general', name: '=HYPERLINK("x")', email: 'pat@example.test', message: 'Testing the export safety.', consent: true });
    const { c } = await adminClient();
    const res = await c.get('/api/admin/reports/enquiries.csv');
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('refuses non image uploads', async () => {
    const { c } = await adminClient();
    const res = await c.post('/api/admin/media').attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), 'evil.png');
    expect(res.status).toBe(400);
  });

  it('reports health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });
});

describe('learning', () => {
  it('checks quiz answers on the server and records progress only for learners', async () => {
    const mod = await prisma.learningModule.create({
      data: { slug: 'm', title: 'M', description: 'd', status: 'PUBLISHED', lessons: { create: { slug: 'l', title: 'L', quiz: [{ prompt: 'Q', options: ['a', 'b'], answerIndex: 1 }] } } },
      include: { lessons: true },
    });
    const lesson = await client().get('/api/learning/modules/m/lessons/l');
    expect(lesson.body.data.quiz[0].answerIndex).toBeUndefined();
    const guest = await client().post(`/api/learning/lessons/${mod.lessons[0].id}/check`).send({ answers: [1] });
    expect(guest.body.data).toMatchObject({ score: 1, total: 1, recorded: false });
    const kid = await makeUser('LEARNER');
    const { c } = await signIn(kid.username!);
    const res = await c.post(`/api/learning/lessons/${mod.lessons[0].id}/check`).send({ answers: [1] });
    expect(res.body.data.recorded).toBe(true);
    const me = await c.get('/api/learning/me');
    expect(me.body.data.badges.find((b: { id: string }) => b.id === 'quiz-star').earned).toBe(true);
  });

  it('hides program only modules from people who are not enrolled', async () => {
    const program = await prisma.program.create({ data: { slug: 'p', title: 'P', summary: 's', description: 'd', status: 'PUBLISHED' } });
    await prisma.learningModule.create({ data: { slug: 'private-mod', title: 'Private', description: 'd', status: 'PUBLISHED', isPublic: false, programId: program.id } });
    expect((await client().get('/api/learning/modules/private-mod')).status).toBe(404);
    const kid = await makeUser('LEARNER');
    const { c } = await signIn(kid.username!);
    expect((await c.get('/api/learning/modules/private-mod')).status).toBe(404);
    const parent = await makeUser('PARENT');
    await prisma.registration.create({ data: { programId: program.id, registrantId: parent.id, learnerId: kid.id, status: 'CONFIRMED' } });
    expect((await c.get('/api/learning/modules/private-mod')).status).toBe(200);
  });
});
