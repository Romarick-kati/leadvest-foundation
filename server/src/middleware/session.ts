import { clientIp } from '../lib/http.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashToken, randomToken } from '../lib/crypto.js';

export const SESSION_COOKIE = env.isProd ? '__Host-lvf_session' : 'lvf_session';

const DAY = 24 * 60 * 60 * 1000;
// Adults stay signed in for 7 days of inactivity, learners for 12 hours.
// A session waiting for a second factor expires after 10 minutes.
const lifetime = (user: User) => (user.role === 'LEARNER' ? DAY / 2 : 7 * DAY);
const PENDING_MFA_LIFETIME = 10 * 60 * 1000;

function cookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    expires,
  };
}

export async function createSession(req: Request, res: Response, user: User, mfaVerified: boolean) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (mfaVerified ? lifetime(user) : PENDING_MFA_LIFETIME));
  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      mfaVerified,
      reauthAt: new Date(),
      ipAddress: clientIp(req),
      userAgent: req.get('user-agent')?.slice(0, 300),
      expiresAt,
    },
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
  return session;
}

export async function completeMfa(res: Response, sessionId: string, user: User) {
  const expiresAt = new Date(Date.now() + lifetime(user));
  await prisma.session.update({
    where: { id: sessionId },
    data: { mfaVerified: true, reauthAt: new Date(), expiresAt },
  });
  const token = res.req.cookies?.[SESSION_COOKIE];
  if (token) res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(new Date(0)), expires: undefined });
}

/** Loads the session (if any) onto req.auth. Never rejects; use requireAuth to enforce. */
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== 'string') return next();
  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || session.user.status !== 'ACTIVE') {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      clearSessionCookie(res);
      return next();
    }
    let { user } = session;
    const { user: _u, ...s } = session;
    // The owner's address (ADMIN_EMAIL) is always an administrator, even for an account that was
    // created through normal sign up first. Needs a verified email so nobody can claim it by typing it in.
    const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (owner && user.email === owner && user.emailVerifiedAt && ['MEMBER', 'PARENT', 'YOUTH', 'LEARNER', 'INSTRUCTOR'].includes(user.role)) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    }
    req.auth = { user, session: s };
    // Sliding expiry, written at most every 5 minutes.
    if (session.mfaVerified && Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      const expiresAt = new Date(Date.now() + lifetime(user));
      await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(), expiresAt } });
      res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
    }
    next();
  } catch (err) {
    next(err);
  }
}
