import { useState } from 'react';
import { ArrowRight, HandHeart, Handshake, Mail, MailCheck, ShieldCheck, Sprout, Users } from '../../components/ui/icons';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ButtonLink } from '../../components/ui';
import { PhotoBand } from '../../components/content/PhotoBand';
import { PageHeader, Section, SectionHeading } from '../../components/layout/PageHeader';
import { StepTimeline, type Step } from '../../components/content/StepTimeline';
import { SmartImage } from '../../components/brand/SmartImage';
import { EnquiryForm } from '../../components/forms/EnquiryForm';
import { Reveal, Stagger } from '../../components/motion/Reveal';
import { cn } from '../../lib/cn';

const roles = [
  { id: 'mentor', category: 'mentor', icon: Users, image: 'home.involved' as const, title: 'Become a mentor', text: 'Share your experience with young people through structured, supervised activities. Mentors working with children complete the foundation’s safeguarding checks before taking part.', prompt: 'Tell us a little about your experience and why you would like to mentor.' },
  { id: 'volunteer', category: 'volunteer', icon: HandHeart, image: 'home.approach' as const, title: 'Volunteer with us', text: 'Help at events, support activities or lend a professional skill. Tell us what you enjoy doing and when you are available.', prompt: 'What would you like to help with, and when are you usually available?' },
  { id: 'partners', category: 'partner', icon: Handshake, image: 'about.main' as const, title: 'Partner with the foundation', text: 'Schools, community groups and organisations can work with us on programs, venues, resources or sponsorship.', prompt: 'Tell us about your organisation and the kind of partnership you have in mind.' },
];

const nextSteps: Step[] = [
  { icon: Mail, title: 'Send a short note', text: 'Use the form below to tell us how you would like to help.' },
  { icon: MailCheck, title: 'We reply by email', text: 'Someone from the foundation gets back to you with the next steps.' },
  { icon: ShieldCheck, title: 'Safeguarding checks', text: 'Anyone whose role involves children completes the foundation’s safeguarding checks first.' },
  { icon: Sprout, title: 'Get started', text: 'Begin with the activities agreed with the foundation.' },
];

export default function GetInvolved() {
  useDocumentTitle('Get involved');
  const [active, setActive] = useState(roles[0].id);
  const role = roles.find((r) => r.id === active)!;
  return (
    <>
      <PageHeader eyebrow="Get involved" title="Lend your time, skills or support" image="involved.main">
        There are different ways to help children learn and lead. Choose what suits you and send us a short note. We will reply with the next steps.
      </PageHeader>
      <Section>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {roles.map((r) => (
            <section key={r.id} id={r.id} className="group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-lift">
              <div className="relative overflow-hidden">
                <SmartImage image={r.image} ratio={4 / 3} rounded="rounded-none" className="transition-transform duration-700 group-hover:scale-[1.04]" sizes="(min-width: 768px) 33vw, 100vw" />
                <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-blue-700 shadow-card">
                  <r.icon size={17} />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h2 className="text-h3">{r.title}</h2>
                <p className="mt-2 flex-1 text-ink-muted">{r.text}</p>
                <a href="#enquiry" onClick={() => setActive(r.id)} className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold">
                  Express interest <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </section>
          ))}
        </Stagger>
      </Section>
      <Section tone="canvas">
        <SectionHeading eyebrow="What happens next" title="From first message to getting started" align="center" />
        <StepTimeline steps={nextSteps} />
      </Section>
      <PhotoBand
        image="community.main"
        eyebrow="Ready when you are"
        title="Every role starts with a conversation"
        actions={<ButtonLink to="/get-involved#enquiry" size="lg" variant="sun">Send a short note</ButtonLink>}
      >
        Tell us a little about yourself and we will explain the next steps, including the safeguarding checks for roles with children.
      </PhotoBand>
      <Section tone="pale" id="enquiry">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 className="text-h2">Tell us how you would like to help</h2>
            <p className="mt-4 text-lead text-ink-muted">We only ask for what we need to get back to you. We never publish lists of volunteers, mentors or partners without permission.</p>
            
          </div>
          <Reveal from="right" className="min-w-0 rounded-2xl bg-surface p-5 shadow-card sm:p-8">
            <div role="group" aria-label="Type of involvement" className="mb-6 flex flex-wrap gap-2">
              {roles.map((r) => (
                <button key={r.id} type="button" aria-pressed={active === r.id} onClick={() => setActive(r.id)} className={cn('min-h-10 rounded-full border px-4 text-sm font-semibold', active === r.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-line-strong text-heading hover:bg-blue-50')}>
                  {r.title.replace('Become a mentor', 'Mentor').replace('Volunteer with us', 'Volunteer').replace('Partner with the foundation', 'Partner')}
                </button>
              ))}
            </div>
            <EnquiryForm key={role.id} category={role.category} lockCategory showOrganization={role.id === 'partners'} messageLabel={role.prompt} submitLabel="Send my details" />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
