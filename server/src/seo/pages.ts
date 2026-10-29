/**
 * What search engines (and anyone without JavaScript) see for each page: its own title, description,
 * canonical address, a short summary and links to the rest of the site. The page is then taken over
 * by the real interface as soon as it loads, so visitors see the full design.
 */

export const SITE_NAME = 'Lead Vest Foundation';

export interface SeoMeta {
  path: string;
  title: string;
  description: string;
  h1: string;
  /** Extra plain text, shown to crawlers and screen readers. */
  intro?: string;
  /** Extra links, for example the list of programs on /programs. */
  links?: { href: string; label: string; note?: string }[];
  jsonLd?: Record<string, unknown>;
  status?: number;
}

export const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Pages that do not come from the database. These are written into the site when it is built. */
export const staticPages: SeoMeta[] = [
  { path: '/', title: 'Learn. Grow. Lead.', description: 'Lead Vest Foundation is a safe place for children and young people to learn, get inspired and become confident leaders. Programs, events, lessons and more.', h1: 'Learn. Grow. Lead.', intro: 'Lead Vest Foundation helps children and young people learn, grow and become confident leaders through programs, events and an online learning area.' },
  { path: '/about', title: 'About us', description: 'Who we are, what guides us and how we work with children and young people. Learn about Lead Vest Foundation, its mission and its founder.', jsonLd: { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Lead Vest Foundation', url: '__SITE_URL__/about', mainEntity: { '@type': 'NGO', '@id': '__SITE_URL__/#organization', name: 'Lead Vest Foundation', areaServed: 'Cameroon', founder: { '@type': 'Person', '@id': '__SITE_URL__/about#founder', name: 'Neville Ebai', jobTitle: 'Founder', image: '__SITE_URL__/images/team/founder.webp', url: '__SITE_URL__/about' } } }, h1: 'About Lead Vest Foundation', intro: 'Our mission, our values and the way we work to help children and young people become confident leaders.' },
  { path: '/parents', title: 'For parents and guardians', description: 'How accounts, safety and payments work for parents and guardians. Create learning accounts for children under 16 and follow their progress.', h1: 'For parents and guardians', intro: 'Parents and guardians create and manage learning accounts for children under 16, give consent and register them for programs.' },
  { path: '/get-involved', title: 'Get involved', description: 'Volunteer, partner with us or help children and young people learn and grow. Find out how to take part in the work of Lead Vest Foundation.', h1: 'Get involved', intro: 'There are many ways to help: volunteer, partner with us, or share our programs.' },
  { path: '/support', title: 'Support our work', description: 'Support Lead Vest Foundation so more children and young people can learn, grow and lead.', h1: 'Support our work', intro: 'Learn how you can support the foundation and the young people it serves.' },
  { path: '/contact', title: 'Contact us', description: 'Contact Lead Vest Foundation with a question, an idea or a safeguarding concern. We read every message.', h1: 'Contact us', intro: 'Send us a message and we will reply as soon as we can.' },
  { path: '/faq', title: 'Frequently asked questions', description: 'Answers about accounts, ages, safety, payments and programs at Lead Vest Foundation.', h1: 'Frequently asked questions', intro: 'Find quick answers about how accounts, safety, payments and programs work.' },
  { path: '/privacy', title: 'Privacy notice', description: 'How Lead Vest Foundation collects, uses and protects personal information, including that of children.', h1: 'Privacy notice', intro: 'What information we collect, why, who handles it, how long we keep it and what your rights are.' },
  { path: '/terms', title: 'Terms of use', description: 'The terms for using the Lead Vest Foundation website, accounts and paid access.', h1: 'Terms of use', intro: 'The rules for using the website, creating an account and paying for access.' },
  { path: '/child-safety', title: 'Child safety', description: 'How Lead Vest Foundation keeps children safe online and in person, and how to raise a concern.', h1: 'Child safety', intro: 'Child safety comes first in everything we build. Read how the website protects children and how to raise a concern.' },
  { path: '/consent', title: 'Consent', description: 'How parents and guardians give, and withdraw, consent for children’s accounts and activities.', h1: 'Consent', intro: 'Why we ask for consent, what for, and how to change your mind.' },
  { path: '/cookies', title: 'Cookies', description: 'The few cookies and browser storage items this website uses, and how to manage them.', h1: 'Cookies', intro: 'We keep cookies to a minimum and do not use advertising cookies.' },
  { path: '/accessibility', title: 'Accessibility', description: 'How the Lead Vest Foundation website supports people with disabilities, and how to tell us about a problem.', h1: 'Accessibility', intro: 'Our aim is for everyone to be able to use this website.' },
];

/** The pages linked from every page, so a crawler can reach everything from anywhere. */
export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About us' },
  { href: '/programs', label: 'Programs' },
  { href: '/events', label: 'Events' },
  { href: '/learning', label: 'Learning area' },
  { href: '/resources', label: 'Resources and news' },
  { href: '/parents', label: 'For parents and guardians' },
  { href: '/get-involved', label: 'Get involved' },
  { href: '/support', label: 'Support our work' },
  { href: '/contact', label: 'Contact us' },
  { href: '/faq', label: 'Questions' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/child-safety', label: 'Child safety' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/register', label: 'Create an account' },
  { href: '/sign-in', label: 'Sign in' },
];

const visuallyHidden = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** The page's own content, as plain HTML that sits inside the app's root until the app loads. */
function contentHtml(meta: SeoMeta): string {
  const list = meta.links?.length
    ? `<ul>${meta.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a>${l.note ? ` – ${esc(l.note)}` : ''}</li>`).join('')}</ul>`
    : '';
  const nav = `<nav aria-label="Site pages"><ul>${navLinks.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul></nav>`;
  return `<main id="seo-content" style="${visuallyHidden}"><h1>${esc(meta.h1)}</h1>${meta.intro ? `<p>${esc(meta.intro)}</p>` : ''}${list}${nav}</main>`;
}

const fullTitle = (title: string) => (title === 'Learn. Grow. Lead.' ? `${SITE_NAME} | Learn. Grow. Lead.` : `${title} | ${SITE_NAME}`);

/** Puts one page's title, description, canonical address and content into the built index.html. */
export function applyTemplate(template: string, base: string, meta: SeoMeta, opts: { noindex?: boolean } = {}): string {
  const url = `${base}${meta.path === '/' ? '' : meta.path}`;
  const title = fullTitle(meta.title);
  const desc = meta.description.replace(/\s+/g, ' ').trim().slice(0, 160);
  let html = template.replaceAll('__SITE_URL__', base);
  html = html.replace('content="/images/branding/icon-512.png"', `content="${base}/images/branding/icon-512.png"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(desc)}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(desc)}" />`);
  const extra = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    opts.noindex ? '<meta name="robots" content="noindex" />' : '',
    meta.jsonLd ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replaceAll('__SITE_URL__', base).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ');
  html = html.replace('</head>', `    ${extra}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${contentHtml(meta)}</div>`);
  return html;
}
