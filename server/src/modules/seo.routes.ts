import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { h } from '../lib/http.js';
import { siteUrl } from '../lib/siteUrl.js';
import { logger } from '../lib/logger.js';
import { loadTemplate } from '../seoTemplate.js';
import { applyTemplate, SITE_NAME, staticPages, type SeoMeta } from '../seo/pages.js';

/**
 * Pages whose content comes from the database (programs, events, articles, lessons). Netlify sends
 * these addresses here, and this returns the real page shell with its own title, description,
 * canonical address, structured data and links, plus the right status: an address that does not
 * exist gets a true 404, not a page that pretends to be fine. The page is then cached at the edge
 * so it stays fast. If the database is down, a plain shell is returned so the site still opens.
 */
export const seoRouter = Router();

const plain = (md: string, n = 300) => md.replace(/[#*_`>\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

const NOT_FOUND: SeoMeta = { path: '/404', title: 'Page not found', description: 'This page could not be found.', h1: 'Page not found', intro: 'The page you asked for does not exist. Try the links below.', status: 404 };

async function resolve(path: string): Promise<SeoMeta> {
  const known = staticPages.find((p) => p.path === path);
  if (known) return known;
  const seg = path.split('/').filter(Boolean);

  if (path === '/programs') {
    const items = await prisma.program.findMany({ where: { status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' }, select: { slug: true, title: true, summary: true }, take: 100 });
    return { path, title: 'Programs', description: 'Programs for children and young people at Lead Vest Foundation: what they cover, who they are for and how to join.', h1: 'Our programs', intro: 'Programs that help children and young people learn, grow and lead.', links: items.map((i) => ({ href: `/programs/${i.slug}`, label: i.title, note: i.summary })) };
  }
  if (seg[0] === 'programs' && seg.length === 2) {
    const p = await prisma.program.findFirst({ where: { slug: seg[1], status: 'PUBLISHED' } });
    if (!p) return NOT_FOUND;
    return { path, title: p.title, description: p.summary, h1: p.title, intro: `${p.summary} ${plain(p.description, 500)}`, jsonLd: { '@context': 'https://schema.org', '@type': 'Course', name: p.title, description: p.summary, provider: { '@type': 'NGO', name: SITE_NAME } } };
  }
  if (path === '/events') {
    const items = await prisma.event.findMany({ where: { status: 'PUBLISHED' }, orderBy: { startsAt: 'desc' }, select: { slug: true, title: true, summary: true, startsAt: true }, take: 100 });
    return { path, title: 'Events', description: 'Workshops, open days and activities from Lead Vest Foundation for children, young people and families.', h1: 'Events and activities', intro: 'Upcoming and past events and activities.', links: items.map((i) => ({ href: `/events/${i.slug}`, label: i.title, note: `${i.startsAt.toISOString().slice(0, 10)}. ${i.summary}` })) };
  }
  if (seg[0] === 'events' && seg.length === 2) {
    const e = await prisma.event.findFirst({ where: { slug: seg[1], status: 'PUBLISHED' } });
    if (!e) return NOT_FOUND;
    return { path, title: e.title, description: e.summary, h1: e.title, intro: `${e.startsAt.toISOString().slice(0, 10)}${e.location ? `, ${e.location}` : ''}. ${e.summary} ${plain(e.description, 500)}`, jsonLd: { '@context': 'https://schema.org', '@type': 'Event', name: e.title, description: e.summary, startDate: e.startsAt.toISOString(), ...(e.location ? { location: { '@type': 'Place', name: e.location } } : {}), organizer: { '@type': 'NGO', name: SITE_NAME } } };
  }
  if (path === '/resources') {
    const items = await prisma.article.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, select: { slug: true, title: true, summary: true }, take: 100 });
    return { path, title: 'Resources and news', description: 'Helpful reading and news for parents, carers and young people from Lead Vest Foundation.', h1: 'Resources and news', intro: 'Articles and guides for families and young people.', links: items.map((i) => ({ href: `/resources/${i.slug}`, label: i.title, note: i.summary })) };
  }
  if (seg[0] === 'resources' && seg.length === 2) {
    const a = await prisma.article.findFirst({ where: { slug: seg[1], status: 'PUBLISHED' } });
    if (!a) return NOT_FOUND;
    return { path, title: a.title, description: a.summary, h1: a.title, intro: `${a.summary} ${plain(a.body, 600)}`, jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.summary, ...(a.publishedAt ? { datePublished: a.publishedAt.toISOString() } : {}), dateModified: a.updatedAt.toISOString(), publisher: { '@type': 'NGO', name: SITE_NAME } } };
  }
  if (path === '/learning') {
    const items = await prisma.learningModule.findMany({ where: { status: 'PUBLISHED', isPublic: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true, description: true }, take: 100 });
    return { path, title: 'Learning area', description: 'Free lessons, quizzes and badges that help children and young people learn about life, work and leadership.', h1: 'The learning area', intro: 'Lessons, quizzes and badges for children and young people.', links: items.map((i) => ({ href: `/learning/${i.slug}`, label: i.title, note: i.description })) };
  }
  if (seg[0] === 'learning' && (seg.length === 2 || seg.length === 3)) {
    const m = await prisma.learningModule.findFirst({ where: { slug: seg[1], status: 'PUBLISHED', isPublic: true }, include: { lessons: { orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true } } } });
    if (!m) return NOT_FOUND;
    if (seg.length === 2) return { path, title: m.title, description: m.description, h1: m.title, intro: m.description, links: m.lessons.map((l) => ({ href: `/learning/${m.slug}/${l.slug}`, label: l.title })) };
    const l = m.lessons.find((x) => x.slug === seg[2]);
    if (!l) return NOT_FOUND;
    return { path, title: `${l.title}, ${m.title}`, description: `${l.title}: a lesson in ${m.title}. ${m.description}`, h1: l.title, intro: `A lesson in ${m.title}.` };
  }
  return NOT_FOUND;
}

seoRouter.get(
  '/render/*',
  h(async (req, res) => {
    const template = loadTemplate();
    const path = `/${String(req.params[0] ?? '').replace(/^\/+|\/+$/g, '')}`;
    const base = siteUrl(req);
    if (!template) {
      res.status(404).type('text').send('Page renderer is not available on this server.');
      return;
    }
    let meta: SeoMeta;
    try {
      meta = await resolve(path);
    } catch (e) {
      // The database is unreachable: serve the plain shell with a 200 so people can still use the site.
      logger.error({ err: (e as Error).message, path }, 'page render fell back to the plain shell');
      res.status(200).set('Cache-Control', 'no-cache').type('html').send(template.replaceAll('__SITE_URL__', base));
      return;
    }
    const status = meta.status ?? 200;
    res
      .status(status)
      .type('html')
      .set('Cache-Control', 'public, max-age=0, must-revalidate')
      .set('Netlify-CDN-Cache-Control', status === 200 ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'public, s-maxage=60')
      .send(applyTemplate(template, base, status === 200 ? meta : { ...meta, path }, { noindex: status !== 200 }));
  }),
);
