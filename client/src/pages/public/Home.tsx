import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, ClipboardCheck, HandHeart, Handshake, LineChart, ShieldCheck, Sprout, UserPlus, Users } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useSite } from '../../lib/site';
import type { EventSummary, ProgramSummary } from '../../lib/types';
import type { ImageKey } from '../../config/images';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ButtonLink, CardSkeleton, EmptyState } from '../../components/ui';
import { Carousel } from '../../components/ui/Carousel';
import { SmartImage } from '../../components/brand/SmartImage';
import { Section, SectionHeading } from '../../components/layout/PageHeader';
import { ProgramCard } from '../../components/content/ProgramCard';
import { EventItem } from '../../components/content/EventItem';
import { ImpactStats } from '../../components/content/ImpactStats';
import { StepTimeline, type Step } from '../../components/content/StepTimeline';
import { Ambient } from '../../components/motion/Ambient';
import { HeroBadge, HeroDecor, HeroWave, usePointerParallax } from '../../components/motion/HeroDecor';
import { SplitWords, WordRibbon } from '../../components/motion/HeroExtras';
import { Reveal, Stagger } from '../../components/motion/Reveal';
import { PhotoMarquee } from '../../components/content/PhotoMarquee';
import { PhotoBand } from '../../components/content/PhotoBand';

const services: { to: string; image: ImageKey; title: string; text: string; cta: string }[] = [
  { to: '/programs', image: 'programs.main', title: 'Programs', text: 'Structured leadership and learning activities, each with clear ages, format and how to take part.', cta: 'Explore programs' },
  { to: '/learning', image: 'learning.main', title: 'Learning area', text: 'Short lessons and friendly quizzes for children and young people, with progress saved in a free account.', cta: 'Start learning' },
  { to: '/events', image: 'events.main', title: 'Events', text: 'Workshops and events, with registration details on each event.', cta: 'See events' },
];

// How taking part works on this website, step by step. Each step is a real feature of the site.
const steps: Step[] = [
  { icon: UserPlus, title: 'Create a free account', text: 'Sign up with Google or your email. Young people (16 and over) can join on their own; parents sign up for their children.' },
  { icon: Users, title: 'Add your child (under 16)', text: 'Parents set up a learning account for a child from Family settings and stay in control of it.' },
  { icon: ClipboardCheck, title: 'Choose and register', text: 'Pick a program or event and register your child, with your consent recorded.' },
  { icon: LineChart, title: 'Follow their progress', text: 'See completed lessons and upcoming activities from your account at any time.' },
];

const safeguards = ['No public profiles or photos of children', 'No chat or private messaging with children', 'No advertising or tracking in the learning area'];

const roles: { icon: typeof Users; title: string; text: string; to: string; image: ImageKey }[] = [
  { icon: Users, title: 'Become a mentor', text: 'Share your time and experience through supervised activities.', to: '/get-involved#mentor', image: 'home.involved' },
  { icon: HandHeart, title: 'Volunteer', text: 'Help at events, support activities or lend a professional skill.', to: '/get-involved#volunteer', image: 'home.approach' },
  { icon: Handshake, title: 'Partner with us', text: 'Schools, community groups and organisations working with us.', to: '/get-involved#partners', image: 'about.main' },
];

