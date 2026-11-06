import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, makeUser, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { bucketKey, bucketKeys } from '../src/modules/admin/analytics.js';

beforeEach(resetDb);

describe('analytics buckets', () => {
  it('uses Cameroon time (UTC+1) for the day', () => {
    expect(bucketKey(new Date('2026-11-02T23:30:00Z'), 'day')).toBe('2026-11-03');
    expect(bucketKey(new Date('2026-11-02T22:30:00Z'), 'day')).toBe('2026-11-02');
  });
  it('groups weeks by their Monday and months by their number', () => {
    expect(bucketKey(new Date('2026-11-05T10:00:00Z'), 'week')).toBe('2026-11-02');
    expect(bucketKey(new Date('2026-11-08T10:00:00Z'), 'week')).toBe('2026-11-02');
    expect(bucketKey(new Date('2026-11-05T10:00:00Z'), 'month')).toBe('2026-11');
  });
  it('lists every period, including quiet ones', () => {
    const keys = bucketKeys(new Date('2026-10-30T10:00:00Z'), new Date('2026-11-02T10:00:00Z'), 'day');
    expect(keys).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

describe('GET /api/admin/analytics', () => {
  it('is for administrators only', async () => {
    expect((await client().get('/api/admin/analytics')).status).toBe(401);
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    expect((await c.get('/api/admin/analytics')).status).toBe(403);
  });

  it('rejects an unknown range', async () => {
    const { c } = await adminClient();
    expect((await c.get('/api/admin/analytics?range=forever')).status).toBe(400);
  });

  it('counts registrations per event and by status, without any personal names', async () => {
    const { c } = await adminClient();
    const parent = await makeUser('PARENT', { displayName: 'Secret Parent Name' });
    const event = await prisma.event.create({ data: { slug: 'fair', title: 'Career fair', summary: 's', description: 'd', startsAt: new Date(Date.now() + 86400000 * 5), status: 'PUBLISHED' } });
    await prisma.registration.create({ data: { eventId: event.id, registrantId: parent.id, status: 'CONFIRMED' } });
    await prisma.registration.create({ data: { eventId: event.id, registrantId: parent.id, status: 'PENDING' } });
    await prisma.registration.create({ data: { eventId: event.id, registrantId: parent.id, status: 'CANCELLED' } });
    const res = await c.get('/api/admin/analytics?range=30');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toMatchObject({ registrations: 3, confirmed: 1, pending: 1, refused: 1 });
    expect(d.byItem[0]).toMatchObject({ title: 'Career fair', kind: 'event', total: 3, confirmed: 1, pending: 1, refused: 1 });
    expect(d.registrationsOverTime).toHaveLength(30);
    expect(d.registrationsOverTime.reduce((n: number, p: { total: number }) => n + p.total, 0)).toBe(3);
    expect(d.byHour).toHaveLength(24);
    expect(d.byWeekday).toHaveLength(7);
    expect(JSON.stringify(d)).not.toContain('Secret Parent Name');
    expect(d.usersByRole.find((r: { role: string }) => r.role === 'PARENT')?.count).toBe(1);
  });

  it('shows which mentor leads which program and how many people joined, with no participant names', async () => {
    const { c } = await adminClient();
    const mentor = await makeUser('INSTRUCTOR', { displayName: 'Mentor Mary' });
    const parent = await makeUser('PARENT', { displayName: 'Hidden Parent' });
    const program = await prisma.program.create({ data: { slug: 'coding', title: 'Coding club', summary: 's', description: 'd', status: 'PUBLISHED' } });
    await prisma.instructorAssignment.create({ data: { programId: program.id, instructorId: mentor.id } });
    await prisma.registration.create({ data: { programId: program.id, registrantId: parent.id, status: 'CONFIRMED' } });
    await prisma.registration.create({ data: { programId: program.id, registrantId: parent.id, status: 'PENDING' } });
    const d = (await c.get('/api/admin/analytics?range=7')).body.data;
    expect(d.mentors).toHaveLength(1);
    expect(d.mentors[0]).toMatchObject({ name: 'Mentor Mary', confirmed: 1, pending: 1, total: 2 });
    expect(d.mentors[0].programs).toEqual([{ id: program.id, title: 'Coding club', confirmed: 1, total: 2 }]);
    expect(JSON.stringify(d)).not.toContain('Hidden Parent');
  });

  it('leaves test payments out of the money totals', async () => {
    const { c } = await adminClient();
    const parent = await makeUser('PARENT');
    const base = { purpose: 'DONATION' as const, provider: 'notchpay', currency: 'XAF', status: 'PAID' as const, userId: parent.id };
    await prisma.payment.create({ data: { ...base, idempotencyKey: 'live-1', amountCents: 500000 } });
    await prisma.payment.create({ data: { ...base, idempotencyKey: 'test-1', amountCents: 900000, isSimulation: true } });
    const d = (await c.get('/api/admin/analytics?range=all')).body.data;
    expect(d.revenue.byCurrency).toEqual([{ currency: 'XAF', amountCents: 500000, count: 1 }]);
  });
});
