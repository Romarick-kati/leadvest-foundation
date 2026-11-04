import { describe, expect, it } from 'vitest';
import { isChatAvailable, whatsappLinkWith } from '../lib/contact';
import { fallbackSite } from '../lib/site';
import type { SiteSettings } from '../lib/types';

const contact = (over: Partial<SiteSettings['contact']> = {}): SiteSettings['contact'] => ({ ...fallbackSite.contact, whatsapp: '237650945402', ...over });
const hours = (over = {}) => ({ enabled: true, days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00', ...over });
// Cameroon is UTC+1 all year. 2026-11-02 is a Monday, 2026-11-07 a Saturday.
const at = (iso: string) => new Date(iso);

describe('isChatAvailable', () => {
  it('is available when no hours are set', () => {
    expect(isChatAvailable(contact(), at('2026-11-07T23:00:00Z'))).toBe(true);
  });
  it('the manual away switch always wins', () => {
    expect(isChatAvailable(contact({ whatsappAwayNow: true, whatsappHours: hours({ enabled: false }) }), at('2026-11-02T10:00:00Z'))).toBe(false);
  });
  it('uses Cameroon time, not the visitor time', () => {
    const c = contact({ whatsappHours: hours() });
    expect(isChatAvailable(c, at('2026-11-02T07:30:00Z'))).toBe(true); // 08:30 in Cameroon
    expect(isChatAvailable(c, at('2026-11-02T06:30:00Z'))).toBe(false); // 07:30 in Cameroon
    expect(isChatAvailable(c, at('2026-11-02T16:30:00Z'))).toBe(false); // 17:30 in Cameroon
  });
  it('is away on days that are not selected', () => {
    expect(isChatAvailable(contact({ whatsappHours: hours() }), at('2026-11-07T10:00:00Z'))).toBe(false);
  });
  it('supports hours that run past midnight', () => {
    const c = contact({ whatsappHours: hours({ from: '20:00', to: '02:00', days: [1] }) });
    expect(isChatAvailable(c, at('2026-11-02T20:00:00Z'))).toBe(true); // Monday 21:00
    expect(isChatAvailable(c, at('2026-11-03T00:00:00Z'))).toBe(true); // Tuesday 01:00, still Monday's shift
    expect(isChatAvailable(c, at('2026-11-03T02:00:00Z'))).toBe(false); // Tuesday 03:00
  });
});

describe('whatsappLinkWith', () => {
  const site = { ...fallbackSite, contact: contact() } as SiteSettings;
  it('puts the visitor message in the link', () => {
    expect(whatsappLinkWith(site, 'Hello & welcome')).toBe('https://wa.me/237650945402?text=Hello%20%26%20welcome');
  });
  it('falls back to the standard greeting when nothing is typed', () => {
    expect(whatsappLinkWith(site, '   ')).toMatch(/^https:\/\/wa\.me\/237650945402\?text=Hello%2C/);
  });
  it('gives no link without a number', () => {
    expect(whatsappLinkWith({ ...site, contact: contact({ whatsapp: null }) } as SiteSettings, 'Hi')).toBeNull();
  });
});
