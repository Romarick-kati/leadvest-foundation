import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError, badRequest, h, notFound, send } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { audit } from '../lib/audit.js';
import { requireAccess } from '../services/access.js';
import { requireRole, requireVerifiedEmail } from '../middleware/auth.js';
import { assertGuardianOf } from './guardian.routes.js';
import { getSiteSettings } from './siteSettings.js';
import { sendEmail } from '../services/email/index.js';
import { templates } from '../services/email/templates.js';

export const registrationsRouter = Router();
// Parents, young people and adult members register and pay for themselves. Child learner accounts never register or pay directly.
registrationsRouter.use(requireRole('PARENT', 'YOUTH', 'MEMBER'), requireAccess, requireVerifiedEmail);

registrationsRouter.post(
  '/',
  h(async (req, res) => {
    const body = parse(
      z
        .object({
          eventId: z.string().max(40).optional(),
          programId: z.string().max(40).optional(),
          learnerId: z.string().max(40).optional(),
          notes: z.string().trim().max(1000).optional(),
          consent: z.literal(true, { error: 'Please confirm the participation consent.' }),
        })
        .refine((b) => Boolean(b.eventId) !== Boolean(b.programId), { message: 'Choose an event or a program.', path: ['eventId'] }),
      req.body,
    );
    const user = req.auth!.user;
    const settings = await getSiteSettings();
    if (body.learnerId && user.role !== 'PARENT') throw badRequest('Only a parent or guardian can register a learner account.');
    if (body.learnerId) await assertGuardianOf(user.id, body.learnerId);

    let title: string;
    let priceCents: number | null = null;
    let status: 'CONFIRMED' | 'WAITLISTED' | 'PENDING' = 'PENDING';

    const registration = await prisma.$transaction(
      async (tx) => {
        if (body.eventId) {
          if (!settings.features.eventRegistration) throw badRequest('Event registration is not available yet.');
          const event = await tx.event.findFirst({ where: { id: body.eventId, status: 'PUBLISHED' } });
          if (!event) throw notFound('Event not found.');
          if (!event.registrationOpen || event.eventStatus !== 'SCHEDULED') throw badRequest('Registration is not open for this event.');
          if (event.registrationDeadline && event.registrationDeadline < new Date()) throw badRequest('The registration deadline has passed.');
          if (event.externalUrl) throw badRequest('This event uses an external registration page.');
          const dup = await tx.registration.findFirst({
            where: { eventId: event.id, registrantId: user.id, learnerId: body.learnerId ?? null, status: { not: 'CANCELLED' } },
          });
          if (dup) throw new ApiError(409, 'conflict', 'You are already registered for this event.');
          const confirmed = await tx.registration.count({ where: { eventId: event.id, status: 'CONFIRMED' } });
          const full = event.capacity != null && confirmed >= event.capacity;
          title = event.title;
          priceCents = event.priceCents && event.priceCents > 0 ? event.priceCents : null;
          status = full ? 'WAITLISTED' : priceCents ? 'PENDING' : 'CONFIRMED';
        } else {
          if (!settings.features.programRegistration) throw badRequest('Program registration is not available yet.');
          const program = await tx.program.findFirst({ where: { id: body.programId, status: 'PUBLISHED' } });
          if (!program) throw notFound('Program not found.');
          if (!program.registrationOpen) throw badRequest('Registration is not open for this program.');
          const dup = await tx.registration.findFirst({
            where: { programId: program.id, registrantId: user.id, learnerId: body.learnerId ?? null, status: { not: 'CANCELLED' } },
          });
          if (dup) throw new ApiError(409, 'conflict', 'You have already registered for this program.');
          title = program.title;
          priceCents = program.priceCents && program.priceCents > 0 ? program.priceCents : null;
          // Program places are reviewed by the foundation before confirmation.
          status = 'PENDING';
        }
        const created = await tx.registration.create({
          data: {
            eventId: body.eventId,
            programId: body.programId,
            registrantId: user.id,
            learnerId: body.learnerId,
            notes: body.notes,
            status,
            paymentStatus: priceCents ? 'PENDING' : 'NOT_REQUIRED',
          },
        });
        if (body.learnerId) {
          await tx.consentRecord.create({
            data: {
              giverId: user.id,
              subjectId: body.learnerId,
              type: body.eventId ? 'event_participation' : 'program_participation',
              policyVersion: 'draft',
              granted: true,
            },
          });
        }
        return created;
      },
      { isolationLevel: 'Serializable' },
    );
    await audit(req, 'registration.created', { type: 'registration', id: registration.id });
    if (user.email) await sendEmail(templates.registrationConfirmation(user.email, user.displayName, title!, registration.status));
    send(res, { ...registration, paymentRequired: Boolean(priceCents) }, 201);
  }),
);

registrationsRouter.get(
  '/mine',
  h(async (req, res) => {
    const items = await prisma.registration.findMany({
      where: { registrantId: req.auth!.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        event: { select: { title: true, slug: true, startsAt: true } },
        program: { select: { title: true, slug: true } },
        learner: { select: { id: true, displayName: true } },
      },
    });
    send(res, items);
  }),
);

registrationsRouter.post(
  '/:id/cancel',
  h(async (req, res) => {
    const reg = await prisma.registration.findFirst({ where: { id: req.params.id, registrantId: req.auth!.user.id } });
    if (!reg) throw notFound('Registration not found.');
    if (reg.status === 'CANCELLED') return send(res, reg);
    if (reg.paymentStatus === 'PAID') throw badRequest('This registration has been paid. Please contact the foundation about cancellation and refunds.');
    const updated = await prisma.registration.update({
      where: { id: reg.id },
      data: { status: 'CANCELLED', paymentStatus: reg.paymentStatus === 'PENDING' ? 'CANCELLED' : reg.paymentStatus },
    });
    await audit(req, 'registration.cancelled_by_registrant', { type: 'registration', id: reg.id });
    send(res, updated);
  }),
);
