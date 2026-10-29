import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/**
 * Editable site content and configuration. Values left as null are shown on the
 * website as clearly marked placeholders. Nothing here is real foundation data
 * until an administrator enters approved information.
 */
export const siteSettingsSchema = z.object({
  organization: z.object({
    name: z.string().max(120),
    shortName: z.string().max(20),
    tagline: z.string().max(200).nullable(),
    mission: z.string().max(2000).nullable(),
    vision: z.string().max(2000).nullable(),
    values: z.array(z.object({ title: z.string().max(60), description: z.string().max(400) })).max(8),
    approach: z.string().max(3000).nullable(),
    registrationDetails: z.string().max(500).nullable(),
    country: z.string().max(80).nullable(),
    founderName: z.string().max(120).nullable(),
    founderTitle: z.string().max(80).nullable(),
  }),
  contact: z.object({
    email: z.string().max(254).nullable(),
    phone: z.string().max(40).nullable(),
    address: z.string().max(300).nullable(),
    officeHours: z.string().max(200).nullable(),
    social: z.array(z.object({ label: z.string().max(40), url: z.string().url().max(300) })).max(8),
    // WhatsApp number in international format, digits only (country code first, no + or spaces).
    // Leave null until the foundation confirms the number; the chat button stays hidden until then.
    whatsapp: z.string().regex(/^\d{8,15}$/, 'Use digits only, with the country code first.').nullable(),
    whatsappMessage: z.string().max(300).nullable(),
  }),
  branding: z.object({
    // Paths or URLs to the official assets once supplied. Null uses the built in placeholder.
    logoUrl: z.string().max(300).nullable(),
    logoMarkUrl: z.string().max(300).nullable(),
    logoAlt: z.string().max(120),
  }),
  features: z.object({
    learnerAccounts: z.boolean(),
    eventRegistration: z.boolean(),
    programRegistration: z.boolean(),
  }),
  donations: z.object({
    // Stays false until the legal entity, account, provider, currency and terms are confirmed.
    enabled: z.boolean(),
    message: z.string().max(1000).nullable(),
    currency: z.string().max(3).nullable(),
  }),
  impact: z.object({
    // Figures shown as animated counters ("At a glance"). Only figures the foundation can
    // evidence belong here; the section stays hidden while the list is empty.
    asOf: z.string().max(80).nullable(),
    note: z.string().max(300).nullable(),
    items: z
      .array(
        z.object({
          value: z.number().min(0).max(1_000_000_000),
          prefix: z.string().max(3),
          suffix: z.string().max(8),
          label: z.string().min(1).max(80),
        }),
      )
      .max(6),
  }),
  // Facts the policy pages are built from. Filling these in completes the Privacy, Terms, Child safety,
  // Consent and Cookies pages without anyone editing their text. Nothing is invented: a blank stays a
  // clearly marked gap on the page.
  legal: z.object({
    legalName: z.string().max(200).nullable(),
    registrationNumber: z.string().max(120).nullable(),
    dataRetention: z.string().max(800).nullable(),
    safeguardingName: z.string().max(120).nullable(),
    safeguardingContact: z.string().max(200).nullable(),
    governingLaw: z.string().max(160).nullable(),
    refundPolicy: z.string().max(1200).nullable(),
    lastReviewed: z.string().max(60).nullable(),
  }),
  policies: z.object({
    // Draft policies display a review notice until an administrator marks them approved.
    privacyApproved: z.boolean(),
    childSafetyApproved: z.boolean(),
    termsApproved: z.boolean(),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const defaultSiteSettings: SiteSettings = {
  organization: {
    name: 'Lead Vest Foundation',
    shortName: 'LVF',
    tagline: null,
    mission: null,
    vision: null,
    values: [],
    approach: null,
    registrationDetails: 'Registered foundation in Cameroon',
    country: 'Cameroon',
    founderName: 'Neville Ebai',
    founderTitle: 'Founder',
  },
  contact: { email: null, phone: null, address: null, officeHours: null, social: [], whatsapp: null, whatsappMessage: null },
  branding: { logoUrl: null, logoMarkUrl: null, logoAlt: 'Lead Vest Foundation' },
  features: { learnerAccounts: true, eventRegistration: true, programRegistration: true },
  donations: { enabled: false, message: null, currency: null },
  impact: { asOf: null, note: null, items: [] },
  legal: { legalName: null, registrationNumber: null, dataRetention: null, safeguardingName: null, safeguardingContact: null, governingLaw: 'the laws of Cameroon', refundPolicy: null, lastReviewed: null },
  policies: { privacyApproved: false, childSafetyApproved: false, termsApproved: false },
};

const KEY = 'site';

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  if (!row) return defaultSiteSettings;
  // Merge each section with its defaults, so settings saved before a field existed still load.
  const saved = (row.value ?? {}) as Record<string, unknown>;
  const merged = Object.fromEntries(
    Object.entries(defaultSiteSettings).map(([section, defaults]) => [section, { ...defaults, ...((saved[section] as object) ?? {}) }]),
  );
  const parsed = siteSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSiteSettings;
}

export async function saveSiteSettings(value: SiteSettings) {
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}
