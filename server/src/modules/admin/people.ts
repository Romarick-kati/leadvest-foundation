import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError, badRequest, h, notFound, pageResult, paginate, send } from '../../lib/http.js';
import { emailSchema, nameSchema, parse } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { randomToken } from '../../lib/crypto.js';
import { adminView, hashPassword } from '../users.js';
import { grantAccess, revokeAccess } from '../../services/access.js';
import { announce, type Audience } from '../../services/notify.js';
import { appLink, issueToken } from '../tokens.js';
import { sendEmail } from '../../services/email/index.js';
import { templates } from '../../services/email/templates.js';

export const adminPeopleRouter = Router();

const roleSchema = z.enum(['PARENT', 'LEARNER', 'YOUTH', 'MEMBER', 'INSTRUCTOR', 'ADMIN']);

adminPeopleRouter.get(
  '/users',
  h(async (req, res) => {
    const query = parse(
      z.object({ q: z.string().trim().max(100).optional(), role: roleSchema.optional(), status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(), recent: z.enum(['1']).optional() }),
      req.query,
    );
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.recent ? { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } : {}),
      ...(query.q
        ? {
            OR: [
              { displayName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { username: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);
    send(res, pageResult(items.map(adminView), total, page, pageSize));
  }),
);

adminPeopleRouter.get(
  '/users/:id',
  h(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { include: { program: { select: { id: true, title: true } } } },
        guardianOf: { include: { learner: { select: { id: true, displayName: true, username: true } } } },
        guardedBy: { include: { guardian: { select: { id: true, displayName: true, email: true } } } },
      },
    });
    if (!user) throw notFound();
    await audit(req, 'user.viewed', { type: 'user', id: user.id });
    send(res, {
      ...adminView(user),
      assignments: user.assignments.map((a) => a.program),
      learners: user.guardianOf.map((l) => ({ ...l.learner, linkStatus: l.status })),
      guardians: user.guardedBy.map((l) => ({ ...l.guardian, linkStatus: l.status, linkId: l.id })),
    });
  }),
);

/** Free access for someone (a scholarship, a partner, a tester), or taking it away again. */
adminPeopleRouter.post(
  '/users/:id/access',
  h(async (req, res) => {
    const body = parse(z.object({ action: z.enum(['grant_lifetime', 'grant_days', 'revoke']), days: z.number().int().min(1).max(3650).optional() }), req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound();
    if (!['PARENT', 'YOUTH'].includes(target.role)) throw badRequest('Access can only be changed for parent and young person accounts. Children follow their guardian.');
    if (body.action === 'grant_days' && !body.days) throw badRequest('Say how many days.');
    await prisma.$transaction(async (tx) => {
      if (body.action === 'revoke') await revokeAccess(tx, target.id);
      else await grantAccess(tx, target.id, body.action === 'grant_lifetime' ? { lifetime: true } : { days: body.days });
    });
    await audit(req, `user.access_${body.action}`, { type: 'user', id: target.id }, { days: body.days });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    send(res, adminView(updated));
  }),
);

/**
 * Creates an adult account (parent, instructor or administrator). No password is set by the
 * administrator: the person receives a single use setup link instead.
 */
adminPeopleRouter.post(
  '/users',
  h(async (req, res) => {
    const body = parse(z.object({ email: emailSchema, displayName: nameSchema, role: z.enum(['PARENT', 'INSTRUCTOR', 'ADMIN']) }), req.body);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        displayName: body.displayName,
        role: body.role,
        // Unusable random password until the person sets their own.
        passwordHash: await hashPassword(randomToken(32)),
        preferences: { create: {} },
      },
    });
    const token = await issueToken(user.id, 'PASSWORD_RESET');
    const link = appLink('/reset-password', token);
    const result = await sendEmail(templates.accountSetup(body.email, body.displayName, link));
    await audit(req, 'user.created', { type: 'user', id: user.id }, { role: body.role });
    // The link is returned only when email delivery is not configured, so the administrator
    // can pass it on securely. It expires in one hour and works once.
    send(res, { user: adminView(user), setupEmailDelivered: result.delivered, setupLink: result.delivered ? null : link }, 201);
  }),
);

adminPeopleRouter.patch(
  '/users/:id',
  h(async (req, res) => {
    const body = parse(
      z.object({ role: roleSchema.optional(), status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(), displayName: nameSchema.optional(), markEmailVerified: z.boolean().optional() }).strict(),
      req.body,
    );
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound();
    const self = req.auth!.user;
    if (target.id === self.id && (body.role && body.role !== 'ADMIN' || body.status && body.status !== 'ACTIVE')) {
      throw badRequest('You cannot remove your own administrator access or deactivate yourself here.');
    }
    const learnerLike = (r: string) => r === 'LEARNER' || r === 'YOUTH';
    if (body.role && body.role !== target.role && (learnerLike(body.role) || learnerLike(target.role))) {
      throw badRequest('Learner and young person accounts cannot be converted to other account types, or the reverse.');
    }
    if (target.role === 'ADMIN' && ((body.role && body.role !== 'ADMIN') || (body.status && body.status !== 'ACTIVE'))) {
      const others = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: target.id } } });
      if (others === 0) throw badRequest('There must be at least one active administrator.');
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        role: body.role,
        status: body.status,
        displayName: body.displayName,
        ...(body.markEmailVerified ? { emailVerifiedAt: target.emailVerifiedAt ?? new Date() } : {}),
      },
    });
    if ((body.status && body.status !== 'ACTIVE') || (body.role && body.role !== target.role)) {
      await prisma.session.deleteMany({ where: { userId: target.id } });
    }
    await audit(req, 'user.updated', { type: 'user', id: target.id }, {
      ...(body.role ? { role: { from: target.role, to: body.role } } : {}),
      ...(body.status ? { status: { from: target.status, to: body.status } } : {}),
      ...(body.markEmailVerified ? { emailMarkedVerified: true } : {}),
    });
    send(res, adminView(updated));
  }),
);

