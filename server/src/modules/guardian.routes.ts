import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, forbidden, h, send } from '../lib/http.js';
import { nameSchema, parse, passwordSchema } from '../lib/validate.js';
import { audit } from '../lib/audit.js';
import { requireAccess } from '../services/access.js';
import { requireRole, requireVerifiedEmail } from '../middleware/auth.js';
import { hashPassword } from './users.js';

export const guardianRouter = Router();
guardianRouter.use(requireRole('PARENT'), requireAccess, requireVerifiedEmail);

export const CONSENT_POLICY_VERSION = 'draft';

/** Throws unless the signed in guardian has a VERIFIED link to this learner. */
export async function assertGuardianOf(guardianId: string, learnerId: string) {
  const link = await prisma.guardianLink.findUnique({ where: { guardianId_learnerId: { guardianId, learnerId } } });
  if (!link || link.status !== 'VERIFIED') throw forbidden('You are not a verified guardian for this learner.');
  return link;
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(4, 'Use at least 4 characters.')
  .max(24)
  .regex(/^[a-z0-9_]+$/, 'Use letters, numbers and underscores only.')
  .refine((u) => !u.includes('@'), 'Usernames cannot contain @.');

const learnerSelect = {
  id: true,
  username: true,
  displayName: true,
  status: true,
  createdAt: true,
  learnerProfile: { select: { ageBand: true, learningLevel: true, readAloud: true, largerText: true } },
} as const;

guardianRouter.get(
  '/learners',
  h(async (req, res) => {
    const links = await prisma.guardianLink.findMany({
      where: { guardianId: req.auth!.user.id, status: { in: ['VERIFIED', 'PENDING'] } },
      include: { learner: { select: learnerSelect } },
      orderBy: { createdAt: 'asc' },
    });
    send(
      res,
      links.map((l) => ({
        linkStatus: l.status,
        relationship: l.relationship,
        // Pending links show only the username the guardian typed, nothing else about the child.
        learner: l.status === 'VERIFIED' ? l.learner : { id: l.learner.id, username: l.learner.username },
      })),
    );
  }),
);

guardianRouter.post(
  '/learners',
  h(async (req, res) => {
    const body = parse(
      z.object({
        displayName: nameSchema.describe('First name or nickname only'),
        username: usernameSchema,
        password: passwordSchema,
        ageBand: z.enum(['4-6', '7-9', '10-12', '13-15']).optional(),
        relationship: z.enum(['parent', 'guardian', 'other']),
        consent: z.literal(true, { error: 'Guardian consent is required to create a learning account.' }),
      }),
      req.body,
    );
    const guardian = req.auth!.user;
    const learner = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: body.username,
          displayName: body.displayName,
          passwordHash: await hashPassword(body.password),
          role: 'LEARNER',
          createdById: guardian.id,
          accessUntil: guardian.accessUntil,
          accessLifetime: guardian.accessLifetime,
          preferences: { create: {} },
          learnerProfile: { create: { ageBand: body.ageBand } },
        },
        select: learnerSelect,
      });
      // The creating guardian's link is verified by the act of creation under their own verified account.
      await tx.guardianLink.create({
        data: { guardianId: guardian.id, learnerId: created.id, relationship: body.relationship, status: 'VERIFIED', verifiedAt: new Date() },
      });
      await tx.consentRecord.create({
        data: { giverId: guardian.id, subjectId: created.id, type: 'learning_account', policyVersion: CONSENT_POLICY_VERSION, granted: true },
      });
      return created;
    });
    await audit(req, 'guardian.learner_created', { type: 'user', id: learner.id });
    send(res, learner, 201);
  }),
);

/** A second guardian asks to be linked to an existing learner. An administrator verifies it. */
guardianRouter.post(
  '/links',
  h(async (req, res) => {
    const body = parse(z.object({ username: usernameSchema, relationship: z.enum(['parent', 'guardian', 'other']) }), req.body);
    const learner = await prisma.user.findUnique({ where: { username: body.username } });
    // Same response whether or not the username exists, so usernames cannot be probed.
    if (learner && learner.role === 'LEARNER') {
      await prisma.guardianLink.upsert({
        where: { guardianId_learnerId: { guardianId: req.auth!.user.id, learnerId: learner.id } },
        create: { guardianId: req.auth!.user.id, learnerId: learner.id, relationship: body.relationship },
        update: {},
      });
      await audit(req, 'guardian.link_requested', { type: 'user', id: learner.id });
    }
    send(res, { message: 'Request received. The foundation will verify the relationship before you can manage this account.' }, 202);
  }),
);

