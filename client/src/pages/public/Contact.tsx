import { Reveal, Stagger } from '../../components/motion/Reveal';
import { useSearchParams } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone, ShieldCheck, WhatsApp } from '../../components/ui/icons';
import { useSite } from '../../lib/site';
import { SocialIcons, whatsappLink } from '../../lib/contact';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PageHeader, Section } from '../../components/layout/PageHeader';
import { EnquiryForm, enquiryCategories } from '../../components/forms/EnquiryForm';
import { Placeholder } from '../../components/ui';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';

export default function Contact() {
  const t = useT();
  useDocumentTitle(t('common.contactUs'));
  const { site } = useSite();
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const category = enquiryCategories.some((c) => c.value === topic) ? topic! : 'general';
  const c = site.contact;
  const wa = whatsappLink(site);
  const rows = [
    { icon: Mail, label: t('contact.emailLabel'), value: c.email && <a href={`mailto:${c.email}`} className="break-all">{c.email}</a> },
    { icon: Phone, label: t('contact.phoneLabel'), value: c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a> },
    { icon: MapPin, label: t('contact.addressLabel'), value: c.address && <span className="whitespace-pre-line">{c.address}</span> },
    { icon: Clock, label: t('contact.hoursLabel'), value: c.officeHours },
  ];
  return (
    <>
      <PageHeader eyebrow={t('contact.eyebrow')} title={t('contact.title')} image="contact.main">
        {t('contact.intro')}
      </PageHeader>
      <Section>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
          <Reveal className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
            <h2 className="mb-6 text-h3">{t('contact.sendMessage')}</h2>
            <EnquiryForm key={category} category={category} />
          </Reveal>
          <Stagger as="aside" className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-line bg-canvas p-5 sm:p-6">
              <h2 className="text-h4">{t('contact.otherWays')}</h2>
              <ul className="mt-5 space-y-5">
                {rows.map(({ icon: Icon, label, value }) => (
                  <li key={label} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-blue-700 shadow-soft">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-caption font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
                      <p className="text-heading">{value || <Placeholder>{t('common.toBeConfirmed')}</Placeholder>}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 font-semibold text-white no-underline hover:bg-whatsapp-700">
                  <WhatsApp size={18} /> {t('contact.chatWhatsapp')} <span className="sr-only">{t('common.opensNewTab')}</span>
                </a>
              )}
            </div>
            {c.social.length > 0 && (
              <div className="rounded-2xl border border-line p-5 sm:p-6">
                <h2 className="mb-4 text-h4">{t('contact.followUs')}</h2>
                <SocialIcons site={site} />
              </div>
            )}
            <div className="flex gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-5 text-sm text-ink">
              <ShieldCheck size={18} className="mt-0.5 text-teal" />
              <p>
                {t('contact.safetyPrefix')} <Link to="/child-safety" className="underline">{t('contact.safetyLink')}</Link> {t('contact.safetySuffix')}
              </p>
            </div>
          </Stagger>
        </div>
      </Section>
    </>
  );
}
