import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * Creating a program or event from the dashboard: the web address is made from the title when it is
 * not typed, a similar title gets -2, -3, and so on, and a taken address gives a clear message on the
 * right field. Uses an in-memory stand-in for the database so it checks the real routes and rules.
 */
type Row = Record<string, unknown> & { id: string; slug: string };
const tables: Record<'program' | 'event', Row[]> = { program: [], event: [] };

function table(kind: 'program' | 'event') {
  return {
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) => tables[kind].find((r) => (where.id ? r.id === where.id : r.slug === where.slug)) ?? null,
    create: async ({ data }: { data: Record<string, unknown> & { slug: string } }) => {
      if (tables[kind].some((r) => r.slug === data.slug)) throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test', meta: { target: ['slug'] } });
      const row = { id: `${kind}${tables[kind].length + 1}`, ...data } as Row;
      tables[kind].push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = tables[kind].find((r) => r.id === where.id)!;
      if (typeof data.slug === 'string' && tables[kind].some((r) => r.id !== row.id && r.slug === data.slug)) throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test', meta: { target: ['slug'] } });
      Object.assign(row, data);
      return row;
    },
  };
}

vi.mock('../src/lib/prisma.js', () => ({ prisma: { program: table('program'), event: table('event') } }));
vi.mock('../src/lib/audit.js', () => ({ audit: async () => undefined }));
vi.mock('../src/services/notify.js', () => ({ announce: async () => undefined }));

async function app() {
  const { adminContentRouter } = await import('../src/modules/admin/content.js');
  const { errorHandler } = await import('../src/middleware/errors.js');
  const a = express();
  a.use(express.json());
  a.use('/api/admin', adminContentRouter);
  a.use(errorHandler);
  return a;
}

beforeEach(() => {
  tables.program = [];
  tables.event = [];
});

const program = { title: 'Reading Club!', summary: 'S', description: 'D' };
const event = { title: 'Open Day', summary: 'S', description: 'D', startsAt: '2027-03-01T10:00:00.000Z' };

describe('creating programs and events without typing a web address', () => {
  it('makes the address from the title', async () => {
    const a = await app();
    const p = await request(a).post('/api/admin/programs').send(program);
    expect(p.status).toBe(201);
    expect(p.body.data.slug).toBe('reading-club');
    const e = await request(a).post('/api/admin/events').send(event);
    expect(e.status).toBe(201);
    expect(e.body.data.slug).toBe('open-day');
  });

  it('adds a number when a similar title already exists, instead of failing', async () => {
    const a = await app();
    await request(a).post('/api/admin/events').send(event);
    const second = await request(a).post('/api/admin/events').send(event);
    const third = await request(a).post('/api/admin/events').send(event);
    expect(second.status).toBe(201);
    expect(second.body.data.slug).toBe('open-day-2');
    expect(third.body.data.slug).toBe('open-day-3');
  });

  it('copes with accents and symbols in the title', async () => {
    const a = await app();
    const r = await request(a).post('/api/admin/programs').send({ ...program, title: 'Éducation numérique & jeux' });
    expect(r.body.data.slug).toBe('education-numerique-jeux');
  });

  it('keeps a typed address, and says which field is wrong when it is already used', async () => {
    const a = await app();
    expect((await request(a).post('/api/admin/events').send({ ...event, slug: 'my-day' })).body.data.slug).toBe('my-day');
    const dup = await request(a).post('/api/admin/events').send({ ...event, slug: 'my-day' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.fields.slug).toMatch(/already used/);
  });

  it('shows a clear message on the address field when editing to a taken address', async () => {
    const a = await app();
    await request(a).post('/api/admin/programs').send({ ...program, slug: 'one' });
    const two = await request(a).post('/api/admin/programs').send({ ...program, slug: 'two' });
    const r = await request(a).patch(`/api/admin/programs/${two.body.data.id}`).send({ slug: 'one' });
    expect(r.status).toBe(409);
    expect(r.body.error.fields.slug).toMatch(/already used/);
  });

  it('still rejects missing required details with the field named', async () => {
    const a = await app();
    const r = await request(a).post('/api/admin/events').send({ title: 'No date', summary: 'S', description: 'D' });
    expect(r.status).toBe(400);
    expect(r.body.error.fields.startsAt).toBeTruthy();
  });
});
