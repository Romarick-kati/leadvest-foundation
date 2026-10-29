import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { announce } from '../../services/notify.js';
import { prisma } from '../../lib/prisma.js';
import { h, notFound, pageResult, paginate, send } from '../../lib/http.js';
import { optionalText, parse, parsePatch, slugSchema } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';

export const adminContentRouter = Router();

const statusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const listQuery = z.object({ q: z.string().trim().max(100).optional(), status: statusSchema.optional() });

const faqSchema = z.array(z.object({ question: z.string().trim().min(1).max(200), answer: z.string().trim().min(1).max(2000) })).max(30);
const money = z.number().int().min(0).max(100_000_000).nullable().optional();
const currency = z.string().trim().toUpperCase().length(3).nullable().optional();

/**
 * Makes a web address from a title when none is given, and adds -2, -3 and so on if it is taken,
 * so creating something never fails only because the title is similar to an existing one.
 */
function slugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return base.length >= 2 ? base : 'item';
}

async function uniqueSlug(kind: 'program' | 'event', wanted: string): Promise<string> {
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? wanted : `${wanted}-${n}`;
    const taken = kind === 'program' ? await prisma.program.findUnique({ where: { slug: candidate }, select: { id: true } }) : await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${wanted}-${Date.now()}`;
}

/* Programs */

const programSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(10000),
  imageKey: optionalText(300),
  imageAlt: optionalText(200),
  ageGroup: optionalText(60),
  objectives: z.array(z.string().trim().min(1).max(200)).max(15).default([]),
  deliveryFormat: optionalText(60),
  availability: optionalText(120),
  schedule: optionalText(500),
  duration: optionalText(120),
  requirements: optionalText(2000),
  feeInfo: optionalText(500),
  priceCents: money,
  currency,
  registrationInfo: optionalText(2000),
  registrationOpen: z.boolean().default(false),
  faq: faqSchema.default([]),
  status: statusSchema.default('DRAFT'),
});

adminContentRouter.get(
  '/programs',
  h(async (req, res) => {
    const { q, status } = parse(listQuery, req.query);
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.ProgramWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.program.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { registrations: true } }, assignments: { include: { instructor: { select: { id: true, displayName: true } } } } },
      }),
      prisma.program.count({ where }),
    ]);
    send(res, pageResult(items, total, page, pageSize));
  }),
);

adminContentRouter.get(
  '/programs/:id',
  h(async (req, res) => {
    const program = await prisma.program.findUnique({
      where: { id: req.params.id },
      include: { assignments: { include: { instructor: { select: { id: true, displayName: true, email: true } } } } },
    });
    if (!program) throw notFound();
    send(res, program);
  }),
);

adminContentRouter.post(
  '/programs',
  h(async (req, res) => {
    const parsed = parse(programSchema.extend({ slug: slugSchema.optional() }), req.body);
    const slug = parsed.slug ?? (await uniqueSlug('program', slugFromTitle(parsed.title)));
    const program = await prisma.program.create({ data: { ...parsed, slug } });
    await audit(req, 'program.created', { type: 'program', id: program.id }, { status: program.status });
    if (program.status === 'PUBLISHED') await announce({ audience: 'EVERYONE', topic: 'programUpdates', email: true, kind: 'program', title: `New program: ${program.title}`, body: program.summary, link: `/programs/${program.slug}` });
    send(res, program, 201);
  }),
);

adminContentRouter.patch(
  '/programs/:id',
  h(async (req, res) => {
    const data = parsePatch(programSchema, req.body);
    const before = await prisma.program.findUnique({ where: { id: req.params.id }, select: { status: true } });
    const program = await prisma.program.update({ where: { id: req.params.id }, data: { ...data, isSample: false } });
    if (program.status === 'PUBLISHED' && before?.status !== 'PUBLISHED') await announce({ audience: 'EVERYONE', topic: 'programUpdates', email: true, kind: 'program', title: `New program: ${program.title}`, body: program.summary, link: `/programs/${program.slug}` });
    await audit(req, 'program.updated', { type: 'program', id: program.id }, { fields: Object.keys(data) });
    send(res, program);
  }),
);

adminContentRouter.post(
  '/programs/:id/instructors',
  h(async (req, res) => {
    const { instructorId } = parse(z.object({ instructorId: z.string().max(40) }), req.body);
    const instructor = await prisma.user.findFirst({ where: { id: instructorId, role: 'INSTRUCTOR', status: 'ACTIVE' } });
    if (!instructor) throw notFound('Instructor not found.');
    const a = await prisma.instructorAssignment.upsert({
      where: { programId_instructorId: { programId: req.params.id, instructorId } },
      create: { programId: req.params.id, instructorId },
      update: {},
    });
    await audit(req, 'program.instructor_assigned', { type: 'program', id: req.params.id }, { instructorId });
    send(res, a, 201);
  }),
);

adminContentRouter.delete(
  '/programs/:id/instructors/:instructorId',
  h(async (req, res) => {
    await prisma.instructorAssignment.deleteMany({ where: { programId: req.params.id, instructorId: req.params.instructorId } });
    await audit(req, 'program.instructor_unassigned', { type: 'program', id: req.params.id }, { instructorId: req.params.instructorId });
    send(res, { removed: true });
  }),
);

/* Events */

const eventSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(2).max(120),
    summary: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(10000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    timezone: z.string().trim().max(60).default('Africa/Douala'),
    locationType: z.enum(['IN_PERSON', 'ONLINE', 'HYBRID']).default('IN_PERSON'),
    location: optionalText(300),
    audience: optionalText(120),
    capacity: z.number().int().min(1).max(100000).nullable().optional(),
    registrationOpen: z.boolean().default(false),
    registrationDeadline: z.coerce.date().nullable().optional(),
    registrationInfo: optionalText(2000),
    externalUrl: z.string().trim().url().max(300).nullable().optional(),
    priceCents: money,
    currency,
    imageKey: optionalText(300),
    imageAlt: optionalText(200),
    eventStatus: z.enum(['SCHEDULED', 'POSTPONED', 'CANCELLED', 'COMPLETED']).default('SCHEDULED'),
    status: statusSchema.default('DRAFT'),
  });

adminContentRouter.get(
  '/events',
  h(async (req, res) => {
    const { q, status } = parse(listQuery, req.query);
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.EventWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.event.findMany({ where, skip, take, orderBy: { startsAt: 'desc' }, include: { _count: { select: { registrations: true } } } }),
      prisma.event.count({ where }),
    ]);
    send(res, pageResult(items, total, page, pageSize));
  }),
);

adminContentRouter.get(
  '/events/:id',
  h(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw notFound();
    send(res, event);
  }),
);

adminContentRouter.post(
  '/events',
  h(async (req, res) => {
    const parsed = parse(eventSchema.extend({ slug: slugSchema.optional() }), req.body);
    const slug = parsed.slug ?? (await uniqueSlug('event', slugFromTitle(parsed.title)));
    const event = await prisma.event.create({ data: { ...parsed, slug } });
    await audit(req, 'event.created', { type: 'event', id: event.id });
    if (event.status === 'PUBLISHED') await announce({ audience: 'EVERYONE', topic: 'eventAnnouncements', email: true, kind: 'event', title: `New event: ${event.title}`, body: event.summary, link: `/events/${event.slug}` });
    send(res, event, 201);
  }),
);

adminContentRouter.patch(
  '/events/:id',
  h(async (req, res) => {
    const data = parsePatch(eventSchema, req.body);
    const before = await prisma.event.findUnique({ where: { id: req.params.id }, select: { status: true } });
    const event = await prisma.event.update({ where: { id: req.params.id }, data: { ...data, isSample: false } });
    if (event.status === 'PUBLISHED' && before?.status !== 'PUBLISHED') await announce({ audience: 'EVERYONE', topic: 'eventAnnouncements', email: true, kind: 'event', title: `New event: ${event.title}`, body: event.summary, link: `/events/${event.slug}` });
    await audit(req, 'event.updated', { type: 'event', id: event.id }, { fields: Object.keys(data) });
    send(res, event);
  }),
);

adminContentRouter.delete(
  '/events/:id',
  h(async (req, res) => {
    const found = await prisma.event.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
    if (!found) throw notFound();
    await prisma.event.delete({ where: { id: found.id } });
    await audit(req, 'event.deleted', { type: 'event', id: found.id }, { title: found.title });
    send(res, { deleted: true });
  }),
);

adminContentRouter.delete(
  '/programs/:id',
  h(async (req, res) => {
    const found = await prisma.program.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
    if (!found) throw notFound();
    await prisma.program.delete({ where: { id: found.id } });
    await audit(req, 'program.deleted', { type: 'program', id: found.id }, { title: found.title });
    send(res, { deleted: true });
  }),
);

/* Learning modules and lessons */

const moduleSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(1000),
  theme: z.enum(['sky', 'sun', 'mint']).default('sky'),
  icon: z.enum(['book', 'star', 'leaf', 'compass', 'chat', 'heart']).default('book'),
  ageGroup: optionalText(60),
  isPublic: z.boolean().default(true),
  programId: z.string().max(40).nullable().optional(),
  status: statusSchema.default('DRAFT'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

const contentBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(4000) }),
  z.object({ type: z.literal('tip'), text: z.string().trim().min(1).max(1000) }),
  z.object({ type: z.literal('activity'), title: z.string().trim().max(120), text: z.string().trim().min(1).max(2000) }),
]);

const quizQuestion = z
  .object({
    prompt: z.string().trim().min(1).max(300),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(5),
    answerIndex: z.number().int().min(0),
    explanation: z.string().trim().max(500).optional(),
  })
  .refine((q) => q.answerIndex < q.options.length, { message: 'The answer must be one of the options.', path: ['answerIndex'] });

const lessonSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(120),
  content: z.array(contentBlock).max(40).default([]),
  quiz: z.array(quizQuestion).max(20).default([]),
  minutes: z.number().int().min(1).max(120).default(5),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

adminContentRouter.get(
  '/learning/modules',
  h(async (_req, res) => {
    send(res, await prisma.learningModule.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { lessons: true } }, program: { select: { title: true } } } }));
  }),
);

adminContentRouter.get(
  '/learning/modules/:id',
  h(async (req, res) => {
    const mod = await prisma.learningModule.findUnique({ where: { id: req.params.id }, include: { lessons: { orderBy: { sortOrder: 'asc' } } } });
    if (!mod) throw notFound();
    send(res, mod);
  }),
);

adminContentRouter.post(
  '/learning/modules',
  h(async (req, res) => {
    const data = parse(moduleSchema, req.body);
    const mod = await prisma.learningModule.create({ data });
    await audit(req, 'learning.module_created', { type: 'learning_module', id: mod.id });
    send(res, mod, 201);
  }),
);

adminContentRouter.patch(
  '/learning/modules/:id',
  h(async (req, res) => {
    const data = parsePatch(moduleSchema, req.body);
    const mod = await prisma.learningModule.update({ where: { id: req.params.id }, data: { ...data, isSample: false } });
    await audit(req, 'learning.module_updated', { type: 'learning_module', id: mod.id }, { fields: Object.keys(data) });
    send(res, mod);
  }),
);

adminContentRouter.post(
  '/learning/modules/:id/lessons',
  h(async (req, res) => {
    const data = parse(lessonSchema, req.body);
    const lesson = await prisma.lesson.create({ data: { ...data, moduleId: req.params.id } });
    await audit(req, 'learning.lesson_created', { type: 'lesson', id: lesson.id });
    send(res, lesson, 201);
  }),
);

adminContentRouter.patch(
  '/learning/lessons/:id',
  h(async (req, res) => {
    const data = parsePatch(lessonSchema, req.body);
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
    await audit(req, 'learning.lesson_updated', { type: 'lesson', id: lesson.id }, { fields: Object.keys(data) });
    send(res, lesson);
  }),
);

adminContentRouter.delete(
  '/learning/lessons/:id',
  h(async (req, res) => {
    await prisma.lesson.delete({ where: { id: req.params.id } });
    await audit(req, 'learning.lesson_deleted', { type: 'lesson', id: req.params.id });
    send(res, { deleted: true });
  }),
);

/* Pages (policies, notices, and other editable content) */

const pageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().max(50000),
  status: statusSchema.default('DRAFT'),
  needsReview: z.boolean().default(true),
});

adminContentRouter.get(
  '/pages',
  h(async (_req, res) => {
    send(res, await prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }));
  }),
);

adminContentRouter.get(
  '/pages/:id',
  h(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { id: req.params.id } });
    if (!page) throw notFound();
    send(res, page);
  }),
);

adminContentRouter.post(
  '/pages',
  h(async (req, res) => {
    const data = parse(pageSchema, req.body);
    const page = await prisma.page.create({ data });
    await audit(req, 'page.created', { type: 'page', id: page.id });
    send(res, page, 201);
  }),
);

adminContentRouter.patch(
  '/pages/:id',
  h(async (req, res) => {
    const data = parsePatch(pageSchema, req.body);
    const page = await prisma.page.update({ where: { id: req.params.id }, data });
    await audit(req, 'page.updated', { type: 'page', id: page.id }, { fields: Object.keys(data), status: page.status });
    send(res, page);
  }),
);

/* Articles and learning resources */

export const articleCategories = ['parenting', 'learning', 'leadership', 'digital', 'news'] as const;

const articleSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(30000),
  category: z.enum(articleCategories),
  imageKey: optionalText(300),
  imageAlt: optionalText(200),
  readMinutes: z.number().int().min(1).max(120).nullable().optional(),
  status: statusSchema.default('DRAFT'),
});

const articleListQuery = listQuery.extend({ category: z.enum(articleCategories).optional() });

adminContentRouter.get(
  '/articles',
  h(async (req, res) => {
    const { q, status, category } = parse(articleListQuery, req.query);
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.ArticleWhereInput = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.article.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' }, include: { author: { select: { displayName: true } } } }),
      prisma.article.count({ where }),
    ]);
    send(res, pageResult(items, total, page, pageSize));
  }),
);

adminContentRouter.get(
  '/articles/:id',
  h(async (req, res) => {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw notFound();
    send(res, article);
  }),
);

// The first time an article is published it gets a publication date, which later edits keep.
function publishedAtFor(status: string | undefined, current: Date | null | undefined) {
  if (status === 'PUBLISHED') return current ?? new Date();
  return current ?? null;
}

adminContentRouter.post(
  '/articles',
  h(async (req, res) => {
    const data = parse(articleSchema, req.body);
    const article = await prisma.article.create({ data: { ...data, authorId: req.auth!.user.id, publishedAt: publishedAtFor(data.status, null) } });
    await audit(req, 'article.created', { type: 'article', id: article.id }, { status: article.status });
    if (article.status === 'PUBLISHED') await announce({ audience: 'EVERYONE', topic: 'newsletterOptIn', email: true, kind: 'article', title: article.title, body: article.summary, link: `/resources/${article.slug}` });
    send(res, article, 201);
  }),
);

adminContentRouter.patch(
  '/articles/:id',
  h(async (req, res) => {
    const data = parsePatch(articleSchema, req.body);
    const article = await prisma.$transaction(async (tx) => {
      const current = await tx.article.findUnique({ where: { id: req.params.id }, select: { publishedAt: true } });
      if (!current) throw notFound();
      return tx.article.update({ where: { id: req.params.id }, data: { ...data, isSample: false, publishedAt: publishedAtFor(data.status, current.publishedAt) } });
    });
    await audit(req, 'article.updated', { type: 'article', id: article.id }, { fields: Object.keys(data) });
    send(res, article);
  }),
);

adminContentRouter.delete(
  '/articles/:id',
  h(async (req, res) => {
    const found = await prisma.article.findUnique({ where: { id: req.params.id }, select: { id: true, title: true } });
    if (!found) throw notFound();
    await prisma.article.delete({ where: { id: found.id } });
    await audit(req, 'article.deleted', { type: 'article', id: found.id }, { title: found.title });
    send(res, { deleted: true });
  }),
);
