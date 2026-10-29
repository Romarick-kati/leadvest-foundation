import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { useSite } from '../../lib/site';
import { InstallApp } from './InstallApp';
import { usePreferences } from '../../lib/preferences';
import { useAuth } from '../../lib/auth';
import { socialLinks, SocialTiles, whatsappLink } from '../../lib/contact';
import { defaultContact, formatPhone, telHref } from '../../config/contact';
import { ArrowUp, ChevronDown, ExternalLink, Mail, MapPin, Phone, WhatsApp } from '../ui/icons';
import { cn } from '../../lib/cn';
import { externalResources, footerNav, type FooterLink } from './nav';
import { useT } from '../../i18n';
import { openCookieSettings } from '../privacy/consent';

function FooterItem({ link }: { link: FooterLink }) {
  const t = useT();
  const cls = 'inline-flex min-h-10 items-center gap-1.5 py-0.5 text-[0.95rem] text-white/80 no-underline transition-colors hover:text-white hover:underline md:min-h-0';
  if (link.href) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.label}
        <ExternalLink size={12} />
        <span className="sr-only">{t('common.opensNewTab')}</span>
      </a>
    );
  }
  return (
    <Link to={link.to!} className={cls}>
      {t(link.label)}
    </Link>
  );
}

/** One footer column. A disclosure button on phones, an always open list from md upwards. */
function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = `footer-${title.replace(/\W+/g, '-')}`;
  return (
    <nav aria-labelledby={`${id}-title`} className="border-b border-white/10 md:border-0">
      <h2 id={`${id}-title`} className="text-base font-bold !text-white md:mb-3 md:flex md:h-9 md:items-start md:text-xs md:uppercase md:tracking-[0.14em] md:!text-white/60">
        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between text-left md:hidden"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          {t(title)}
          <ChevronDown size={14} className={cn('transition-transform duration-200', open && 'rotate-180')} />
        </button>
        <span className="hidden md:inline">{t(title)}</span>
      </h2>
      <ul id={id} className={cn('pb-4 md:block md:space-y-1 md:pb-0', open ? 'block' : 'hidden')}>
        {links.map((l) => (
          <li key={l.label}>
            <FooterItem link={l} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const t = useT();
  const { site } = useSite();
  const { user } = useAuth();
  const { prefs, setVisitorPrefs, systemReducedMotion } = usePreferences();
  // Animation is off if the site setting says so, or the phone asks for it and the visitor has not switched it on here.
  const calmNow = prefs.reduceMotion || (systemReducedMotion && !prefs.motionOn);
  const year = new Date().getFullYear();
  const wa = whatsappLink(site);
  const { email, phone, address } = site.contact;
  const phones = phone && phone !== defaultContact.phones[0] ? [phone] : defaultContact.phones;
  const socials = socialLinks(site);

  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-orb rounded-full bg-sun/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 animate-orb-slow rounded-full bg-blue-600/20 blur-3xl" />

      {/* Contact strip: email, phones and WhatsApp side by side instead of one long column */}
      <div className="container-page relative pt-12">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr]">
          <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun text-navy"><Mail size={17} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Email us</p>
              {email ? (
                <a href={`mailto:${email}`} className="mt-1 block break-all text-[0.95rem] font-semibold text-white no-underline hover:text-sun hover:underline">{email}</a>
              ) : (
                <p className="mt-1 text-white/60">{t('footer.emailTbc')}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-4 sm:order-last lg:order-none">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun text-navy"><Phone size={17} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Call us</p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {phones.map((p) => (
                  <li key={p}>
                    <a href={telHref(p)} className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/10 px-3.5 text-sm font-semibold text-white no-underline transition-colors hover:border-sun hover:bg-sun hover:text-navy">
                      {formatPhone(p)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl bg-whatsapp/20 p-4 no-underline ring-1 ring-whatsapp/40 transition-colors hover:bg-whatsapp sm:col-span-2 lg:col-span-1">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white"><WhatsApp size={20} /></span>
              <span className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/70">WhatsApp</span>
                <span className="block font-semibold text-white">{t('footer.whatsapp')} <span className="sr-only">{t('common.opensNewTab')}</span></span>
              </span>
            </a>
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>
        {address && (
          <p className="mt-3 flex gap-3 text-sm text-white/75"><MapPin size={15} className="mt-0.5 shrink-0 text-sun" /> <span className="whitespace-pre-line">{address}</span></p>
        )}
      </div>

      <div className="container-page relative grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)] lg:gap-14">
        <div className="min-w-0 space-y-5">
          <Logo size={42} tone="white" />
          <p className="max-w-sm text-white/75">{site.organization.tagline ?? t('footer.tagline')}</p>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white/60">{t('footer.follow')}</p>
            <SocialTiles links={socials} />
          </div>
        </div>

        <div className="grid min-w-0 items-start md:grid-cols-2 md:gap-x-8 md:gap-y-8 xl:grid-cols-4">
          {footerNav.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.title === 'footer.help' ? [...col.links, ...externalResources] : col.links} />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-sm text-white/65 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {site.organization.name}. {site.organization.registrationDetails ?? t('footer.registrationTbc')}
            {site.organization.founderName ? ` ${site.organization.founderTitle ?? 'Founder'}: ${site.organization.founderName}.` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link to="/privacy" className="inline-flex min-h-10 items-center font-medium text-white/75 no-underline hover:text-white hover:underline">{t('footer.privacy')}</Link>
            <Link to="/terms" className="inline-flex min-h-10 items-center font-medium text-white/75 no-underline hover:text-white hover:underline">{t('footer.terms')}</Link>
            <button type="button" onClick={openCookieSettings} className="min-h-10 font-medium text-white/75 underline-offset-2 hover:text-white hover:underline">
              {t('footer.cookieSettings')}
            </button>
            <InstallApp className="min-h-10 font-medium text-sun underline-offset-2 hover:underline" />
            {!user && (
              <button
                type="button"
                className="min-h-10 font-medium text-white/75 underline-offset-2 hover:text-white hover:underline"
                onClick={() => setVisitorPrefs(calmNow ? { reduceMotion: false, motionOn: true } : { reduceMotion: true, motionOn: false })}
                aria-pressed={calmNow}
              >
                {calmNow ? t('footer.animationOn') : t('footer.animationOff')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: prefs.reduceMotion ? 'auto' : 'smooth' });
                document.getElementById('main')?.focus({ preventScroll: true });
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-4 font-semibold text-white transition-colors hover:bg-white hover:text-navy"
            >
              <ArrowUp size={13} /> {t('common.backToTop')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
