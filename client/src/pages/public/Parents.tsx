import { Link } from 'react-router-dom';
import { ClipboardCheck, KeyRound, LineChart, ShieldCheck, UserPlus } from '../../components/ui/icons';
import { useSite } from '../../lib/site';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PhotoBand } from '../../components/content/PhotoBand';
import { PageHeader, Section, SectionHeading } from '../../components/layout/PageHeader';
import { SmartImage } from '../../components/brand/SmartImage';
import { Reveal, Stagger } from '../../components/motion/Reveal';
import { StepTimeline } from '../../components/content/StepTimeline';
import { ButtonLink, Placeholder } from '../../components/ui';

export default function Parents() {
  useDocumentTitle('Parents and families');
  const { site } = useSite();
  const steps = [
    { icon: UserPlus, title: 'Create your account', text: 'Sign up with your email address and confirm it. Your account is where you manage everything for your family.' },
    { icon: KeyRound, title: 'Add your child', text: 'Create a simple learning account with a nickname and a username. You choose the password and can change it at any time.' },
    { icon: ClipboardCheck, title: 'Register for activities', text: 'Choose a program or event and register your child. You give consent for each activity separately.' },
    { icon: LineChart, title: 'Follow their progress', text: 'See which lessons your child has finished, adjust their settings, or pause their account whenever you like.' },
  ];
  return (
    <>
      <PageHeader eyebrow="Parents and families" title="Everything you need to know as a parent or guardian" image="parents.main" actions={<><ButtonLink to="/register" size="lg">Create a parent account</ButtonLink><ButtonLink to="/contact" variant="secondary" size="lg">Ask a question</ButtonLink></>}>
        Children take part with your permission and under your control. Here is how registration, learning accounts and consent work.
      </PageHeader>

      <Section>
        <SectionHeading eyebrow="How it works" title="Four simple steps" />
        <StepTimeline steps={steps} />
      </Section>
      <PhotoBand
        image="home.families"
        eyebrow="Programs and activities"
        title="Learning that builds confidence"
        actions={<ButtonLink to="/programs" size="lg" variant="sun">Explore programs</ButtonLink>}
      >
        Browse the programs and events open to your child, with ages, format and how to register on each one.
      </PhotoBand>

      <Section tone="pale">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <Stagger className="space-y-10">
            <div>
              <h2 className="text-h3">Participation requirements</h2>
              <p className="mt-3 text-ink">Each program page lists who it is for and anything children need to bring or prepare. Children join with a parent or guardian’s consent. Some programs have an age range or limited places, and each page says so clearly. If you are unsure whether a program suits your child, send us a message and we will help.</p>
            </div>
            <div>
              <h2 className="text-h3">Registration and enquiries</h2>
              <p className="mt-3 text-ink">You can register online when a program or event shows that registration is open. For anything else, send us a message and we will reply by email.</p>
            </div>
            <div>
              <h2 className="text-h3">Fees and payment</h2>
              <p className="mt-3 text-ink">Any fees are shown on the program or event page. Children never pay directly; a parent or guardian handles any payment. Online payment is not yet available.</p>
            </div>
            <div>
              <h2 className="text-h3">Contact</h2>
              <p className="mt-3 text-ink">
                {site.contact.email ? <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> : <Placeholder>Family contact details to be confirmed</Placeholder>}
                {' '}or use the <Link to="/contact">contact form</Link>.
              </p>
            </div>
          </Stagger>
          <Reveal from="right">
            <SmartImage image="home.families" rounded="rounded-[1.75rem]" className="shadow-card" />
          </Reveal>
        </div>
      </Section>

      <Section>
        <Reveal from="scale" className="rounded-2xl border border-teal-100 bg-teal-50 p-6 sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal text-white"><ShieldCheck size={24} /></span>
            <div>
              <h2 className="text-h3">Your child’s safety and privacy</h2>
              <ul className="mt-4 grid gap-2 text-ink sm:grid-cols-2">
                <li>We only ask for a nickname, never a full name or birth date.</li>
                <li>Nothing about your child is ever shown publicly.</li>
                <li>There is no chat or messaging on this website.</li>
                <li>Instructors only see children in their own programs.</li>
                <li>You can download or delete your family’s data.</li>
                <li>You can withdraw consent at any time.</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
                <Link to="/child-safety">Child safety policy</Link>
                <Link to="/privacy">Privacy notice</Link>
                <Link to="/consent">Consent information</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
