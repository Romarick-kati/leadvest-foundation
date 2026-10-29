import { describe, expect, it } from 'vitest';
import { socialLinks, whatsappLink } from '../lib/contact';
import { fallbackSite } from '../lib/site';
import type { SiteSettings } from '../lib/types';

const withContact = (contact: Partial<SiteSettings['contact']>): SiteSettings => ({ ...fallbackSite, contact: { ...fallbackSite.contact, ...contact } });

describe('whatsappLink', () => {
  it('returns nothing until a number is configured', () => {
    expect(whatsappLink(withContact({ whatsapp: null }))).toBeNull();
  });

  it('uses the official wa.me format with an encoded greeting', () => {
    expect(whatsappLink(withContact({ whatsapp: '15550000000', whatsappMessage: 'Hi & hello' }))).toBe('https://wa.me/15550000000?text=Hi%20%26%20hello');
  });

  it('falls back to a default greeting and ignores numbers that are too short', () => {
    expect(whatsappLink(withContact({ whatsapp: '15550000000' }))).toMatch(/^https:\/\/wa\.me\/15550000000\?text=Hello%2C/);
    expect(whatsappLink(withContact({ whatsapp: '12345' }))).toBeNull();
  });
});

describe('socialLinks', () => {
  it('detects the network from the address and never invents links', () => {
    const links = socialLinks(
      withContact({
        social: [
          { label: '', url: 'https://www.facebook.com/example' },
          { label: '', url: 'https://youtu.be/example' },
          { label: 'Blog', url: 'https://blog.example.org' },
          { label: 'Broken', url: 'not a url' },
        ],
      }),
    );
    expect(links.map((l) => l.name)).toEqual(['Facebook', 'YouTube', 'Blog']);
  });

  it('is empty when no profiles are configured', () => {
    expect(socialLinks(withContact({ social: [] }))).toEqual([]);
  });
});
