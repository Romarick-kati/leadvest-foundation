import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { h, send } from '../lib/http.js';
import { randomToken, safeEqual } from '../lib/crypto.js';
import { securityEvent } from '../lib/audit.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { siteUrl } from '../lib/siteUrl.js';
import { authLimiter } from '../middleware/security.js';
import { createSession } from '../middleware/session.js';
import { hashPassword } from './users.js';
import { buildAuthUrl, exchangeCode, verifyIdToken } from './google.js';

export const googleRouter = Router();

const COOKIE = 'lvf_google_oauth';
const COOKIE_PATH = '/api/auth/google';
const MAX_AGE_MS = 10 * 60 * 1000;
const stateKey = crypto.createHash('sha256').update(`google-state:${env.SESSION_SECRET}`).digest();

interface FlowState {
  state: string;
  nonce: string;
  verifier: string;
  intent: 'login' | 'register' | 'link';
  next: string;
  uid?: string;
  at: number;
}

const sign = (v: string) => crypto.createHmac('sha256', stateKey).update(v).digest('base64url');
const pack = (s: FlowState) => {
  const body = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${body}.${sign(body)}`;
};
function unpack(raw: string | undefined): FlowState | null {
  if (!raw) return null;
  const [body, mac] = raw.split('.');
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as FlowState;
    return Date.now() - s.at <= MAX_AGE_MS ? s : null;
  } catch {
    return null;
  }
}

const redirectUri = (req: Request) => env.GOOGLE_REDIRECT_URI ?? `${siteUrl(req)}/api/auth/google/callback`;
// Only paths on this site, never another origin.
const safeNext = (v: unknown) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') && v.length < 300 ? v : '');
const to = (res: Response, path: string) => res.redirect(302, `${siteUrl(res.req)}${path}`);
const fail = (res: Response, code: string, path = '/sign-in') => to(res, `${path}${path.includes('?') ? '&' : '?'}error=google_${code}`);
const clearFlow = (res: Response) => res.clearCookie(COOKIE, { path: COOKIE_PATH, httpOnly: true, secure: env.isProd, sameSite: 'lax' });

/** Lets the sign in screens show the Google button only when it is configured. */
googleRouter.get(
  '/providers',
  h(async (req, res) => send(res, { google: env.googleEnabled, redirectUri: redirectUri(req) })),
);

googleRouter.get(
  '/google/start',
  authLimiter,
  h(async (req: Request, res: Response) => {
    const q = z
      .object({ intent: z.enum(['login', 'register', 'link']).default('login'), next: z.string().optional() })
      .safeParse(req.query);
    if (!q.success) return fail(res, 'failed');
    const { intent } = q.data;
    if (!env.googleEnabled) return fail(res, 'unavailable', intent === 'register' ? '/register' : '/sign-in');
    if (intent === 'link' && !(req.auth && req.auth.session.mfaVerified)) return fail(res, 'signin_first');

    const flow: FlowState = {
      state: randomToken(24),
      nonce: randomToken(24),
      verifier: randomToken(48),
      intent,
      next: safeNext(q.data.next),
      uid: intent === 'link' ? req.auth!.user.id : undefined,
      at: Date.now(),
    };
    res.cookie(COOKIE, pack(flow), { path: COOKIE_PATH, httpOnly: true, secure: env.isProd, sameSite: 'lax', maxAge: MAX_AGE_MS });
    res.redirect(302, buildAuthUrl({ clientId: env.GOOGLE_CLIENT_ID!, redirectUri: redirectUri(req), state: flow.state, nonce: flow.nonce, verifier: flow.verifier }));
  }),
);

googleRouter.get(
  '/google/callback',
  authLimiter,
  h(async (req: Request, res: Response) => {
    const flow = unpack(req.cookies?.[COOKIE]);
    clearFlow(res);
    if (!env.googleEnabled) return fail(res, 'unavailable');
    // Errors return to the screen the flow started from.
    const from = flow?.intent === 'link' ? '/settings/security' : flow?.intent === 'register' ? '/register' : '/sign-in';
    if (typeof req.query.error === 'string') return fail(res, 'cancelled', from);
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!flow || !code || !state || !safeEqual(state, flow.state)) return fail(res, 'expired');

    let identity;
    try {
      const idToken = await exchangeCode({ code, clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, redirectUri: redirectUri(req), verifier: flow.verifier });
      identity = await verifyIdToken(idToken, { clientId: env.GOOGLE_CLIENT_ID!, nonce: flow.nonce });
    } catch (err) {
      // The reason is logged without any token or code.
      logger.warn({ reason: (err as Error).message }, 'google sign in failed');
      return fail(res, 'failed', from);
    }
    if (!identity.emailVerified) return fail(res, 'unverified', from);

    // Linking from Security settings: the same signed in user who started the flow.
    if (flow.intent === 'link') {
      const me = req.auth?.session.mfaVerified ? req.auth.user : null;
      if (!me || me.id !== flow.uid) return fail(res, 'signin_first');
      const other = await prisma.user.findUnique({ where: { googleSub: identity.sub }, select: { id: true } });
      if (other && other.id !== me.id) return fail(res, 'in_use', '/settings/security');
      await prisma.user.update({ where: { id: me.id }, data: { googleSub: identity.sub, googleLinkedAt: new Date() } });
      await securityEvent(req, me.id, 'google_linked');
      return to(res, '/settings/security?google=linked');
    }

    let user = await prisma.user.findUnique({ where: { googleSub: identity.sub } });
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
      if (byEmail) {
        // An email address alone is never enough for staff accounts: administrators and
        // instructors link Google themselves from Security settings after signing in.
        if (!['PARENT', 'YOUTH', 'MEMBER'].includes(byEmail.role)) return fail(res, 'link_required');
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleSub: identity.sub, googleLinkedAt: new Date(), emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() },
        });
        await securityEvent(req, user.id, 'google_linked');
      } else {
        // New account from either the sign in or the sign up screen: one tap, no questions.
        // The person picks how they will use the platform on the next screen. The random password
        // is never shown; they can set one later with "Forgot password". Account, preferences and
        // consent are saved together.
        const passwordHash = await hashPassword(randomToken(32));
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email: identity.email,
              displayName: identity.name ?? identity.email.split('@')[0].slice(0, 80),
              passwordHash,
              role: 'MEMBER',
              emailVerifiedAt: new Date(),
              googleSub: identity.sub,
              googleLinkedAt: new Date(),
              preferences: { create: {} },
            },
          });
          await tx.consentRecord.create({ data: { giverId: created.id, type: 'website_terms', policyVersion: 'draft', granted: true } });
          return created;
        });
        await securityEvent(req, user.id, 'registered_google');
      }
    }

    if (user.status !== 'ACTIVE') return fail(res, 'inactive');
    const mfaRequired = Boolean(user.totpEnabledAt);
    await createSession(req, res, user, !mfaRequired);
    const next = flow.next ? `?next=${encodeURIComponent(flow.next)}` : '';
    if (mfaRequired) return to(res, `/sign-in/verify${next}`);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await securityEvent(req, user.id, 'sign_in_google');
    return to(res, `/sign-in/complete${next}`);
  }),
);
