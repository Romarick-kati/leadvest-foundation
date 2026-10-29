import { Reveal } from '../../components/motion/Reveal';
import { HeartHandshake, Lock } from '../../components/ui/icons';
import { useSite } from '../../lib/site';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PageHeader, Section } from '../../components/layout/PageHeader';
import { SmartImage } from '../../components/brand/SmartImage';
import { EnquiryForm } from '../../components/forms/EnquiryForm';
import { Alert } from '../../components/ui';

/**
 * Donations page. Online giving stays switched off until the foundation confirms the legal
 * entity, receiving account, payment provider, currency, donation terms and policies.
 */
export default function Support() {
  useDocumentTitle('Support our work');
  const { site } = useSite();
  const live = site.donations.enabled && site.integrations?.donationsLive;
  return (
    <>
      <PageHeader eyebrow="Support the foundation" title="Help more children learn and lead" image="donate.main">
        {site.donations.message ?? 'Your support helps the foundation create learning opportunities for young children. Here is how you can help today.'}
      </PageHeader>
      <Section>
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {!live && (
              <Alert tone="info" title="Online donations are not open yet">
                We are setting up a secure way to give online. Until then, please send us a message if you would like to support the foundation and we will tell you how.
              </Alert>
            )}
            <Reveal className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><HeartHandshake size={18} /></span>
                <h2 className="text-h3">Offer your support</h2>
              </div>
              <EnquiryForm category="support" lockCategory showOrganization messageLabel="How would you like to support the foundation?" submitLabel="Send" />
            </Reveal>
            <p className="flex items-start gap-2 text-caption text-ink-muted">
              <Lock size={14} className="mt-0.5 shrink-0" aria-hidden /> When online giving opens, payments will be handled by a regulated payment provider. Card details will never be stored on this website. Information about charitable status and tax treatment will be published only once confirmed.
            </p>
          </div>
          <Reveal from="right"><SmartImage image="home.families" rounded="rounded-[1.75rem]" className="shadow-card" /></Reveal>
        </div>
      </Section>
    </>
  );
}
