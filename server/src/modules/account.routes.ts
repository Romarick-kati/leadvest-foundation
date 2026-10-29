import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, h, notFound, send } from '../lib/http.js';
import { emailSchema, nameSchema, parse, passwordSchema } from '../lib/validate.js';
import { audit, securityEvent } from '../lib/audit.js';
import { imageUpload, removeStored, storeImage } from '../lib/uploads.js';
import { requireAuth } from '../middleware/auth.js';
import { mfaLimiter } from '../middleware/security.js';
import { clearSessionCookie } from '../middleware/session.js';
import { hashPassword, selfView, verifyPassword } from './users.js';
import {
  beginSetup,
  confirmSetup,
  disableTwoFactor,
  generateRecoveryCodes,
  remainingRecoveryCodes,
  verifySecondFactor,
} from './twoFactor.js';
import { appLink, issueToken } from './tokens.js';
import { sendEmail } from '../services/email/index.js';
import { templates } from '../services/email/templates.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

async function requirePassword(userId: string, password: unknown) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (typeof password !== 'string' || !(await verifyPassword(user.passwordHash, password))) {
    throw new ApiError(401, 'reauth_failed', 'Your current password is not right.', { currentPassword: 'Your current password is not right.' });
  }
  return user;
}

async function notifySecurity(userId: string, what: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { preferences: true } });
  if (user?.email && (user.preferences?.securityAlerts ?? true)) {
    await sendEmail(templates.securityAlert(user.email, user.displayName, what));
  }
}

/* Profile */

accountRouter.get(
  '/profile',
  h(async (req, res) => {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId: req.auth!.user.id } });
    send(res, selfView(req.auth!.user, prefs));
  }),
);

accountRouter.patch(
  '/profile',
  h(async (req, res) => {
    const body = parse(z.object({ displayName: nameSchema }), req.body);
    const user = await prisma.user.update({ where: { id: req.auth!.user.id }, data: { displayName: body.displayName } });
    send(res, selfView(user));
  }),
);

accountRouter.post(
  '/profile/avatar',
  imageUpload.single('file'),
  h(async (req, res) => {
    if (req.auth!.user.role === 'LEARNER') throw badRequest('Profile pictures are not available for learner accounts.');
    const stored = await storeImage(req.file, 'public', 'avatars');
    const previous = req.auth!.user.avatarUrl;
    const user = await prisma.user.update({ where: { id: req.auth!.user.id }, data: { avatarUrl: stored.url } });
    if (previous?.startsWith('/uploads/')) await removeStored(previous.replace('/uploads/', ''), 'public');
    send(res, selfView(user));
  }),
);

accountRouter.delete(
  '/profile/avatar',
  h(async (req, res) => {
    const previous = req.auth!.user.avatarUrl;
    const user = await prisma.user.update({ where: { id: req.auth!.user.id }, data: { avatarUrl: null } });
    if (previous?.startsWith('/uploads/')) await removeStored(previous.replace('/uploads/', ''), 'public');
    send(res, selfView(user));
  }),
);

/* Google sign in: unlinking (linking starts at /api/auth/google/start?intent=link) */

accountRouter.post(
  '/google/unlink',
  h(async (req, res) => {
    const user = req.auth!.user;
    await prisma.user.update({ where: { id: user.id }, data: { googleSub: null, googleLinkedAt: null } });
    await securityEvent(req, user.id, 'google_unlinked');
    send(res, { linked: false });
  }),
);

/* Preferences: accessibility, notifications, privacy */

const prefsSchema = z
  .object({
    reduceMotion: z.boolean(),
    textSize: z.enum(['standard', 'large', 'larger']),
    underlineLinks: z.boolean(),
    accent: z.enum(['blue', 'teal', 'violet', 'rose', 'orange', 'green']),
    newsletterOptIn: z.boolean(),
    eventAnnouncements: z.boolean(),
    programUpdates: z.boolean(),
    securityAlerts: z.boolean(),
    showProfilePhoto: z.boolean(),
    theme: z.enum(['system', 'light', 'dark']),
    language: z.enum(['en', 'fr', 'es', 'pt']),
  })
  .partial()
  .strict();

accountRouter.get(
  '/preferences',
  h(async (req, res) => {
    const prefs = await prisma.userPreferences.upsert({
      where: { userId: req.auth!.user.id },
      create: { userId: req.auth!.user.id },
      update: {},
    });
    send(res, prefs);
  }),
);

