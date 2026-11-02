import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, makeUser, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { cleanupExpired } from '../src/lib/maintenance.js';

beforeEach(resetDb);

const DAY = 86_400_000;
const daysFromNow = (d: Date | null) => (d ? Math.round((d.getTime() - Date.now()) / DAY) : null);

describe('notifications disappear after a set time', () => {
  it('uses 2 days by default, and the admin can choose another time per announcement', async () => {
    const parent = await makeUser('PARENT');
    const { c: admin } = await adminClient();

    const standard = await admin.post('/api/admin/broadcasts').send({ title: 'Holiday camp', body: 'Registration is open.', audience: 'PARENTS', sendEmail: false });
    expect(standard.status).toBe(201);
    expect(standard.body.data.expiresInDays).toBe(2);
    let n = await prisma.notification.findFirstOrThrow({ where: { userId: parent.id, title: 'Holiday camp' } });
    expect(daysFromNow(n.expiresAt)).toBe(2);

    await admin.post('/api/admin/broadcasts').send({ title: 'Closing date', body: 'Please read.', audience: 'PARENTS', sendEmail: false, expiresInDays: 7 });
    n = await prisma.notification.findFirstOrThrow({ where: { userId: parent.id, title: 'Closing date' } });
    expect(daysFromNow(n.expiresAt)).toBe(7);

    await admin.post('/api/admin/broadcasts').send({ title: 'Keep me', body: 'Stays.', audience: 'PARENTS', sendEmail: false, expiresInDays: 0 });
    n = await prisma.notification.findFirstOrThrow({ where: { userId: parent.id, title: 'Keep me' } });
    expect(n.expiresAt).toBeNull();

    const bad = await admin.post('/api/admin/broadcasts').send({ title: 'Odd time', body: 'Nope.', audience: 'PARENTS', sendEmail: false, expiresInDays: 3 });
    expect(bad.status).toBe(400);
  });

  it('lets a person choose their own time, which wins for their own bar', async () => {
    const parent = await makeUser('PARENT');
    const { c: admin } = await adminClient();
    const { c } = await signIn(parent.email!);

    expect((await c.patch('/api/account/preferences').send({ notificationDays: 30 })).status).toBe(200);
    await admin.post('/api/admin/broadcasts').send({ title: 'Long', body: 'Stays a month for this person.', audience: 'PARENTS', sendEmail: false, expiresInDays: 1 });
    const n = await prisma.notification.findFirstOrThrow({ where: { userId: parent.id, title: 'Long' } });
    expect(daysFromNow(n.expiresAt)).toBe(30);

    expect((await c.patch('/api/account/preferences').send({ notificationDays: 5 })).status).toBe(400);
  });

  it('applies a changed choice to messages already in the bar', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    await prisma.notification.create({ data: { userId: parent.id, title: 'Old news', expiresAt: new Date(Date.now() + DAY) } });
    await c.patch('/api/account/preferences').send({ notificationDays: 7 });
    expect(daysFromNow((await prisma.notification.findFirstOrThrow({ where: { userId: parent.id } })).expiresAt)).toBe(7);
    await c.patch('/api/account/preferences').send({ notificationDays: 0 });
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: parent.id } })).expiresAt).toBeNull();
    await c.patch('/api/account/preferences').send({ notificationDays: null });
    expect(daysFromNow((await prisma.notification.findFirstOrThrow({ where: { userId: parent.id } })).expiresAt)).toBe(2);
  });

  it('hides expired messages at once and removes them for good on cleanup', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    await prisma.notification.createMany({
      data: [
        { userId: parent.id, title: 'Expired', expiresAt: new Date(Date.now() - 1000) },
        { userId: parent.id, title: 'Fresh', expiresAt: new Date(Date.now() + DAY) },
        { userId: parent.id, title: 'Never', expiresAt: null },
      ],
    });
    const list = await c.get('/api/account/notifications');
    expect(list.body.data.items.map((i: { title: string }) => i.title).sort()).toEqual(['Fresh', 'Never']);
    expect(list.body.data.unread).toBe(2);
    const result = await cleanupExpired();
    expect(result.notifications).toBe(1);
    expect(await prisma.notification.count({ where: { userId: parent.id } })).toBe(2);
  });
});
