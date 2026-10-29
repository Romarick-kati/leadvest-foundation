import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { setTemplateForTests } from '../src/seoTemplate.js';
import { client, resetDb } from './helpers.js';

const TEMPLATE = `<!doctype html><html><head><title>Lead Vest Foundation</title>
<meta name="description" content="x" />
<meta property="og:title" content="x" />
<meta property="og:description" content="x" />
<meta property="og:image" content="/images/branding/icon-512.png" />
</head><body><div id="root"></div></body></html>`;

const get = (path: string) => client().get(`/api/render${path}`).set('X-Forwarded-Host', 'example.org');

beforeEach(async () => {
  await resetDb();
  setTemplateForTests(TEMPLATE);
  await prisma.program.create({ data: { slug: 'leadership-lab', title: 'Leadership Lab', summary: 'Weekly sessions on leading with confidence.', description: 'A **practical** program for teens.', status: 'PUBLISHED' } });
  await prisma.program.create({ data: { slug: 'secret-draft', title: 'Hidden Draft', summary: 'Not public', description: 'Draft', status: 'DRAFT' } });
  await prisma.event.create({ data: { slug: 'open-day', title: 'Open Day', summary: 'Come and see.', description: 'Meet us.', startsAt: new Date('2027-03-01T10:00:00Z'), location: 'Douala', status: 'PUBLISHED' } });
});

describe('pages made from the database', () => {
  it('gives a program its own title, description, canonical address and structured data', async () => {
    const res = await get('/programs/leadership-lab');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Leadership Lab | Lead Vest Foundation</title>');
    expect(res.text).toContain('content="Weekly sessions on leading with confidence."');
    expect(res.text).toContain('<link rel="canonical" href="https://example.org/programs/leadership-lab" />');
    expect(res.text).toContain('"@type":"Course"');
    expect(res.text).toContain('<h1>Leadership Lab</h1>');
    expect(res.headers['netlify-cdn-cache-control']).toContain('s-maxage');
  });

  it('lists published programs with links, and never a draft', async () => {
    const res = await get('/programs');
    expect(res.status).toBe(200);
    expect(res.text).toContain('href="/programs/leadership-lab"');
    expect(res.text).not.toContain('Hidden Draft');
  });

  it('describes an event with its date and place for search engines', async () => {
    const res = await get('/events/open-day');
    expect(res.status).toBe(200);
    expect(res.text).toContain('"@type":"Event"');
    expect(res.text).toContain('"startDate":"2027-03-01T10:00:00.000Z"');
    expect(res.text).toContain('Douala');
  });

  it('returns a true 404, marked noindex, for an address that does not exist or is not published', async () => {
    for (const path of ['/programs/does-not-exist', '/programs/secret-draft', '/events/nope', '/resources/nope', '/learning/nope']) {
      const res = await get(path);
      expect(res.status).toBe(404);
      expect(res.text).toContain('content="noindex"');
    }
  });

  it('still opens the site with the plain page if the database fails', async () => {
    // an unknown base path is a 404, but a database error must never block the page
    const real = prisma.program.findFirst;
    (prisma.program as { findFirst: unknown }).findFirst = () => { throw new Error('db down'); };
    try {
      const res = await get('/programs/leadership-lab');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<div id="root">');
    } finally {
      (prisma.program as { findFirst: unknown }).findFirst = real;
    }
  });
});

describe('sitemap', () => {
  it('lists public content and leaves out drafts and sample content', async () => {
    await prisma.program.create({ data: { slug: 'sample-prog', title: 'Sample', summary: 's', description: 'd', status: 'PUBLISHED', isSample: true } });
    const res = await client().get('/api/sitemap.xml').set('X-Forwarded-Host', 'example.org');
    expect(res.text).toContain('https://example.org/programs/leadership-lab');
    expect(res.text).toContain('https://example.org/events/open-day');
    expect(res.text).not.toContain('secret-draft');
    expect(res.text).not.toContain('sample-prog');
  });
});