accountRouter.patch(
  '/preferences',
  h(async (req, res) => {
    const body = parse(prefsSchema, req.body);
    const user = req.auth!.user;
    // Learners cannot opt in to optional communications; guardians manage those settings.
    if (user.role === 'LEARNER' && (body.newsletterOptIn || body.eventAnnouncements || body.programUpdates)) {
      throw new ApiError(403, 'forbidden', 'A parent or guardian manages these settings.');
    }
    const prefs = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...body },
      update: body,
    });
    send(res, prefs);
  }),
);

/* Choosing how the account is used. New members pick once; they can switch later if it is safe. */

accountRouter.post(
  '/choose-role',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (!['MEMBER', 'PARENT', 'YOUTH'].includes(user.role)) throw new ApiError(403, 'forbidden', 'This account type cannot be changed here.');
    const body = parse(z.object({ role: z.enum(['YOUTH', 'PARENT']), confirmAge: z.boolean().optional() }), req.body);
    if (body.role === 'YOUTH' && body.confirmAge !== true) {
      throw new ApiError(400, 'age_required', 'Please confirm that you are 16 or older to join as a learner. If you are younger, ask a parent or guardian to create your account.', { confirmAge: 'Please confirm that you are 16 or older.' });
    }
    if (user.role === body.role) return send(res, { user: selfView(user) });
    if (user.role === 'PARENT') {
      const linked = await prisma.guardianLink.count({ where: { guardianId: user.id } });
      if (linked > 0) throw badRequest('Your account has children linked to it, so it must stay a parent or guardian account.');
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: body.role,
        ...(body.role === 'YOUTH' ? { learnerProfile: { upsert: { create: {}, update: {} } } } : {}),
      },
      include: { preferences: true },
    });
    if (body.role === 'YOUTH') {
      await prisma.consentRecord.create({ data: { giverId: user.id, type: 'youth_self_registration_16plus', policyVersion: 'draft', granted: true } });
    }
    await securityEvent(req, user.id, `role_chosen_${body.role.toLowerCase()}`);
    send(res, { user: selfView(updated, updated.preferences) });
  }),
);

/* Learning preferences (learner accounts) */

accountRouter.get(
  '/learning',
  h(async (req, res) => {
    if (req.auth!.user.role !== 'LEARNER' && req.auth!.user.role !== 'YOUTH') throw notFound();
    const profile = await prisma.learnerProfile.upsert({
      where: { userId: req.auth!.user.id },
      create: { userId: req.auth!.user.id },
      update: {},
    });
    send(res, profile);
  }),
);

accountRouter.patch(
  '/learning',
  h(async (req, res) => {
    if (req.auth!.user.role !== 'LEARNER' && req.auth!.user.role !== 'YOUTH') throw notFound();
    const body = parse(
      z.object({ learningLevel: z.enum(['starter', 'explorer', 'leader']), readAloud: z.boolean(), largerText: z.boolean() }).partial().strict(),
      req.body,
    );
    const profile = await prisma.learnerProfile.upsert({
      where: { userId: req.auth!.user.id },
      create: { userId: req.auth!.user.id, ...body },
      update: body,
    });
    send(res, profile);
  }),
);

/* Account */

accountRouter.post(
  '/password',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (user.role === 'LEARNER') throw new ApiError(403, 'forbidden', 'A parent or guardian can change this password for you.');
    const body = parse(z.object({ currentPassword: z.string().max(200), newPassword: passwordSchema }), req.body);
    await requirePassword(user.id, body.currentPassword);
    if (body.currentPassword === body.newPassword) throw badRequest('Choose a password you have not just used.', { newPassword: 'Choose a different password.' });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword), passwordChangedAt: new Date() },
    });
    // Keep this session, sign out all others.
    await prisma.session.deleteMany({ where: { userId: user.id, id: { not: req.auth!.session.id } } });
    await securityEvent(req, user.id, 'password_changed');
    await notifySecurity(user.id, 'Your password was changed.');
    send(res, { changed: true });
  }),
);

accountRouter.post(
  '/email',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (!user.email) throw badRequest('This account does not use an email address.');
    const body = parse(z.object({ currentPassword: z.string().max(200), email: emailSchema }), req.body);
    await requirePassword(user.id, body.currentPassword);
    const taken = await prisma.user.findUnique({ where: { email: body.email } });
    if (taken && taken.id !== user.id) throw new ApiError(409, 'email_in_use', 'That email is already used by another account.');
    const oldEmail = user.email;
    const updated = await prisma.user.update({ where: { id: user.id }, data: { email: body.email, emailVerifiedAt: null } });
    const token = await issueToken(user.id, 'EMAIL_VERIFICATION');
    const result = await sendEmail(templates.verifyEmail(body.email, user.displayName, appLink('/verify-email', token)));
    await sendEmail(templates.securityAlert(oldEmail, user.displayName, `The email address on your account was changed to ${body.email}.`));
    await securityEvent(req, user.id, 'email_changed');
    send(res, { user: selfView(updated), verificationEmailDelivered: result.delivered });
  }),
);

