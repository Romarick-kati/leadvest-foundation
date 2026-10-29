import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { h, notFound, send } from '../lib/http.js';
import { requireRole } from '../middleware/auth.js';

export const instructorRouter = Router();
instructorRouter.use(requireRole('INSTRUCTOR', 'ADMIN'));

instructorRouter.get(
  '/programs',
  h(async (req, res) => {
    const where = req.auth!.user.role === 'ADMIN' ? {} : { assignments: { some: { instructorId: req.auth!.user.id } } };
    const programs = await prisma.program.findMany({
      where,
      select: { id: true, slug: true, title: true, status: true, schedule: true, _count: { select: { registrations: true } } },
      orderBy: { title: 'asc' },
    });
    send(res, programs);
  }),
);

/**
 * Roster for an assigned program. Instructors see only learner display names and
 * registration status, never guardian contact details or other programs' learners.
 */
instructorRouter.get(
  '/programs/:id/roster',
  h(async (req, res) => {
    const user = req.auth!.user;
    if (user.role !== 'ADMIN') {
      const assigned = await prisma.instructorAssignment.findFirst({ where: { programId: req.params.id, instructorId: user.id } });
      // 404 rather than 403 so program assignment is not revealed.
      if (!assigned) throw notFound('Program not found.');
    }
    const program = await prisma.program.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
    if (!program) throw notFound('Program not found.');
    const regs = await prisma.registration.findMany({
      where: { programId: program.id, status: { in: ['CONFIRMED', 'PENDING'] } },
      select: { id: true, status: true, learner: { select: { id: true, displayName: true } }, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    send(res, {
      program,
      participants: regs.map((r) => ({ registrationId: r.id, status: r.status, learner: r.learner ? { id: r.learner.id, displayName: r.learner.displayName } : null })),
    });
  }),
);
