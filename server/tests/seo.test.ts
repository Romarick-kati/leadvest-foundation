import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, client, resetDb } from './helpers.js';

beforeEach(async () => {
  await resetDb();
});

describe('search engines', () => {
  it('serves a sitemap with the main pages and the site address the visitor used', async () => {
    const res = await client().get('/api/sitemap.xml').set('X-Forwarded-Host', 'example.org');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('xml');
    expect(res.text).toContain('<loc>https://example.org</loc>');
    expect(res.text).toContain('<loc>https://example.org/programs</loc>');
    expect(res.text).toContain('<loc>https://example.org/privacy</loc>');
  });

  it('serves a robots file that hides private areas and points to the sitemap', async () => {
    const res = await client().get('/api/robots.txt').set('X-Forwarded-Host', 'example.org');
    expect(res.text).toContain('Disallow: /admin');
    expect(res.text).toContain('Disallow: /subscribe');
    expect(res.text).toContain('Sitemap: https://example.org/sitemap.xml');
  });
});

describe('legal details for the policy pages', () => {
  it('saves and returns the facts the policy pages are written from', async () => {
    const { c } = await adminClient();
    const current = await c.get('/api/admin/settings');
    const site = current.body.data.site;
    expect(site.legal.legalName).toBeNull();
    site.legal = { ...site.legal, legalName: 'Lead Vest Foundation Association', governingLaw: 'the laws of Cameroon', refundPolicy: 'Not refundable after access starts.' };
    expect((await c.put('/api/admin/settings').send(site)).status).toBe(200);
    const pub = await client().get('/api/site');
    expect(pub.body.data.legal.legalName).toBe('Lead Vest Foundation Association');
    expect(pub.body.data.legal.governingLaw).toBe('the laws of Cameroon');
  });
});
