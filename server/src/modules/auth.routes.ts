import { Router } from 'express';
import { z } from 'zod';
import { notifyAdmins } from '../services/notify.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, h, send } from '../lib/http.js';
import { emailSchema, nameSchema, parse, passwordSchema } from '../lib/validate.js';
import { securityEvent } from '../lib/audit.js';
import { authLimiter, emailLimiter, mfaLimiter } from '../middleware/security.js';
import { clearSessionCookie, completeMfa, createSession } from '../middleware/session.js';
import { requireAuth } from '../middleware/auth.js';
import { burnPasswordCheck, hashPassword, selfView, verifyPassword } from './users.js';
import { verifySecondFactor } from './twoFactor.js';
import { appLink, consumeToken, issueToken } from './tokens.js';
import { sendEmail } from '../services/email/index.js';
import { templates } from '../services/email/templates.js';

export const authRouter = Router();

const MAX_FAILED = 10;
const LOCK_MINUTES = 15;
const GENERIC_LOGIN_ERROR = 'That sign in name or password is not right.';

async function sendVerification(user: { id: string; email: string | null; displayName: string }) {
  if (!user.email) return { delivered: false, transport: 'none' };
  const token = await issueToken(user.id, 'EMAIL_VERIFICATION');
  return sendEmail(templates.verifyEmail(user.email, user.displayName, appLink('/verify-email', token)));
}

// Public self registration is one short form. The person chooses how they will use the platform
// after signing in (POST /account/choose-role). Instructors and administrators are invited by an
// administrator. Child accounts (under 16) are created by a guardian.
authRouter.post(
  '/register',
  authLimiter,
  h(async (req, res) => {
    const body = parse(
      z.object({
        displayName: nameSchema,
        email: emailSchema,
        password: passwordSchema,
        acceptTerms: z.literal(true, { error: 'Please accept the terms to continue.' }),
      }),
      req.body,
    );
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      // Avoid revealing whether the email is registered beyond what a reset flow would.
      throw new ApiError(409, 'email_in_use', 'An account with this email already exists. Try signing in or resetting your password.');
    }
    const user = await prisma.user.create({
      data: {
        email: body.email,
        displayName: body.displayName,
        passwordHash: await hashPassword(body.password),
        role: 'MEMBER',
        preferences: { create: {} },
      },
      include: { preferences: true },
    });
    await prisma.consentRecord.create({
      data: { giverId: user.id, type: 'website_terms', policyVersion: 'draft', granted: true },
    });
    const email = await sendVerification(user);
    await notifyAdmins({ title: 'New registration', body: `${user.displayName} (${user.email}) just created an account.`, link: `/admin/users/${user.id}` }).catch(() => undefined);
    await createSession(req, res, user, true);
    send(res, { user: selfView(user, user.preferences), verificationEmailDelivered: email.delivered }, 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  h(async (req, res) => {
    const body = parse(
      z.object({ identifier: z.string().trim().min(1, 'Enter your email or username.').max(254), password: z.string().min(1, 'Enter your password.').max(200) }),
      req.body,
    );
    const identifier = body.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: identifier.includes('@') ? { email: identifier } : { username: identifier },
      include: { preferences: true },
    });
    if (!user) {
      await burnPasswordCheck(body.password);
      throw new ApiError(401, 'invalid_credentials', GENERIC_LOGIN_ERROR);
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(429, 'locked', `Too many attempts. Please try again in ${LOCK_MINUTES} minutes or reset your password.`);
    }
    const valid = await verifyPassword(user.passwordHash, body.password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed >= MAX_FAILED ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : undefined,
        },
      });
      if (failed >= MAX_FAILED) await securityEvent(req, user.id, 'account_locked');
      throw new ApiError(401, 'invalid_credentials', GENERIC_LOGIN_ERROR);
    }
    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, 'inactive', 'This account is not active. Please contact the foundation.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

    // The owner's address (ADMIN_EMAIL) always opens the admin side: an account that was created
    // earlier through normal sign-up is upgraded once its email is verified and the password is right.
    const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (ownerEmail && user.email === ownerEmail && ['MEMBER', 'PARENT', 'YOUTH'].includes(user.role) && user.emailVerifiedAt) {
      const upgraded = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' }, include: { preferences: true } });
      await prisma.auditLog.create({ data: { action: 'user.promoted_on_login', targetType: 'user', targetId: user.id, metadata: { from: user.role, to: 'ADMIN' } } });
      Object.assign(user, upgraded);
    }

    const mfaRequired = Boolean(user.totpEnabledAt);
    await createSession(req, res, user, !mfaRequired);
    if (mfaRequired) return send(res, { mfaRequired: true });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await securityEvent(req, user.id, 'sign_in');
    send(res, { mfaRequired: false, user: selfView(user, user.preferences) });
  }),
);

