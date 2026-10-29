import type { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { sendBulkEmail, emailConfigured } from './email/index.js';
import { announcementEmail } from './email/templates.js';

export type Audience = 'EVERYONE' | 'PARENTS' | 'YOUTH' | 'MEMBERS' | 'INSTRUCTORS' | 'EMAIL_SUBSCRIBERS';
export type EmailTopic = 'programUpdates' | 'eventAnnouncements' | 'newsletterOptIn';

const ROLES: Record<Audience, string[]> = {
  EVERYONE: ['PARENT', 'YOUTH', 'MEMBER', 'INSTRUCTOR'],
  PARENTS: ['PARENT'],
  YOUTH: ['YOUTH'],
  MEMBERS: ['MEMBER'],
  INSTRUCTORS: ['INSTRUCTOR'],
  EMAIL_SUBSCRIBERS: ['PARENT', 'YOUTH', 'MEMBER', 'INSTRUCTOR'],
};

/** Child learner accounts are never sent announcements; their guardian manages communications. */
export async function audienceUsers(audience: Audience) {
  return prisma.user.findMany({
    where: { status: 'ACTIVE', role: { in: ROLES[audience] as never[] } },
    select: { id: true, email: true, displayName: true, emailVerifiedAt: true, preferences: { select: { newsletterOptIn: true, programUpdates: true, eventAnnouncements: true } } },
  });
}

export async function notifyUsers(userIds: string[], n: { title: string; body?: string | null; link?: string | null; kind?: string }) {
  if (!userIds.length) return 0;
  const data: Prisma.NotificationCreateManyInput[] = userIds.map((userId) => ({ userId, title: n.title, body: n.body ?? null, link: n.link ?? null, kind: n.kind ?? 'general' }));
  const r = await prisma.notification.createMany({ data });
  return r.count;
}

export async function notifyAdmins(n: { title: string; body?: string; link?: string }) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
  return notifyUsers(admins.map((a) => a.id), { ...n, kind: 'admin' });
}

/**
 * Tells people about something new: always in their notification bar, and by email only when they
 * chose that topic and their email is confirmed. Never throws; a failed announcement must not
 * break publishing.
 */
export async function announce(opts: { audience: Audience; topic: EmailTopic; email: boolean; title: string; body: string; link?: string | null; kind?: string }) {
  try {
    const users = await audienceUsers(opts.audience);
    const inApp = await notifyUsers(users.map((u) => u.id), { title: opts.title, body: opts.body, link: opts.link, kind: opts.kind });
    let emailed = 0;
    if (opts.email && emailConfigured()) {
      const manage = `${env.publicAppUrl}/settings/notifications`;
      const link = opts.link ? (opts.link.startsWith('/') ? `${env.publicAppUrl}${opts.link}` : opts.link) : null;
      const to = users.filter((u) => u.email && u.emailVerifiedAt && u.preferences?.[opts.topic]);
      emailed = await sendBulkEmail(to.map((u) => announcementEmail(u.email!, u.displayName, opts.title, opts.body, link, manage)));
    }
    return { recipients: inApp, emailed };
  } catch (err) {
    logger.error({ err }, 'announcement failed');
    return { recipients: 0, emailed: 0 };
  }
}