/** Sends a password setup link. Administrators never see or choose user passwords. */
adminPeopleRouter.post(
  '/users/:id/password-reset',
  h(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || !user.email) throw badRequest('This account has no email address. Learner passwords are reset by their guardian.');
    const token = await issueToken(user.id, 'PASSWORD_RESET');
    const link = appLink('/reset-password', token);
    const result = await sendEmail(templates.passwordReset(user.email, user.displayName, link));
    await audit(req, 'user.password_reset_sent', { type: 'user', id: user.id });
    send(res, { delivered: result.delivered, setupLink: result.delivered ? null : link });
  }),
);

adminPeopleRouter.post(
  '/users/:id/revoke-sessions',
  h(async (req, res) => {
    const result = await prisma.session.deleteMany({ where: { userId: req.params.id } });
    await audit(req, 'user.sessions_revoked', { type: 'user', id: req.params.id });
    send(res, { revoked: result.count });
  }),
);

adminPeopleRouter.get(
  '/instructors',
  h(async (_req, res) => {
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      orderBy: { displayName: 'asc' },
      include: { assignments: { include: { program: { select: { id: true, title: true } } } } },
    });
    send(res, instructors.map((i) => ({ ...adminView(i), programs: i.assignments.map((a) => a.program) })));
  }),
);

/* Guardian relationship verification */

adminPeopleRouter.get(
  '/guardian-links',
  h(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['PENDING', 'VERIFIED', 'REVOKED']).default('PENDING') }), req.query);
    const links = await prisma.guardianLink.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        guardian: { select: { id: true, displayName: true, email: true } },
        learner: { select: { id: true, displayName: true, username: true } },
      },
    });
    send(res, links);
  }),
);

adminPeopleRouter.post(
  '/guardian-links/:id/:decision',
  h(async (req, res) => {
    const decision = parse(z.enum(['verify', 'revoke']), req.params.decision);
    const link = await prisma.guardianLink.findUnique({ where: { id: req.params.id } });
    if (!link) throw notFound();
    if (decision === 'revoke') {
      const verifiedCount = await prisma.guardianLink.count({ where: { learnerId: link.learnerId, status: 'VERIFIED', id: { not: link.id } } });
      if (link.status === 'VERIFIED' && verifiedCount === 0) {
        throw new ApiError(400, 'last_guardian', 'This is the only verified guardian. Suspend the learner account instead if needed.');
      }
    }
    const updated = await prisma.guardianLink.update({
      where: { id: link.id },
      data: decision === 'verify' ? { status: 'VERIFIED', verifiedById: req.auth!.user.id, verifiedAt: new Date() } : { status: 'REVOKED' },
    });
    await audit(req, `guardian_link.${decision}`, { type: 'guardian_link', id: link.id });
    send(res, updated);
  }),
);

/** Deletes an account for good. Learners it manages can be deleted with it. */
adminPeopleRouter.delete(
  '/users/:id',
  h(async (req, res) => {
    const { withLearners } = parse(z.object({ withLearners: z.enum(['1']).optional() }), req.query);
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { guardianOf: { select: { learnerId: true } } } });
    if (!target) throw notFound();
    if (target.id === req.auth!.user.id) throw badRequest('You cannot delete your own account here.');
    if (target.role === 'ADMIN') {
      const others = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: target.id } } });
      if (others === 0) throw badRequest('There must be at least one active administrator.');
    }
    const learnerIds = target.guardianOf.map((l) => l.learnerId);
    if (learnerIds.length && !withLearners) throw badRequest('This guardian has learner accounts. Choose to delete those too, or move them first.');
    await prisma.$transaction([
      ...(withLearners && learnerIds.length ? [prisma.user.deleteMany({ where: { id: { in: learnerIds }, role: { in: ['LEARNER'] } } })] : []),
      prisma.user.delete({ where: { id: target.id } }),
    ]);
    await audit(req, 'user.deleted', { type: 'user', id: target.id }, { role: target.role, learnersDeleted: withLearners ? learnerIds.length : 0 });
    send(res, { deleted: true });
  }),
);

/* Announcements: the notification bar, and optionally email */

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
  link: z.string().trim().max(300).regex(/^(\/|https:\/\/)/, 'Use a page address starting with / or https://').optional().or(z.literal('')),
  audience: z.enum(['EVERYONE', 'PARENTS', 'YOUTH', 'MEMBERS', 'INSTRUCTORS', 'EMAIL_SUBSCRIBERS']),
  sendEmail: z.boolean(),
});

adminPeopleRouter.get(
  '/broadcasts',
  h(async (_req, res) => {
    send(res, { items: await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }) });
  }),
);

adminPeopleRouter.post(
  '/broadcasts',
  h(async (req, res) => {
    const body = parse(broadcastSchema, req.body);
    const audience = body.audience as Audience;
    const result = await announce({ audience, topic: 'newsletterOptIn', email: body.sendEmail, kind: 'general', title: body.title, body: body.body, link: body.link || null });
    const record = await prisma.broadcast.create({ data: { title: body.title, body: body.body, link: body.link || null, audience: body.audience, sendEmail: body.sendEmail, recipients: result.recipients, emailed: result.emailed, createdById: req.auth!.user.id } });
    await audit(req, 'broadcast.sent', { type: 'broadcast', id: record.id }, { audience: body.audience, recipients: result.recipients, emailed: result.emailed });
    send(res, record, 201);
  }),
);
