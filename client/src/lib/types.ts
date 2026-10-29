export type Role = 'PARENT' | 'LEARNER' | 'YOUTH' | 'MEMBER' | 'INSTRUCTOR' | 'ADMIN';
export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  preferences: {
    reduceMotion: boolean;
    textSize: 'standard' | 'large' | 'larger';
    underlineLinks: boolean;
    accent?: 'blue' | 'teal' | 'violet' | 'rose' | 'orange' | 'green';
    theme: 'system' | 'light' | 'dark';
    language: 'en' | 'fr' | 'es' | 'pt';
  } | null;
  googleLinked?: boolean;
  /** Whether the person has to pay the access fee, and whether they have. */
  access?: { required: boolean; active: boolean; lifetime: boolean; until: string | null; feeXaf: number; feeUsd: number | null; periodDays: number; providers: string[] };
}

export interface SiteSettings {
  organization: {
    name: string;
    shortName: string;
    tagline: string | null;
    mission: string | null;
    vision: string | null;
    values: { title: string; description: string }[];
    approach: string | null;
    registrationDetails: string | null;
    country: string | null;
    founderName: string | null;
    founderTitle: string | null;
  };
  contact: { email: string | null; phone: string | null; address: string | null; officeHours: string | null; social: { label: string; url: string }[]; whatsapp: string | null; whatsappMessage: string | null };
  branding: { logoUrl: string | null; logoMarkUrl: string | null; logoAlt: string };
  features: { learnerAccounts: boolean; eventRegistration: boolean; programRegistration: boolean };
  donations: { enabled: boolean; message: string | null; currency: string | null };
  impact: { asOf: string | null; note: string | null; items: ImpactItem[] };
  legal: { legalName: string | null; registrationNumber: string | null; dataRetention: string | null; safeguardingName: string | null; safeguardingContact: string | null; governingLaw: string | null; refundPolicy: string | null; lastReviewed: string | null };
  policies: { privacyApproved: boolean; childSafetyApproved: boolean; termsApproved: boolean };
  integrations?: { emailDelivery: boolean; payments: 'disabled' | 'mock' | 'fapshi' | 'flutterwave' | 'both'; paymentProviders?: string[]; donationsLive: boolean };
}

export interface ImpactItem {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
}

export interface ProgramSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageKey: string | null;
  imageAlt: string | null;
  ageGroup: string | null;
  objectives: string[];
  deliveryFormat: string | null;
  availability: string | null;
  registrationOpen: boolean;
  isSample: boolean;
}

export interface ProgramDetail extends ProgramSummary {
  description: string;
  schedule: string | null;
  duration: string | null;
  requirements: string | null;
  feeInfo: string | null;
  priceCents: number | null;
  currency: string | null;
  registrationInfo: string | null;
  faq: { question: string; answer: string }[];
  instructors: string[];
  modules: { slug: string; title: string; isPublic: boolean }[];
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  locationType: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
  location: string | null;
  audience: string | null;
  capacity: number | null;
  spacesLeft: number | null;
  registrationOpen: boolean;
  registrationDeadline: string | null;
  priceCents: number | null;
  currency: string | null;
  imageKey: string | null;
  imageAlt: string | null;
  eventStatus: 'SCHEDULED' | 'POSTPONED' | 'CANCELLED' | 'COMPLETED';
  externalUrl: string | null;
  isSample: boolean;
}

export interface EventDetail extends EventSummary {
  description: string;
  registrationInfo: string | null;
}

export interface ModuleSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  theme: 'sky' | 'sun' | 'mint';
  icon: string;
  ageGroup: string | null;
  isPublic: boolean;
  isSample: boolean;
  lessonCount: number;
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'activity'; title: string; text: string };

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
