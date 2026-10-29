import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.SETUP_TOKEN = 'test-setup-token-0123456789abcdef';
  process.env.TRUST_SAME_HOST_ORIGIN = 'true';
  process.env.STORAGE_DRIVER = 'local';
});

import request from 'supertest';
import { PASSWORD, adminClient, app, client, makeUser, resetDb, signIn } from './helpers.js';
import { handler } from '../src/netlify.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');

beforeEach(resetDb);

describe('first administrator setup', () => {
  const body = { token: 'test-setup-token-0123456789abcdef', displayName: 'First Admin', email: 'first@example.test', password: PASSWORD };

  it('is available only until an administrator exists', async () => {
    const c = client();
    expect((await c.get('/api/setup/status')).body.data.available).toBe(true);
    expect((await c.post('/api/setup/first-admin').send({ ...body, token: 'wrong-token' })).status).toBe(403);
    expect((await c.post('/api/setup/first-admin').send(body)).status).toBe(201);
    expect((await c.get('/api/setup/status')).body.data.available).toBe(false);
    const again = await c.post('/api/setup/first-admin').send({ ...body, email: 'second@example.test' });
    expect(again.status).toBe(410);
  });

  it('is closed when an administrator already exists', async () => {
    await makeUser('ADMIN');
    const res = await client().post('/api/setup/first-admin').send(body);
    expect(res.status).toBe(410);
  });

  it('still requires two factor before the dashboard', async () => {
    await client().post('/api/setup/first-admin').send(body);
    const { c, res } = await signIn('first@example.test');
    expect(res.status).toBe(200);
    const overview = await c.get('/api/admin/overview');
    expect(overview.status).toBe(403);
    expect(overview.body.error.code).toBe('admin_mfa_required');
  });
});

describe('same host origin (Netlify)', () => {
  it('accepts an https origin that matches the host', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Host', 'preview--lvf.netlify.app')
      .set('Origin', 'https://preview--lvf.netlify.app')
      .set('X-Requested-With', 'lvf-web')
      .send({ identifier: 'nobody@example.test', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('refuses an origin for another site', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Host', 'lvf.netlify.app')
      .set('Origin', 'https://evil.example')
      .set('X-Requested-With', 'lvf-web')
      .send({ identifier: 'nobody@example.test', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('bad_origin');
  });
});

describe('uploaded images', () => {
  it('serves public uploads and refuses odd paths', async () => {
    const { c } = await adminClient();
    const up = await c.post('/api/admin/media').field('folder', 'general').attach('file', PNG, 'dot.png');
    expect(up.status).toBe(201);
    const file = await request(app).get(`/uploads/${up.body.data.filename}`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0);
    expect((await request(app).get('/uploads/general/..%2F..%2Fpackage.json')).status).toBe(404);
  });

  it('never serves private uploads publicly', async () => {
    const { c } = await adminClient();
    const up = await c.post('/api/admin/media').field('visibility', 'PRIVATE').attach('file', PNG, 'dot.png');
    expect(up.status).toBe(201);
    expect((await request(app).get(`/uploads/${up.body.data.filename}`)).status).toBe(404);
    expect((await c.get(`/api/admin/media/${up.body.data.id}/file`)).status).toBe(200);
  });
});

describe('Netlify Function entry', () => {
  const event = (path: string) => ({
    httpMethod: 'GET',
    path,
    rawUrl: `https://lvf.netlify.app${path}`,
    rawQuery: '',
    headers: { host: 'lvf.netlify.app', 'x-nf-client-connection-ip': '203.0.113.9' },
    multiValueHeaders: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    body: null,
    isBase64Encoded: false,
  });

  it('answers through the function handler, with or without the function path', async () => {
    for (const path of ['/api/site', '/.netlify/functions/api/api/site']) {
      const res = (await handler(event(path) as never, {})) as { statusCode: number; body: string };
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.organization.name).toBe('Lead Vest Foundation');
    }
  });
});