authRouter.post(
  '/2fa',
  mfaLimiter,
  h(async (req, res) => {
    if (!req.auth) throw new ApiError(401, 'unauthorized', 'Your sign in has expired. Please start again.');
    if (req.auth.session.mfaVerified) return send(res, { user: selfView(req.auth.user) });
    const body = parse(
      z.object({ code: z.string().trim().max(10).optional(), recoveryCode: z.string().trim().max(20).optional() }).refine(
        (b) => b.code || b.recoveryCode,
        { message: 'Enter a code.', path: ['code'] },
      ),
      req.body,
    );
    const { user, session } = req.auth;
    const result = await verifySecondFactor(user, body);
    if (!result.ok) {
      await securityEvent(req, user.id, 'mfa_failed');
      throw new ApiError(401, 'invalid_code', 'That code did not work. Check your authenticator app and try again.');
    }
    await completeMfa(res, session.id, user);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await securityEvent(req, user.id, result.usedRecovery ? 'sign_in_recovery_code' : 'sign_in_mfa');
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: user.id } });
    send(res, { user: selfView(user, prefs), usedRecoveryCode: result.usedRecovery });
  }),
);

authRouter.post(
  '/logout',
  h(async (req, res) => {
    if (req.auth) await prisma.session.delete({ where: { id: req.auth.session.id } }).catch(() => undefined);
    clearSessionCookie(res);
    send(res, { signedOut: true });
  }),
);

authRouter.get(
  '/me',
  h(async (req, res) => {
    if (!req.auth) return send(res, { user: null, mfaPending: false });
    if (!req.auth.session.mfaVerified) return send(res, { user: null, mfaPending: true });
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: req.auth.user.id } });
    send(res, { user: selfView(req.auth.user, prefs), mfaPending: false });
  }),
);

authRouter.post(
  '/verify-email',
  h(async (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(10).max(200) }), req.body);
    const userId = await consumeToken(token, 'EMAIL_VERIFICATION');
    if (!userId) throw badRequest('This link is invalid or has expired. Request a new one from your account settings.');
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    send(res, { verified: true });
  }),
);

authRouter.post(
  '/resend-verification',
  emailLimiter,
  requireAuth,
  h(async (req, res) => {
    const user = req.auth!.user;
    if (user.emailVerifiedAt || !user.email) return send(res, { alreadyVerified: true, delivered: false });
    const result = await sendVerification(user);
    send(res, { alreadyVerified: false, delivered: result.delivered });
  }),
);

authRouter.post(
  '/forgot-password',
  emailLimiter,
  h(async (req, res) => {
    const { email } = parse(z.object({ email: emailSchema }), req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') {
      const token = await issueToken(user.id, 'PASSWORD_RESET');
      await sendEmail(templates.passwordReset(email, user.displayName, appLink('/reset-password', token)));
    }
    // Same response whether or not the account exists.
    send(res, { message: 'If an account exists for that email, we have sent instructions to reset the password.' });
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  h(async (req, res) => {
    const body = parse(z.object({ token: z.string().min(10).max(200), password: passwordSchema }), req.body);
    const userId = await consumeToken(body.token, 'PASSWORD_RESET');
    if (!userId) throw badRequest('This reset link is invalid or has expired. Please request a new one.');
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(body.password),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        // A reset link sent to the address proves control of it.
        emailVerifiedAt: before.emailVerifiedAt ?? new Date(),
      },
    });
    // Sign out everywhere. Two factor stays on: the next sign in still needs the second factor.
    await prisma.session.deleteMany({ where: { userId } });
    await securityEvent(req, userId, 'password_reset');
    if (user.email) await sendEmail(templates.securityAlert(user.email, user.displayName, 'Your password was reset.'));
    send(res, { reset: true, twoFactorStillRequired: Boolean(user.totpEnabledAt) });
  }),
);
