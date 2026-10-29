import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { siteUrl } from '../lib/siteUrl.js';
import { h, notFound, send } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { env } from '../config/env.js';
import { getSiteSettings } from './siteSettings.js';
import { emailConfigured } from '../services/email/index.js';

export const publicRouter = Router();

/**
 * Short shared caching for public content that is the same for every visitor (site settings,
 * published programs, events and pages). Browsers always check with the server; a CDN such as
 * Netlify's (through the CDN cache headers) may serve a copy for up to 5 seconds. Skipped
 * whenever the response sets a cookie, so a session refresh can never be cached. Nothing under
 * /account, /admin, /learning or /auth uses this.
 */
publicRouter.use((req, res, next) => {
  if (req.method === 'GET') {
    const onlyPublic = () => {
      if (!res.getHeader('Set-Cookie') && res.statusCode === 200) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('CDN-Cache-Control', 'public, max-age=5');
        res.setHeader('Netlify-CDN-Cache-Control', 'public, max-age=5');
      } else res.setHeader('Cache-Control', 'private, no-store');
    };
    const json = res.json.bind(res);
    res.json = (body) => {
      onlyPublic();
      return json(body);
    };
  }
  next();
});

publicRouter.get(
  '/site',
  h(async (_req, res) => {
    const settings = await getSiteSettings();
    send(res, {
      ...settings,
      integrations: {
        // Shown so the interface never pretends a service is connected when it is not.
        emailDelivery: emailConfigured(),
        payments: env.PAYMENTS_MODE, paymentProviders: env.paymentProviders,
        donationsLive: false,
      },
    });
  }),
);

/* Search engines: a sitemap that updates itself, and a robots file that points to it */

const staticPages = ['/', '/about', '/programs', '/events', '/learning', '/resources', '/parents', '/get-involved', '/support', '/contact', '/faq', '/privacy', '/terms', '/child-safety', '/consent', '/cookies', '/accessibility'];
const xml = (v: string) => v.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

