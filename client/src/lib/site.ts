import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { SiteSettings } from './types';
import { defaultContact } from '../config/contact';

export const fallbackSite: SiteSettings = {
  organization: { name: 'Lead Vest Foundation', shortName: 'LVF', tagline: null, mission: null, vision: null, values: [], approach: null, registrationDetails: null, country: null, founderName: 'Neville Ebai', founderTitle: 'Founder' },
  contact: { email: null, phone: null, address: null, officeHours: null, social: [], whatsapp: null, whatsappMessage: null, whatsappGreeting: null, whatsappAway: null, whatsappAwayNow: false, whatsappHours: { enabled: false, days: [1, 2, 3, 4, 5], from: '08:00', to: '17:00' } },
  branding: { logoUrl: null, logoMarkUrl: null, logoAlt: 'Lead Vest Foundation' },
  features: { learnerAccounts: true, eventRegistration: true, programRegistration: true },
  donations: { enabled: false, message: null, currency: null },
  impact: { asOf: null, note: null, items: [] },
  legal: { legalName: null, registrationNumber: null, dataRetention: null, safeguardingName: null, safeguardingContact: null, governingLaw: null, refundPolicy: null, lastReviewed: null },
  policies: { privacyApproved: false, childSafetyApproved: false, termsApproved: false },
};

/** Public site settings. Falls back to built in placeholders if the API is unreachable. */
export function useSite() {
  const q = useQuery({ queryKey: ['site'], queryFn: () => api.get<SiteSettings>('/site'), staleTime: 15_000, refetchInterval: 60_000 });
  const base = q.data ?? fallbackSite;
  // Settings saved in the dashboard win; otherwise the owner supplied defaults (config/contact.ts).
  const c = base.contact;
  const site: SiteSettings = {
    ...base,
    // The foundation is registered and operates in Cameroon; the dashboard can still change these.
    organization: {
      ...base.organization,
      country: base.organization.country ?? 'Cameroon',
      registrationDetails: base.organization.registrationDetails ?? 'Registered foundation in Cameroon',
    },
    legal: { ...base.legal, governingLaw: base.legal.governingLaw ?? 'the laws of Cameroon' },
    contact: {
      ...c,
      email: c.email ?? defaultContact.email,
      phone: c.phone ?? defaultContact.phones[0] ?? null,
      whatsapp: c.whatsapp ?? defaultContact.whatsapp,
      whatsappMessage: c.whatsappMessage ?? defaultContact.whatsappMessage,
      social: c.social.length ? c.social : defaultContact.social,
      // Older saved settings have none of the chat fields yet.
      whatsappGreeting: c.whatsappGreeting ?? null,
      whatsappAway: c.whatsappAway ?? null,
      whatsappAwayNow: c.whatsappAwayNow ?? false,
      whatsappHours: c.whatsappHours ?? fallbackSite.contact.whatsappHours,
    },
  };
  return { site, loading: q.isLoading, error: q.error };
}