accountRouter.post(
  '/deactivate',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (user.role === 'LEARNER') throw new ApiError(403, 'forbidden', 'A parent or guardian manages this account.');
    const body = parse(z.object({ currentPassword: z.string().max(200), confirm: z.literal('DEACTIVATE') }), req.body);
    await requirePassword(user.id, body.currentPassword);
    if (user.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: user.id } } });
      if (otherAdmins === 0) throw badRequest('You are the only active administrator. Add another administrator first.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: 'DEACTIVATED' } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await audit(req, 'account.deactivate_self', { type: 'user', id: user.id });
    clearSessionCookie(res);
    send(res, { deactivated: true });
  }),
);

/* Sessions */

accountRouter.get(
  '/sessions',
  h(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { userId: req.auth!.user.id, mfaVerified: true, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true },
    });
    send(res, sessions.map((s) => ({ ...s, current: s.id === req.auth!.session.id })));
  }),
);

accountRouter.delete(
  '/sessions/:id',
  h(async (req, res) => {
    const result = await prisma.session.deleteMany({ where: { id: req.params.id, userId: req.auth!.user.id } });
    if (result.count === 0) throw notFound('Session not found.');
    if (req.params.id === req.auth!.session.id) clearSessionCookie(res);
    send(res, { revoked: true });
  }),
);

accountRouter.post(
  '/sessions/revoke-others',
  h(async (req, res) => {
    const result = await prisma.session.deleteMany({ where: { userId: req.auth!.user.id, id: { not: req.auth!.session.id } } });
    await securityEvent(req, req.auth!.user.id, 'signed_out_other_sessions');
    send(res, { revoked: result.count });
  }),
);

/* Security overview and two factor authentication */

accountRouter.get(
  '/security',
  h(async (req, res) => {
    const user = req.auth!.user;
    const [codesLeft, events] = await Promise.all([
      remainingRecoveryCodes(user.id),
      prisma.securityEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10, select: { type: true, createdAt: true, userAgent: true } }),
    ]);
    send(res, {
      twoFactorEnabled: Boolean(user.totpEnabledAt),
      twoFactorEnabledAt: user.totpEnabledAt,
      twoFactorAvailable: user.role !== 'LEARNER',
      recoveryCodesRemaining: user.totpEnabledAt ? codesLeft : 0,
      passwordChangedAt: user.passwordChangedAt,
      recentEvents: events,
    });
  }),
);

accountRouter.post(
  '/2fa/setup',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (user.role === 'LEARNER') throw new ApiError(403, 'forbidden', 'Learner accounts are protected by a parent or guardian instead.');
    if (user.totpEnabledAt) throw badRequest('Two factor authentication is already on.');
    const body = parse(z.object({ currentPassword: z.string().max(200) }), req.body);
    const fresh = await requirePassword(user.id, body.currentPassword);
    send(res, await beginSetup(fresh));
  }),
);

accountRouter.post(
  '/2fa/enable',
  mfaLimiter,
  h(async (req, res) => {
    const body = parse(z.object({ code: z.string().trim().min(6).max(10) }), req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.user.id } });
    if (user.totpEnabledAt) throw badRequest('Two factor authentication is already on.');
    if (!user.totpPendingSecretEnc) throw badRequest('Start setup again to get a new QR code.');
    const codes = await confirmSetup(user, body.code);
    if (!codes) throw new ApiError(400, 'invalid_code', 'That code did not match. Check the time on your phone and try the newest code.', { code: 'That code did not match.' });
    await securityEvent(req, user.id, 'mfa_enabled');
    await audit(req, 'security.mfa_enabled', { type: 'user', id: user.id });
    await notifySecurity(user.id, 'Two factor authentication was turned on for your account.');
    send(res, { enabled: true, recoveryCodes: codes });
  }),
);

