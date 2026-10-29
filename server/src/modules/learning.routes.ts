import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { forbidden, h, notFound, send } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { requireAccess } from '../services/access.js';
import { requireRole } from '../middleware/auth.js';

export const learningRouter = Router();

interface QuizQuestion {
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

/** Program modules are visible to enrolled learners, assigned instructors and admins. */
/** Child learners and self registered young people both keep lesson progress. */
const isLearning = (role: string) => role === 'LEARNER' || role === 'YOUTH';

async function canSeeModule(mod: { isPublic: boolean; programId: string | null }, user?: Express.Request['auth']) {
  if (mod.isPublic) return true;
  if (!user || !user.session.mfaVerified) return false;
  const u = user.user;
  if (u.role === 'ADMIN') return true;
  if (!mod.programId) return false;
  if (u.role === 'INSTRUCTOR') {
    return Boolean(await prisma.instructorAssignment.findFirst({ where: { programId: mod.programId, instructorId: u.id } }));
  }
  if (u.role === 'LEARNER') {
    return Boolean(
      await prisma.registration.findFirst({ where: { programId: mod.programId, learnerId: u.id, status: 'CONFIRMED' } }),
    );
  }
  return false;
}

learningRouter.get(
  '/modules',
  h(async (req, res) => {
    const modules = await prisma.learningModule.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, slug: true, title: true, description: true, theme: true, icon: true, ageGroup: true, isPublic: true, programId: true, isSample: true,
        _count: { select: { lessons: true } },
      },
    });
    const visible = [];
    for (const m of modules) if (await canSeeModule(m, req.auth)) visible.push(m);
    send(res, visible.map(({ _count, programId: _p, ...m }) => ({ ...m, lessonCount: _count.lessons })));
  }),
);

learningRouter.get(
  '/modules/:slug',
  h(async (req, res) => {
    const mod = await prisma.learningModule.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: { lessons: { orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, title: true, minutes: true } } },
    });
    if (!mod || !(await canSeeModule(mod, req.auth))) throw notFound('Topic not found.');
    let completed: string[] = [];
    if (req.auth?.session.mfaVerified && isLearning(req.auth.user.role)) {
      const rows = await prisma.lessonProgress.findMany({
        where: { learnerId: req.auth.user.id, lessonId: { in: mod.lessons.map((l) => l.id) } },
        select: { lessonId: true },
      });
      completed = rows.map((r) => r.lessonId);
    }
    const { programId: _p, ...rest } = mod;
    send(res, { ...rest, completedLessonIds: completed });
  }),
);

learningRouter.get(
  '/modules/:slug/lessons/:lessonSlug',
  h(async (req, res) => {
    const mod = await prisma.learningModule.findFirst({ where: { slug: req.params.slug, status: 'PUBLISHED' } });
    if (!mod || !(await canSeeModule(mod, req.auth))) throw notFound('Lesson not found.');
    const lesson = await prisma.lesson.findUnique({ where: { moduleId_slug: { moduleId: mod.id, slug: req.params.lessonSlug } } });
    if (!lesson) throw notFound('Lesson not found.');
    const siblings = await prisma.lesson.findMany({ where: { moduleId: mod.id }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true } });
    const idx = siblings.findIndex((s) => s.slug === lesson.slug);
    const quiz = (lesson.quiz as unknown as QuizQuestion[]).map((q) => ({ prompt: q.prompt, options: q.options }));
    send(res, {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      minutes: lesson.minutes,
      content: lesson.content,
      // Answers are not sent to the browser; they are checked on the server.
      quiz,
      module: { slug: mod.slug, title: mod.title, theme: mod.theme },
      position: { index: idx, total: siblings.length },
      next: siblings[idx + 1] ?? null,
      previous: siblings[idx - 1] ?? null,
    });
  }),
);

/** Checks quiz answers. Anyone may check; progress is recorded only for signed in learners. */
learningRouter.post(
  '/lessons/:id/check',
  h(async (req, res) => {
    const body = parse(z.object({ answers: z.array(z.number().int().min(-1).max(10)).max(50) }), req.body);
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id }, include: { module: true } });
    if (!lesson || lesson.module.status !== 'PUBLISHED' || !(await canSeeModule(lesson.module, req.auth))) throw notFound('Lesson not found.');
    const quiz = lesson.quiz as unknown as QuizQuestion[];
    const results = quiz.map((q, i) => ({
      correct: body.answers[i] === q.answerIndex,
      answerIndex: q.answerIndex,
      explanation: q.explanation ?? null,
    }));
    const score = results.filter((r) => r.correct).length;
    let recorded = false;
    if (req.auth?.session.mfaVerified && isLearning(req.auth.user.role)) {
      await prisma.lessonProgress.upsert({
        where: { learnerId_lessonId: { learnerId: req.auth.user.id, lessonId: lesson.id } },
        create: { learnerId: req.auth.user.id, lessonId: lesson.id, score, total: quiz.length },
        update: { score, total: quiz.length, completedAt: new Date() },
      });
      recorded = true;
    }
    send(res, { score, total: quiz.length, results, recorded });
  }),
);

/** Lessons without a quiz are marked complete explicitly. */
learningRouter.post(
  '/lessons/:id/complete',
  requireRole('LEARNER', 'YOUTH'),
  requireAccess,
  h(async (req, res) => {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.id }, include: { module: true } });
    if (!lesson || lesson.module.status !== 'PUBLISHED') throw notFound('Lesson not found.');
    if (!(await canSeeModule(lesson.module, req.auth))) throw forbidden();
    await prisma.lessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId: req.auth!.user.id, lessonId: lesson.id } },
      create: { learnerId: req.auth!.user.id, lessonId: lesson.id },
      update: { completedAt: new Date() },
    });
    send(res, { recorded: true });
  }),
);

/** A learner's own progress and badges. Only ever returns the signed in learner's records. */
learningRouter.get(
  '/me',
  requireRole('LEARNER', 'YOUTH'),
  requireAccess,
  h(async (req, res) => {
    const progress = await prisma.lessonProgress.findMany({
      where: { learnerId: req.auth!.user.id },
      include: { lesson: { select: { title: true, moduleId: true } } },
      orderBy: { completedAt: 'desc' },
    });
    const modules = await prisma.learningModule.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, slug: true, title: true, _count: { select: { lessons: true } } },
    });
    const byModule = modules.map((m) => {
      const done = progress.filter((p) => p.lesson.moduleId === m.id).length;
      return { slug: m.slug, title: m.title, completed: done, total: m._count.lessons };
    });
    const totalDone = progress.length;
    // Badges are derived from real progress only.
    const badges = [
      { id: 'first-step', title: 'First step', description: 'Finished your first lesson', earned: totalDone >= 1 },
      { id: 'curious-mind', title: 'Curious mind', description: 'Finished five lessons', earned: totalDone >= 5 },
      { id: 'quiz-star', title: 'Quiz star', description: 'Got every answer right in a quiz', earned: progress.some((p) => p.total && p.score === p.total) },
      { id: 'topic-champion', title: 'Topic champion', description: 'Finished every lesson in a topic', earned: byModule.some((m) => m.total > 0 && m.completed === m.total) },
    ];
    send(res, { totalCompleted: totalDone, modules: byModule, badges, recent: progress.slice(0, 5).map((p) => ({ title: p.lesson.title, completedAt: p.completedAt })) });
  }),
);
