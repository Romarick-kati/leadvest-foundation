import { Compass, Eye, Heart } from '../../components/ui/icons';
import { useSite } from '../../lib/site';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PhotoMarquee } from '../../components/content/PhotoMarquee';
import { PageHeader, Section, SectionHeading } from '../../components/layout/PageHeader';
import { SmartImage } from '../../components/brand/SmartImage';
import { Reveal, Stagger } from '../../components/motion/Reveal';
import { ImpactStats } from '../../components/content/ImpactStats';
import { Gallery } from '../../components/content/Gallery';
import { Ambient } from '../../components/motion/Ambient';
import { ButtonLink, EmptyState, Placeholder } from '../../components/ui';

/** Shown until the foundation enters its own wording in Dashboard > Settings > Organisation. */
const DEFAULT_APPROACH = 'We learn through doing. Children and young people join structured, supervised programs, lessons and events where they build confidence, practise teamwork and take on small leadership roles, always with the guidance of trained adults and the knowledge of their families.';
const DEFAULT_MISSION = 'To give children and young people a safe place to learn, find inspiration and grow into confident, caring leaders.';
const DEFAULT_VISION = 'A community where every child and young person is supported to learn, lead and make a positive difference around them.';

export default function About() {
  useDocumentTitle('About the foundation');
  const { site } = useSite();
  const org = site.organization;
  return (
    <>
      <PageHeader eyebrow="About the foundation" title="Investing in children, building future leaders" image="about.main">
        {org.name} focuses on leadership development and on investing in young children, so that they grow up confident, curious and ready to make a difference.
      </PageHeader>

      <Section>
        <div className="grid gap-8 md:grid-cols-2">
          {[
            { id: 'mission', icon: <Compass size={20} />, title: 'Our mission', text: org.mission ?? DEFAULT_MISSION, tone: 'bg-blue-50 text-blue-700' },
            { id: 'vision', icon: <Eye size={20} />, title: 'Our vision', text: org.vision ?? DEFAULT_VISION, tone: 'bg-teal-50 text-teal' },
          ].map((b, i) => (
            <Reveal key={b.title} delay={i * 0.08} className="min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
              <span id={b.id} />
              <span className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg ${b.tone}`}>{b.icon}</span>
              <h2 className="text-h3">{b.title}</h2>
              <div className="mt-3 text-lead text-ink">{b.text ? <p>{b.text}</p> : <Placeholder>{b.title.replace('Our ', '')} statement to be supplied by the foundation</Placeholder>}</div>
            </Reveal>
          ))}
        </div>
      </Section>

      {site.impact.items.length > 0 && (
        <section className="relative isolate overflow-hidden bg-navy py-10 text-white sm:py-14">
          <Ambient tone="dark" />
          <div className="container-page">
            <ImpactStats impact={site.impact} tone="dark" />
          </div>
        </section>
      )}

      <Section tone="pale">
        <SectionHeading eyebrow="What guides us" title="Our values" />
        {org.values.length > 0 ? (
          <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {org.values.map((v) => (
              <li key={v.title} className="min-w-0 rounded-xl border border-line bg-surface p-6 shadow-card">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Heart size={16} /></span>
                <h3 className="text-h4">{v.title}</h3>
                <p className="mt-2 text-ink-muted">{v.description}</p>
              </li>
            ))}
          </Stagger>
        ) : (
          <EmptyState title="Values coming soon">The foundation’s values will be published here once they have been approved.</EmptyState>
        )}
      </Section>

      <section aria-labelledby="about-moments" className="overflow-hidden bg-surface pt-14 sm:pt-20">
        <div className="container-page">
          <SectionHeading id="about-moments" eyebrow="Learning together" title="Growing in confidence, together" align="center" />
        </div>
        <PhotoMarquee label="Photos of young people learning together" reverse />
      </section>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal from="left">
            <SmartImage image="home.approach" rounded="rounded-[1.75rem]" className="shadow-card" />
          </Reveal>
          <div>
            <SectionHeading eyebrow="How we work" title="Our approach" />
            <div className="prose-lvf">
              {org.approach ? <p>{org.approach}</p> : <p>{DEFAULT_APPROACH}</p>}
            </div>
          </div>
        </div>
      </Section>

      <Section tone="canvas">
        <SectionHeading eyebrow="Gallery" title="Moments from our work" />
        <Gallery />
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Organisation" title="Who we are" />
            <dl className="divide-y divide-line rounded-xl border border-line bg-surface shadow-soft">
              {[
                ['Name', org.name],
                ['Country of operation', org.country],
                ['Registration', org.registrationDetails],
                ...(org.founderName ? [[org.founderTitle ?? 'Founder', org.founderName]] : []),
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <dt className="text-label text-ink-muted">{k}</dt>
                  <dd className="text-heading">{v ?? <Placeholder>To be confirmed</Placeholder>}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <SectionHeading eyebrow="Our people" title="Our founder" />
            {org.founderName ? (
              <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft sm:grid sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <img src="/images/team/founder.webp" alt={`${org.founderName}, ${org.founderTitle ?? 'Founder'} of ${org.name}`} width={776} height={909} loading="lazy" className="aspect-[4/5] w-full object-cover object-top sm:h-full" />
                <figcaption className="flex flex-col justify-center gap-1 p-5 sm:p-6">
                  <span className="text-label text-ink-muted">{org.founderTitle ?? 'Founder'}</span>
                  <span className="text-h3">{org.founderName}</span>
                  <span className="text-ink-muted">{org.name}</span>
                </figcaption>
              </figure>
            ) : (
              <EmptyState title="Team profiles will appear here">
                We only publish names and photos of staff and volunteers with their permission and the foundation’s approval.
              </EmptyState>
            )}
          </div>
        </div>
      </Section>

      <Section>
        <div className="relative isolate flex flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl bg-navy p-6 text-white sm:flex-row sm:items-center sm:p-10">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(30rem_16rem_at_100%_0%,rgba(37,99,235,0.45),transparent)]" />
          <div className="min-w-0">
            <h2 className="text-h3 !text-white">Want to know more?</h2>
            <p className="mt-1 text-white/90">We are happy to answer questions about the foundation and its work.</p>
          </div>
          <ButtonLink to="/contact" variant="sun" size="lg">
            Get in touch
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
