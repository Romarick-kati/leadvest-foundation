import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, makeUser, resetDb, signIn } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

beforeEach(resetDb);

describe('public content caching', () => {
  it('lets a CDN briefly share public content that is the same for everyone', async () => {
    for (const path of ['/api/site', '/api/programs', '/api/events', '/api/pages/privacy']) {
      const res = await client().get(path);
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
      expect(res.headers['netlify-cdn-cache-control']).toBe('public, max-age=5');
    }
  });

  it('never marks private or failed responses as shareable', async () => {
    const missing = await client().get('/api/programs/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.headers['cache-control']).toBe('private, no-store');
    expect(missing.headers['netlify-cdn-cache-control']).toBeUndefined();

    const user = await makeUser('PARENT');
    const { c } = await signIn(user.email!);
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.headers['cache-control'] ?? '').not.toContain('public');
    expect(me.headers['netlify-cdn-cache-control']).toBeUndefined();
  });
});

describe('contact settings', () => {
  it('fills in new contact fields for settings saved before they existed', async () => {
    const before = await client().get('/api/site');
    const site = before.body.data;
    const { whatsapp: _w, whatsappMessage: _m, ...oldContact } = site.contact;
    await prisma.siteSetting.upsert({ where: { key: 'site' }, update: { value: { ...site, contact: oldContact } }, create: { key: 'site', value: { ...site, contact: oldContact } } });
    const after = (await client().get('/api/site')).body.data;
    expect(after.contact.whatsapp).toBeNull();
    expect(after.contact.whatsappMessage).toBeNull();
    expect(after.contact.social).toEqual(site.contact.social);
  });

  it('accepts a WhatsApp number as digits only, in international format', async () => {
    const { c: admin } = await adminClient();
    const site = (await admin.get('/api/admin/settings')).body.data.site;
    const bad = await admin.put('/api/admin/settings').send({ ...site, contact: { ...site.contact, whatsapp: '+1 (555) 000' } });
    expect(bad.status).toBe(400);
    const ok = await admin.put('/api/admin/settings').send({ ...site, contact: { ...site.contact, whatsapp: '15550000000', whatsappMessage: 'Hello' } });
    expect(ok.status).toBe(200);
    expect((await client().get('/api/site')).body.data.contact.whatsapp).toBe('15550000000');
  });
});

describe('enquiries', () => {
  it('accepts website feedback as a category', async () => {
    const res = await client()
      .post('/api/enquiries')
      .send({ category: 'feedback', name: 'Test Visitor', email: 'visitor@example.test', message: 'The menu works well on my phone.', consent: true });
    expect(res.status).toBe(201);
  });
});

describe('photo gallery', () => {
  it('lists only public images in the gallery folder that have alt text', async () => {
    const admin = await makeUser('ADMIN');
    const base = { mimeType: 'image/png', sizeBytes: 100, originalName: 'x.png', uploadedById: admin.id };
    await prisma.mediaAsset.createMany({
      data: [
        { ...base, filename: 'gallery/a.png', folder: 'gallery', visibility: 'PUBLIC', altText: 'Children at a workshop' },
        { ...base, filename: 'gallery/b.png', folder: 'gallery', visibility: 'PUBLIC', altText: '' },
        { ...base, filename: 'gallery/c.png', folder: 'gallery', visibility: 'PRIVATE', altText: 'Private photo' },
        { ...base, filename: 'general/d.png', folder: 'general', visibility: 'PUBLIC', altText: 'Not in the gallery' },
      ],
    });
    const res = await client().get('/api/gallery');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: expect.any(String), url: '/uploads/gallery/a.png', alt: 'Children at a workshop' }]);
  });
});

describe('impact figures', () => {
  it('are empty by default and only accept labelled figures, at most six', async () => {
    expect((await client().get('/api/site')).body.data.impact).toEqual({ asOf: null, note: null, items: [] });
    const { c: admin } = await adminClient();
    const site = (await admin.get('/api/admin/settings')).body.data.site;
    const item = { value: 120, prefix: '', suffix: '+', label: 'Children reached' };
    expect((await admin.put('/api/admin/settings').send({ ...site, impact: { ...site.impact, items: [{ ...item, label: '' }] } })).status).toBe(400);
    expect((await admin.put('/api/admin/settings').send({ ...site, impact: { ...site.impact, items: Array(7).fill(item) } })).status).toBe(400);
    expect((await admin.put('/api/admin/settings').send({ ...site, impact: { asOf: 'As of June 2026', note: null, items: [item] } })).status).toBe(200);
    expect((await client().get('/api/site')).body.data.impact.items).toEqual([item]);
  });
});
