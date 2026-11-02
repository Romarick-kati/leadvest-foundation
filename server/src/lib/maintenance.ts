import { prisma } from './prisma.js';

/** Removes expired sessions, one time tokens and notifications that have run their time. Runs hourly (timer on a server, schedule on Netlify). */
export async function cleanupExpired() {
  const now = new Date();
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const tokens = await prisma.authToken.deleteMany({ where: { expiresAt: { lt: now } } });
  const notifications = await prisma.notification.deleteMany({ where: { expiresAt: { lt: now } } });
  return { sessions: sessions.count, tokens: tokens.count, notifications: notifications.count };
}
