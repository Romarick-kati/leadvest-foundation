import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// The contact form's "too fast" check must not depend on the visitor's clock matching the server's.
vi.mock('../src/lib/prisma.js', () => ({ prisma: { enquiry: { create: async () => ({ id: 'e1', createdAt: new Date() }) } } }));
vi.mock('../src/services/email/index.js', () => ({ sendEmail: async () => ({ delivered: false }) }));
vi.mock('../src/middleware/security.js', () => ({ formLimiter: (_q: unknown, _r: unknown, next: () => void) => next() }));

async function app() {
  const { enquiriesRouter } = await import('../src/modules/enquiries.routes.js');
  const { errorHandler } = await import('../src/middleware/errors.js');
  const a = express();
  a.use(express.json());
  a.use('/api/enquiries', enquiriesRouter);
  a.use(errorHandler);
  return a;
}

const base = { category: 'support', name: 'Pat', email: 'pat@example.test', message: 'I would like to help children online.', consent: true };

describe('enquiry spam timing', () => {
  it('accepts a visitor whose clock is ahead of the server', async () => {
    const a = await app();
    expect((await request(a).post('/api/enquiries').send({ ...base, startedAt: Date.now() + 3_600_000 })).status).toBe(201);
    expect((await request(a).post('/api/enquiries').send({ ...base, startedAt: Date.now() + 3_600_000, elapsedMs: 20_000 })).status).toBe(201);
  });
  it('still blocks instant bot submissions', async () => {
    const a = await app();
    expect((await request(a).post('/api/enquiries').send({ ...base, elapsedMs: 300 })).status).toBe(400);
    expect((await request(a).post('/api/enquiries').send({ ...base, startedAt: Date.now() })).status).toBe(400);
    expect((await request(a).post('/api/enquiries').send({ ...base, website: 'http://spam' })).status).toBe(400);
  });
});
