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

/** How long a message stays in the notification bar unless someone chooses otherwise. */
export const DEFAULT_NOTIFICATION_DAYS = 2;
/** The choices offered: 0 means the message stays until the person removes it. */
export const NOTIFICATION_DAY_CHOICES = [0, 1, 2, 7, 30] as const;

const expiryFrom = (now: Date, days: number) => (days > 0 ? new Date(now.getTime() + days * 86_400_000) : null);

/**
 * Puts a message in people's notification bar. It disappears after `n.days` (2 by default), unless a
 * person chose their own time in Settings > Notifications, which always wins for their own bar.
 */
export async function notifyUsers(userIds: string[], n: { title: string; body?: string | null; link?: string | null; kind?: string; days?: number }) {
  if (!userIds.length) return 0;
  const chosen = await prisma.userPreferences.findMany({ where: { userId: { in: userIds }, notificationDays: { not: null } }, select: { userId: true, notificationDays: true } });
  const own = new Map(chosen.map((c) => [c.userId, c.notificationDays as number]));
  const now = new Date();
  const data: Prisma.NotificationCreateManyInput[] = userIds.map((userId) => ({
    userId,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    kind: n.kind ?? 'general',
    expiresAt: expiryFrom(now, own.get(userId) ?? n.days ?? DEFAULT_NOTIFICATION_DAYS),
  }));
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
export async function announce(opts: { audience: Audience; topic: EmailTopic; email: boolean; title: string; body: string; link?: string | null; kind?: string; days?: number }) {
  try {
    const users = await audienceUsers(opts.audience);
    const inApp = await notifyUsers(users.map((u) => u.id), { title: opts.title, body: opts.body, link: opts.link, kind: opts.kind, days: opts.days });
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