guardianRouter.patch(
  '/learners/:id',
  h(async (req, res) => {
    await assertGuardianOf(req.auth!.user.id, req.params.id);
    const body = parse(
      z.object({
        displayName: nameSchema.optional(),
        ageBand: z.enum(['4-6', '7-9', '10-12', '13-15']).nullable().optional(),
        learningLevel: z.enum(['starter', 'explorer', 'leader']).optional(),
        readAloud: z.boolean().optional(),
        largerText: z.boolean().optional(),
        reduceMotion: z.boolean().optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
      }).strict(),
      req.body,
    );
    const { displayName, status, reduceMotion, ...profile } = body;
    const learner = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        displayName,
        status,
        learnerProfile: { upsert: { create: profile, update: profile } },
        ...(reduceMotion !== undefined ? { preferences: { upsert: { create: { reduceMotion }, update: { reduceMotion } } } } : {}),
      },
      select: learnerSelect,
    });
    if (status === 'SUSPENDED') await prisma.session.deleteMany({ where: { userId: learner.id } });
    await audit(req, 'guardian.learner_updated', { type: 'user', id: learner.id }, { fields: Object.keys(body) });
    send(res, learner);
  }),
);

guardianRouter.post(
  '/learners/:id/password',
  h(async (req, res) => {
    await assertGuardianOf(req.auth!.user.id, req.params.id);
    const body = parse(z.object({ password: passwordSchema }), req.body);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await hashPassword(body.password), passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await prisma.session.deleteMany({ where: { userId: req.params.id } });
    await audit(req, 'guardian.learner_password_reset', { type: 'user', id: req.params.id });
    send(res, { reset: true });
  }),
);

guardianRouter.get(
  '/learners/:id/progress',
  h(async (req, res) => {
    await assertGuardianOf(req.auth!.user.id, req.params.id);
    const progress = await prisma.lessonProgress.findMany({
      where: { learnerId: req.params.id },
      orderBy: { completedAt: 'desc' },
      include: { lesson: { select: { title: true, module: { select: { title: true, slug: true } } } } },
    });
    send(res, progress);
  }),
);

guardianRouter.get(
  '/learners/:id/consents',
  h(async (req, res) => {
    await assertGuardianOf(req.auth!.user.id, req.params.id);
    send(res, await prisma.consentRecord.findMany({ where: { subjectId: req.params.id }, orderBy: { createdAt: 'desc' } }));
  }),
);

const CONSENT_TYPES = ['learning_account', 'program_participation', 'photography', 'event_participation'] as const;

guardianRouter.post(
  '/learners/:id/consents',
  h(async (req, res) => {
    await assertGuardianOf(req.auth!.user.id, req.params.id);
    const body = parse(z.object({ type: z.enum(CONSENT_TYPES), granted: z.boolean() }), req.body);
    const record = await prisma.consentRecord.create({
      data: { giverId: req.auth!.user.id, subjectId: req.params.id, type: body.type, granted: body.granted, policyVersion: CONSENT_POLICY_VERSION },
    });
    // Withdrawing consent for the learning account itself suspends it.
    if (body.type === 'learning_account' && !body.granted) {
      await prisma.user.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
      await prisma.session.deleteMany({ where: { userId: req.params.id } });
    }
    await audit(req, 'guardian.consent_recorded', { type: 'user', id: req.params.id }, { consentType: body.type, granted: body.granted });
    send(res, record, 201);
  }),
);

guardianRouter.delete(
  '/learners/:id',
  h(async (req, res) => {
    const link = await assertGuardianOf(req.auth!.user.id, req.params.id);
    const learner = await prisma.user.findUniqueOrThrow({ where: { id: link.learnerId } });
    if (learner.createdById !== req.auth!.user.id) {
      throw new ApiError(403, 'forbidden', 'Only the guardian who created this account can deactivate it. You can ask the foundation for help.');
    }
    if (learner.role !== 'LEARNER') throw badRequest('Not a learner account.');
    await prisma.user.update({ where: { id: learner.id }, data: { status: 'DEACTIVATED' } });
    await prisma.session.deleteMany({ where: { userId: learner.id } });
    await audit(req, 'guardian.learner_deactivated', { type: 'user', id: learner.id });
    send(res, { deactivated: true });
  }),
);
