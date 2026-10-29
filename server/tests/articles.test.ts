import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, makeUser, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(resetDb);

const article = { slug: 'reading-at-home', title: 'Reading at home', summary: 'Tips for families.', body: '## Start small\n\nTen minutes a day.', category: 'parenting', readMinutes: 3 };

describe('articles and resources', () => {
  it('lets an administrator draft, publish, edit and delete an article', async () => {
    const { c: admin } = await adminClient();
    const created = await admin.post('/api/admin/articles').send(article);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('DRAFT');
    expect(created.body.data.publishedAt).toBeNull();
    // Drafts are not public.
    expect((await client().get('/api/articles')).body.data).toHaveLength(0);
    expect((await client().get('/api/articles/reading-at-home')).status).toBe(404);

    const published = await admin.patch(`/api/admin/articles/${created.body.data.id}`).send({ status: 'PUBLISHED' });
    const publishedAt = published.body.data.publishedAt;
    expect(publishedAt).not.toBeNull();
    const edited = await admin.patch(`/api/admin/articles/${created.body.data.id}`).send({ title: 'Reading together at home' });
    expect(edited.body.data.publishedAt).toBe(publishedAt);

    const list = await client().get('/api/articles?category=parenting');
    expect(list.body.data.map((a: { slug: string }) => a.slug)).toEqual(['reading-at-home']);
    expect(list.body.data[0]).not.toHaveProperty('body');
    expect(list.body.data[0]).not.toHaveProperty('authorId');
    const one = await client().get('/api/articles/reading-at-home');
    expect(one.body.data.title).toBe('Reading together at home');
    expect(one.body.data.authorName).toBe('Test ADMIN');
    expect(one.body.data).not.toHaveProperty('author');

    const searched = await admin.get('/api/admin/articles?q=together&category=parenting');
    expect(searched.body.data.total).toBe(1);

    const del = await admin.delete(`/api/admin/articles/${created.body.data.id}`);
    expect(del.status).toBe(200);
    expect(await prisma.article.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'article.deleted' } })).toBe(1);
  });

  it('validates articles on the server and refuses duplicate addresses', async () => {
    const { c: admin } = await adminClient();
    const bad = await admin.post('/api/admin/articles').send({ ...article, category: 'gossip', title: '' });
    expect(bad.status).toBe(400);
    await admin.post('/api/admin/articles').send(article);
    const dup = await admin.post('/api/admin/articles').send(article);
    expect(dup.status).toBe(409);
  });

  it('keeps article management for administrators only', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    expect((await c.post('/api/admin/articles').send(article)).status).toBe(403);
    expect((await client().get('/api/admin/articles')).status).toBe(401);
  });
});

describe('appearance and language preferences', () => {
  it('saves theme and language for the signed in user and rejects unknown values', async () => {
    const parent = await makeUser('PARENT');
    const { c } = await signIn(parent.email!);
    const ok = await c.patch('/api/account/preferences').send({ theme: 'dark', language: 'pt' });
    expect(ok.status).toBe(200);
    const me = await c.get('/api/auth/me');
    expect(me.body.data.user.preferences).toMatchObject({ theme: 'dark', language: 'pt' });
    expect((await c.patch('/api/account/preferences').send({ language: 'de' })).status).toBe(400);
    expect((await c.patch('/api/account/preferences').send({ theme: 'neon' })).status).toBe(400);
  });
});

describe('partial edits', () => {
  it('keeps a published program published when only its title is edited', async () => {
    const { c: admin } = await adminClient();
    const created = await admin.post('/api/admin/programs').send({ slug: 'p1', title: 'Program one', summary: 'S', description: 'D', status: 'PUBLISHED' });
    const edited = await admin.patch(`/api/admin/programs/${created.body.data.id}`).send({ title: 'Program one renamed' });
    expect(edited.body.data.status).toBe('PUBLISHED');
    expect(edited.body.data.registrationOpen).toBe(false);
  });
});
