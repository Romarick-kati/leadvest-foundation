import { BookOpen, CalendarDays, Compass, GraduationCap, HandHeart, Handshake, Heart, Home, Info, Mail, MessageCircle, Newspaper, Users, type IconComponent } from '../ui/icons';

/** Labels and descriptions are translation keys (see src/i18n/locales). */
export interface NavLinkItem {
  to: string;
  label: string;
  description?: string;
  icon?: IconComponent;
}

export interface NavGroup {
  label: string;
  /** Where the group's overview lives, used for the active state. */
  match: string[];
  items: NavLinkItem[];
}

/** Desktop navigation: plain links and grouped panels. Every link goes to a page that exists. */
export const primaryNav: (NavLinkItem | NavGroup)[] = [
  { to: '/', label: 'nav.home' },
  {
    label: 'nav.about',
    match: ['/about', '/faq', '/support'],
    items: [
      { to: '/about', label: 'nav.aboutFoundation', description: 'nav.aboutFoundationDesc', icon: Info },
      { to: '/about#mission', label: 'nav.mission', description: 'nav.missionDesc', icon: Compass },
      { to: '/support', label: 'nav.support', description: 'nav.supportDesc', icon: Heart },
      { to: '/faq', label: 'nav.faq', description: 'nav.faqDesc', icon: MessageCircle },
    ],
  },
  {
    label: 'nav.ourWork',
    match: ['/programs', '/learning', '/events', '/resources'],
    items: [
      { to: '/programs', label: 'nav.programs', description: 'nav.programsDesc', icon: GraduationCap },
      { to: '/learning', label: 'nav.learning', description: 'nav.learningDesc', icon: BookOpen },
      { to: '/events', label: 'nav.events', description: 'nav.eventsDesc', icon: CalendarDays },
      { to: '/resources', label: 'nav.resources', description: 'nav.resourcesDesc', icon: Newspaper },
    ],
  },
  { to: '/parents', label: 'nav.families' },
  { to: '/programs', label: 'nav.programs' },
  {
    label: 'nav.getInvolved',
    match: ['/get-involved'],
    items: [
      { to: '/get-involved#mentor', label: 'nav.mentor', description: 'nav.mentorDesc', icon: Users },
      { to: '/get-involved#volunteer', label: 'nav.volunteer', description: 'nav.volunteerDesc', icon: HandHeart },
      { to: '/get-involved#partners', label: 'nav.partners', description: 'nav.partnersDesc', icon: Handshake },
    ],
  },
  { to: '/events', label: 'nav.events' },
];

export const isGroup = (item: NavLinkItem | NavGroup): item is NavGroup => 'items' in item;

export const mobileNav: { to: string; label: string; icon: IconComponent }[] = [
  { to: '/', label: 'nav.home', icon: Home },
  { to: '/about', label: 'nav.aboutUs', icon: Info },
  { to: '/programs', label: 'nav.programs', icon: GraduationCap },
  { to: '/learning', label: 'nav.learning', icon: BookOpen },
  { to: '/events', label: 'nav.events', icon: CalendarDays },
  { to: '/resources', label: 'nav.resources', icon: Newspaper },
  { to: '/parents', label: 'nav.parentsFamilies', icon: Users },
  { to: '/get-involved', label: 'nav.getInvolved', icon: HandHeart },
  { to: '/contact', label: 'nav.contact', icon: Mail },
];

export interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

/** Footer columns. Every link goes to a page that exists on this site. Labels are translation keys. */
export const footerNav: { title: string; links: FooterLink[] }[] = [
  {
    title: 'footer.foundation',
    links: [
      { to: '/about', label: 'nav.aboutUs' },
      { to: '/about#mission', label: 'nav.mission' },
      { to: '/get-involved', label: 'nav.getInvolved' },
      { to: '/support', label: 'nav.support' },
      { to: '/resources', label: 'nav.resources' },
    ],
  },
  {
    title: 'footer.programsFamilies',
    links: [
      { to: '/programs', label: 'nav.programs' },
      { to: '/learning', label: 'nav.learning' },
      { to: '/events', label: 'nav.events' },
      { to: '/parents', label: 'nav.parentsFamilies' },
      { to: '/get-involved#mentor', label: 'nav.mentor' },
    ],
  },
  {
    title: 'footer.help',
    links: [
      { to: '/faq', label: 'nav.faq' },
      { to: '/contact', label: 'nav.contact' },
      { to: '/contact?topic=feedback', label: 'footer.sendFeedback' },
      { to: '/forgot-password', label: 'footer.accountHelp' },
    ],
  },
  {
    title: 'footer.legal',
    links: [
      { to: '/privacy', label: 'footer.privacy' },
      { to: '/terms', label: 'footer.terms' },
      { to: '/child-safety', label: 'footer.childSafety' },
      { to: '/consent', label: 'footer.consent' },
      { to: '/cookies', label: 'footer.cookies' },
      { to: '/accessibility', label: 'footer.accessibility' },
    ],
  },
];

/** External resources. Listed as links only; no partnership is implied. */
// Address as given by the site owner (23 October 2026). Shown as a plain link; no partnership is stated.
export const externalResources: FooterLink[] = [
  { href: 'https://nevilleebaiconsulting.com/', label: 'Neville Ebai Consulting' },
  { href: 'https://nevilleebaiconsulting.com/about-us/', label: 'About Neville Ebai' },
];