export default function Home() {
  useDocumentTitle(undefined);
  const { site } = useSite();
  const heroRef = useRef<HTMLElement>(null);
  usePointerParallax(heroRef);
  const programs = useQuery({ queryKey: ['programs'], queryFn: () => api.get<ProgramSummary[]>('/programs') });
  const events = useQuery({ queryKey: ['events', 'upcoming'], queryFn: () => api.get<EventSummary[]>('/events?when=upcoming') });

  return (
    <>
      {/* Hero: full screen photo, navy overlay, gold accents, floating text and cards */}
      <section ref={heroRef} className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden lg:max-h-[56rem] bg-navy text-white" aria-labelledby="hero-title">
        <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
          <SmartImage image="about.main" priority fill rounded="rounded-none" sizes="100vw" className="hero-kenburns" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/35" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-transparent to-navy/40" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/4 -z-10 h-80 w-80 animate-orb rounded-full bg-sun/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-10 -z-10 h-96 w-96 animate-orb rounded-full bg-blue-600/30 blur-3xl" />

        <HeroDecor />
        <HeroWave className={site.impact.items.length > 0 ? 'text-navy' : 'text-surface'} />

        <div className="container-page grid items-center gap-10 pb-24 pt-10 sm:pb-32 sm:pt-20 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-16">
          <div className="hero-rise min-w-0 max-w-3xl">
            <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-sun/40 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-sun backdrop-blur">
              <Sprout size={14} /> For children and young people
            </p>
            <h1 id="hero-title" className="text-[clamp(2.5rem,1.4rem+5.5vw,5.5rem)] font-extrabold leading-[1.02] tracking-tight text-white">
              <SplitWords text="Learn. Grow." />{' '}
              <span className="text-shimmer relative inline-block">
                Lead.
                <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-2.5 w-full text-sun/70 sm:-bottom-2 sm:h-3">
                  <path d="M2 9 C 80 2, 200 2, 298 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="hero-underline" />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:mt-6 sm:text-xl">
              A safe place to learn, get inspired and become a confident leader.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 min-[420px]:flex-row min-[420px]:flex-wrap">
              <Link to="/register" className="btn-pulse btn-arrow btn-shine relative inline-flex min-h-12 sm:min-h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-sun px-8 text-base font-bold text-navy no-underline shadow-lift transition hover:brightness-105">
                Join now <ArrowRight size={16} />
              </Link>
              <Link to="/programs" className="inline-flex min-h-12 sm:min-h-14 items-center justify-center gap-2 rounded-full border border-white/50 bg-white/10 px-8 text-base font-semibold text-white no-underline backdrop-blur transition-colors hover:bg-white/20">
                <BookOpen size={17} /> Our programs
              </Link>
            </div>
            <p className="mt-8 hidden items-center gap-2 text-sm font-semibold text-white/90 sm:inline-flex">
              <ShieldCheck size={15} className="text-sun" /> Safe. Private. Made for ages 4 to 25.
            </p>
          </div>

          {/* Floating cards, large screens only: one tidy column, same animations */}
          <div aria-hidden="true" className="flex w-full max-w-md flex-col gap-4 sm:gap-5 xl:max-w-sm xl:justify-self-end">
            <div className="hidden animate-float rounded-2xl border border-white/20 bg-white/10 p-3 shadow-lift backdrop-blur-md xl:block">
              <SmartImage image="events.main" ratio={16 / 10} rounded="rounded-xl" sizes="384px" />
              <p className="mt-3 px-1 text-sm font-semibold text-white">Workshops and events</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hero-layer hidden shrink-0 min-[400px]:block" style={{ ['--depth' as string]: 18 }}><div className="origin-center scale-[0.72] sm:scale-100 -m-3 sm:m-0"><HeroBadge /></div></div>
              <div className="min-w-0 flex-1 animate-float-slow rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lift backdrop-blur-md">
                <p className="text-sm font-bold text-white">Learning this week</p>
                <div className="hero-progress mt-3 h-2 overflow-hidden rounded-full bg-white/20"><span className="bg-sun" style={{ width: '72%' }} /></div>
                <p className="mt-2 text-xs font-semibold text-white/80">Lessons, quizzes, badges</p>
              </div>
            </div>
            <div className="flex animate-float-delayed items-center gap-3 rounded-2xl border border-sun/40 bg-navy/70 px-4 py-3 shadow-lift backdrop-blur-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun text-navy"><ShieldCheck size={18} /></span>
              <span className="text-sm font-semibold text-white">Child safety comes first</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => document.getElementById('what-we-do')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col [@media(min-height:760px)]:sm:flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-sun"
          aria-label="Scroll to the next section"
        >
          Scroll <ChevronDown size={18} className="animate-bounce" />
        </button>
      </section>

      {/* Impact: only figures entered by an administrator, otherwise this band is not shown */}
      {site.impact.items.length > 0 && (
        <section className="relative isolate overflow-hidden bg-navy py-10 text-white sm:py-14">
          <Ambient tone="dark" />
          <div className="container-page">
            <ImpactStats impact={site.impact} tone="dark" />
          </div>
        </section>
      )}

      <WordRibbon />

      {/* What we do */}
      <Section id="what-we-do" className="pt-20 sm:pt-24">
        <SectionHeading eyebrow="What we do" title="Three ways to take part">
            {site.organization.mission ?? 'Leadership shows up when a child helps a friend, shares an idea or keeps going after a mistake. We build programs, lessons and events around those moments.'}
          </SectionHeading>
        <Stagger as="ul" className="grid gap-6 md:grid-cols-3">
          {services.map((s) => (
            <li key={s.to} className="min-w-0">
              <Link to={s.to} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink no-underline shadow-card transition-[box-shadow,transform,border-color] duration-300 hover:border-blue-100 hover:shadow-lift motion-safe:hover:-translate-y-1">
                <div className="overflow-hidden">
                  <SmartImage image={s.image} rounded="rounded-none" className="transition-transform duration-700 group-hover:scale-[1.04]" sizes="(min-width: 768px) 33vw, 100vw" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-h3 group-hover:text-blue-700">{s.title}</h3>
                  <p className="mt-2 flex-1 text-ink-muted">{s.text}</p>
                  <span className="mt-5 inline-flex items-center gap-2 font-semibold text-blue-600">
                    {s.cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </Stagger>
      </Section>

      {/* Moving photo strip */}
      <section aria-labelledby="moments" className="overflow-hidden bg-surface pb-14 sm:pb-20">
        <div className="container-page">
          <SectionHeading id="moments" eyebrow="Learning together" title="Curious minds, working side by side" align="center" />
        </div>
        <PhotoMarquee label="Photos of young people learning together" />
      </section>

      {/* Programs */}
      <Section tone="canvas">
        <SectionHeading
            eyebrow="Programs and activities"
            title="Ways for children to take part"
            action={(programs.data?.length ?? 0) > 0 ? <ButtonLink to="/programs" variant="secondary">See all programs</ButtonLink> : undefined}
          >
            Each program is designed with care and shared here once it has been approved.
          </SectionHeading>
        {programs.isLoading ? (
          <CardSkeleton />
        ) : programs.data && programs.data.length > 0 ? (
          <Reveal>
            <Carousel label="Programs" autoPlay={programs.data.length > 3}>
              {programs.data.slice(0, 8).map((p) => (
                <ProgramCard key={p.id} program={p} />
              ))}
            </Carousel>
          </Reveal>
        ) : (
          <EmptyState title="Programs will be announced soon">We are preparing our first programs. Get in touch if you would like to hear when they open.</EmptyState>
        )}
      </Section>

      {/* How taking part works */}
      <Section>
        <SectionHeading eyebrow="How it works" title="Taking part, step by step" align="center">
            Everything starts with a parent or guardian, and you can change your choices at any time.
          </SectionHeading>
        <StepTimeline steps={steps} />
        <Reveal className="mt-12 flex justify-center">
          <ButtonLink to="/register" size="lg">
            Create a parent account
          </ButtonLink>
        </Reveal>
      </Section>

      {/* Families */}
      <section className="bg-surface pb-14 sm:pb-20">
        <div className="container-page">
          <Reveal from="scale" className="relative isolate overflow-hidden rounded-[1.75rem] bg-navy px-5 py-10 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <Ambient tone="dark" />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
              <div className="min-w-0">
                <p className="mb-3 text-label uppercase tracking-[0.12em] text-sun">For parents and families</p>
                <h2 className="text-h2 !text-white">You stay in the loop, and in control</h2>
                <p className="mt-4 max-w-xl text-lead text-white/85">
                  Children only join activities with a parent or guardian’s permission. You decide what your child takes part in, and you can see and manage their learning
                  account at any time.
                </p>
                <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                  <ButtonLink to="/parents" variant="sun" size="lg">
                    Information for families
                  </ButtonLink>
                  <ButtonLink to="/child-safety" size="lg" className="!bg-white/10 !text-white ring-1 ring-inset ring-white/25 hover:!bg-white/20">
                    How we keep children safe
                  </ButtonLink>
                </div>
              </div>
              <Stagger as="ul" className="grid gap-3">
                {safeguards.map((t) => (
                  <li key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3.5 ring-1 ring-inset ring-white/10 backdrop-blur">
                    <ShieldCheck size={18} className="text-[#5EEAD4]" /> {t}
                  </li>
                ))}
              </Stagger>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Events */}
      <Section tone="canvas">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
          <Reveal from="left" className="min-w-0">
            <SectionHeading eyebrow="Upcoming events" title="Come and meet us">
              Open days, workshops and family activities appear here as soon as dates are confirmed.
            </SectionHeading>
            <ButtonLink to="/events" variant="secondary" className="hidden lg:inline-flex">
              All events
            </ButtonLink>
          </Reveal>
          <div className="min-w-0">
            {events.isLoading ? (
              <div role="status" aria-label="Loading" className="space-y-4">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-32 rounded-xl" />
                ))}
              </div>
            ) : events.data && events.data.length > 0 ? (
              <>
                <Stagger as="ul" className="space-y-4">
                  {events.data.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      <EventItem event={e} />
                    </li>
                  ))}
                </Stagger>
                <Link to="/events" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold lg:hidden">
                  All events <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <EmptyState title="No events scheduled right now">Check back soon, or contact us to ask about upcoming activities.</EmptyState>
            )}
          </div>
        </div>
      </Section>

      {/* Get involved */}
      <Section>
        <SectionHeading eyebrow="Get involved" title="Help us invest in the next generation" action={<ButtonLink to="/get-involved" variant="secondary">All the ways to help</ButtonLink>}>
            Every role involving children follows our safeguarding process.
          </SectionHeading>
        <Stagger as="ul" className="grid gap-6 md:grid-cols-3">
          {roles.map(({ icon: Icon, title, text, to, image }) => (
            <li key={title} className="min-w-0">
              <Link to={to} className="group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl p-6 text-white no-underline shadow-card md:min-h-[26rem]">
                <div className="absolute inset-0 -z-10 transition-transform duration-700 group-hover:scale-105">
                  <SmartImage image={image} rounded="rounded-none" fill sizes="(min-width: 768px) 33vw, 100vw" />
                </div>
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/60 to-navy/0" />
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/30 backdrop-blur">
                  <Icon size={17} />
                </span>
                <h3 className="text-h3 !text-white">{title}</h3>
                <p className="mt-1 text-white/85">{text}</p>
                <span className="mt-4 inline-flex items-center gap-2 font-semibold text-white">
                  Find out more <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </Stagger>
      </Section>

      {/* Call to action over a parallax photo */}
      <PhotoBand
        image="involved.main"
        eyebrow="Get in touch"
        title="Have a question or an idea?"
        actions={
          <>
            <ButtonLink to="/contact" size="lg" variant="sun">
              Contact us
            </ButtonLink>
            <ButtonLink to="/support" size="lg" className="!bg-white/10 !text-white ring-1 ring-inset ring-white/25 hover:!bg-white/20">
              Support our work
            </ButtonLink>
          </>
        }
      >
        Whether you are a parent, a teacher or an organisation that wants to help, we would love to hear from you.
      </PhotoBand>
    </>
  );
}