accountRouter.post(
  '/2fa/disable',
  mfaLimiter,
  h(async (req, res) => {
    const body = parse(
      z.object({ currentPassword: z.string().max(200), code: z.string().trim().max(10).optional(), recoveryCode: z.string().trim().max(20).optional() }),
      req.body,
    );
    const user = await requirePassword(req.auth!.user.id, body.currentPassword);
    if (!user.totpEnabledAt) throw badRequest('Two factor authentication is not on.');
    const check = await verifySecondFactor(user, body);
    if (!check.ok) throw new ApiError(400, 'invalid_code', 'That code did not work.', { code: 'That code did not work.' });
    await disableTwoFactor(user.id);
    await securityEvent(req, user.id, 'mfa_disabled');
    await audit(req, 'security.mfa_disabled', { type: 'user', id: user.id });
    await notifySecurity(user.id, 'Two factor authentication was turned off for your account.');
    send(res, { enabled: false });
  }),
);

accountRouter.post(
  '/2fa/recovery-codes',
  mfaLimiter,
  h(async (req, res) => {
    const body = parse(z.object({ currentPassword: z.string().max(200), code: z.string().trim().max(10) }), req.body);
    const user = await requirePassword(req.auth!.user.id, body.currentPassword);
    if (!user.totpEnabledAt) throw badRequest('Turn on two factor authentication first.');
    const check = await verifySecondFactor(user, { code: body.code });
    if (!check.ok) throw new ApiError(400, 'invalid_code', 'That code did not work.', { code: 'That code did not work.' });
    const codes = await generateRecoveryCodes(user.id);
    await securityEvent(req, user.id, 'recovery_codes_regenerated');
    send(res, { recoveryCodes: codes });
  }),
);

/* Privacy: consent and data requests */

accountRouter.get(
  '/consents',
  h(async (req, res) => {
    const records = await prisma.consentRecord.findMany({
      where: { giverId: req.auth!.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, type: true, policyVersion: true, granted: true, subjectId: true, createdAt: true },
    });
    send(res, records);
  }),
);

accountRouter.get(
  '/data-requests',
  h(async (req, res) => {
    send(res, await prisma.dataRequest.findMany({ where: { userId: req.auth!.user.id }, orderBy: { createdAt: 'desc' } }));
  }),
);

accountRouter.post(
  '/data-requests',
  h(async (req, res) => {
    if (req.auth!.user.role === 'LEARNER') throw new ApiError(403, 'forbidden', 'A parent or guardian can make this request.');
    const body = parse(
      z.object({ type: z.enum(['EXPORT', 'CORRECTION', 'DELETION']), details: z.string().trim().max(2000).optional() }),
      req.body,
    );
    const open = await prisma.dataRequest.count({ where: { userId: req.auth!.user.id, type: body.type, status: { in: ['OPEN', 'IN_PROGRESS'] } } });
    if (open > 0) throw new ApiError(409, 'conflict', 'You already have an open request of this type.');
    const request = await prisma.dataRequest.create({ data: { userId: req.auth!.user.id, type: body.type, details: body.details } });
    await audit(req, 'privacy.data_request_created', { type: 'data_request', id: request.id }, { requestType: body.type });
    send(res, request, 201);
  }),
);

/** Self service copy of the account's own data. Excludes all authentication secrets. */
accountRouter.get(
  '/export',
  h(async (req, res) => {
    const id = req.auth!.user.id;
    const [user, prefs, consents, registrations, enquiries, progress] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id } }),
      prisma.userPreferences.findUnique({ where: { userId: id } }),
      prisma.consentRecord.findMany({ where: { giverId: id } }),
      prisma.registration.findMany({ where: { registrantId: id }, include: { event: { select: { title: true } }, program: { select: { title: true } } } }),
      req.auth!.user.email ? prisma.enquiry.findMany({ where: { email: req.auth!.user.email }, select: { category: true, subject: true, message: true, createdAt: true } }) : [],
      prisma.lessonProgress.findMany({ where: { learnerId: id }, include: { lesson: { select: { title: true } } } }),
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="my-lead-vest-data.json"');
    send(res, { exportedAt: new Date(), account: selfView(user, prefs), preferences: prefs, consents, registrations, enquiries, learningProgress: progress });
  }),
);

/* Notification bar */

accountRouter.get(
  '/notifications',
  h(async (req, res) => {
    const userId = req.auth!.user.id;
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    send(res, { items, unread });
  }),
);

accountRouter.post(
  '/notifications/read-all',
  h(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.auth!.user.id, readAt: null }, data: { readAt: new Date() } });
    send(res, { ok: true });
  }),
);

accountRouter.post(
  '/notifications/:id/read',
  h(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.auth!.user.id, readAt: null }, data: { readAt: new Date() } });
    send(res, { ok: true });
  }),
);