publicRouter.get(
  '/sitemap.xml',
  h(async (req, res) => {
    const base = siteUrl(req);
    const [programs, events, articles, modules] = await Promise.all([
      prisma.program.findMany({ where: { status: 'PUBLISHED', isSample: false }, select: { slug: true, updatedAt: true, imageKey: true } }),
      prisma.event.findMany({ where: { status: 'PUBLISHED', isSample: false }, select: { slug: true, updatedAt: true, imageKey: true } }),
      prisma.article.findMany({ where: { status: 'PUBLISHED', isSample: false }, select: { slug: true, updatedAt: true, imageKey: true } }),
      prisma.learningModule.findMany({ where: { status: 'PUBLISHED', isPublic: true, isSample: false }, select: { slug: true, updatedAt: true, lessons: { select: { slug: true } } } }),
    ]);
    // Pictures are listed with their page so Google Images can find them too. Only real uploaded
    // pictures count; built in illustrations have no address of their own.
    const pic = (k?: string | null) => (k && (k.startsWith('/') || /^https?:\/\//.test(k)) ? (k.startsWith('/') ? `${base}${k}` : k) : undefined);
    type U = { loc: string; lastmod?: Date; images?: (string | undefined)[] };
    const urls: U[] = [
      { loc: base, images: [`${base}/images/branding/icon-512.png`] },
      ...staticPages.filter((p) => p !== '/').map((path): U => ({ loc: `${base}${path}`, images: path === '/about' ? [`${base}/images/team/founder.webp`] : [] })),
      ...programs.map((x): U => ({ loc: `${base}/programs/${x.slug}`, lastmod: x.updatedAt, images: [pic(x.imageKey)] })),
      ...events.map((x): U => ({ loc: `${base}/events/${x.slug}`, lastmod: x.updatedAt, images: [pic(x.imageKey)] })),
      ...articles.map((x): U => ({ loc: `${base}/resources/${x.slug}`, lastmod: x.updatedAt, images: [pic(x.imageKey)] })),
      ...modules.flatMap((m): U[] => [{ loc: `${base}/learning/${m.slug}`, lastmod: m.updatedAt }, ...m.lessons.map((l): U => ({ loc: `${base}/learning/${m.slug}/${l.slug}`, lastmod: m.updatedAt }))]),
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls
      .map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}${(u.images ?? []).filter(Boolean).map((i) => `<image:image><image:loc>${xml(i!)}</image:loc></image:image>`).join('')}</url>`)
      .join('\n')}\n</urlset>\n`;
    res.type('application/xml').set('Cache-Control', 'public, max-age=300').send(body);
  }),
);

publicRouter.get('/robots.txt', (req, res) => {
  const base = siteUrl(req);
  res
    .type('text/plain')
    .set('Cache-Control', 'public, max-age=3600')
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /settings\nDisallow: /account\nDisallow: /instructor\nDisallow: /setup\nDisallow: /subscribe\nDisallow: /payment\nDisallow: /welcome\nDisallow: /api\n\nSitemap: ${base}/sitemap.xml\n`);
});

/* Programs */

const programPublicSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  imageKey: true,
  imageAlt: true,
  ageGroup: true,
  objectives: true,
  deliveryFormat: true,
  availability: true,
  registrationOpen: true,
  isSample: true,
} satisfies Prisma.ProgramSelect;

publicRouter.get(
  '/programs',
  h(async (_req, res) => {
    const programs = await prisma.program.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' },
      select: programPublicSelect,
    });
    send(res, programs);
  }),
);

publicRouter.get(
  '/programs/:slug',
  h(async (req, res) => {
    const program = await prisma.program.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: {
        ...programPublicSelect,
        description: true,
        schedule: true,
        duration: true,
        requirements: true,
        feeInfo: true,
        priceCents: true,
        currency: true,
        registrationInfo: true,
        faq: true,
        // Only instructor display names are public; no contact details or other records.
        assignments: { select: { instructor: { select: { displayName: true } } } },
        modules: { where: { status: 'PUBLISHED' }, select: { slug: true, title: true, isPublic: true } },
      },
    });
    if (!program) throw notFound('Program not found.');
    const { assignments, ...rest } = program;
    send(res, { ...rest, instructors: assignments.map((a) => a.instructor.displayName) });
  }),
);

/* Events */

const eventPublicSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  locationType: true,
  location: true,
  audience: true,
  capacity: true,
  registrationOpen: true,
  registrationDeadline: true,
  priceCents: true,
  currency: true,
  imageKey: true,
  imageAlt: true,
  eventStatus: true,
  externalUrl: true,
  isSample: true,
} satisfies Prisma.EventSelect;

async function withSpaces<T extends { id: string; capacity: number | null }>(events: T[]) {
  if (events.length === 0) return [];
  const counts = await prisma.registration.groupBy({
    by: ['eventId'],
    where: { eventId: { in: events.map((e) => e.id) }, status: 'CONFIRMED' },
    _count: true,
  });
  const map = new Map(counts.map((c) => [c.eventId, c._count]));
  // Only an aggregate count is exposed, never who registered.
  return events.map((e) => ({
    ...e,
    spacesLeft: e.capacity == null ? null : Math.max(0, e.capacity - (map.get(e.id) ?? 0)),
  }));
}

publicRouter.get(
  '/events',
  h(async (req, res) => {
    const { when } = parse(z.object({ when: z.enum(['upcoming', 'past']).default('upcoming') }), req.query);
    const now = new Date();
    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED', startsAt: when === 'upcoming' ? { gte: now } : { lt: now } },
      orderBy: { startsAt: when === 'upcoming' ? 'asc' : 'desc' },
      take: 50,
      select: eventPublicSelect,
    });
    send(res, await withSpaces(events));
  }),
);

publicRouter.get(
  '/events/:slug',
  h(async (req, res) => {
    const event = await prisma.event.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { ...eventPublicSelect, description: true, registrationInfo: true },
    });
    if (!event) throw notFound('Event not found.');
    const [withCount] = await withSpaces([event]);
    send(res, withCount);
  }),
);

/* Photo gallery: public images an administrator placed in the gallery folder, with alt text */

publicRouter.get(
  '/gallery',
  h(async (_req, res) => {
    const assets = await prisma.mediaAsset.findMany({
      where: { folder: 'gallery', visibility: 'PUBLIC', NOT: { altText: '' } },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { id: true, filename: true, altText: true },
    });
    send(res, assets.map((a) => ({ id: a.id, url: `/uploads/${a.filename}`, alt: a.altText })));
  }),
);

/* Articles and learning resources */

const articleCategory = z.enum(['parenting', 'learning', 'leadership', 'digital', 'news']);
const articlePublicSelect = {
  slug: true,
  title: true,
  summary: true,
  category: true,
  imageKey: true,
  imageAlt: true,
  readMinutes: true,
  publishedAt: true,
  isSample: true,
} satisfies Prisma.ArticleSelect;

publicRouter.get(
  '/articles',
  h(async (req, res) => {
    const { category, q } = parse(z.object({ category: articleCategory.optional(), q: z.string().trim().max(100).optional() }), req.query);
    const articles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { summary: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      select: articlePublicSelect,
    });
    send(res, articles);
  }),
);

publicRouter.get(
  '/articles/:slug',
  h(async (req, res) => {
    const article = await prisma.article.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      // Only the author's display name is public.
      select: { ...articlePublicSelect, body: true, updatedAt: true, author: { select: { displayName: true } } },
    });
    if (!article) throw notFound('Article not found.');
    const { author, ...rest } = article;
    send(res, { ...rest, authorName: author?.displayName ?? null });
  }),
);

/* Pages managed in the content area */

publicRouter.get(
  '/pages/:slug',
  h(async (req, res) => {
    const page = await prisma.page.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      select: { slug: true, title: true, body: true, needsReview: true, updatedAt: true },
    });
    // No published version yet: the site shows its built in draft instead.
    send(res, page ?? null);
  }),
);
