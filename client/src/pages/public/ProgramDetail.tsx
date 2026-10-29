import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, ChevronLeft, Clock, ListChecks, Users, Wallet } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import type { ProgramDetail as Program } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatMoney } from '../../lib/format';
import { SmartImage } from '../../components/brand/SmartImage';
import { Stagger } from '../../components/motion/Reveal';
import { AdminQuickBar } from '../../components/content/AdminQuickBar';
import { RegistrationPanel } from '../../components/content/RegistrationPanel';
import { Badge, ButtonLink, PageLoader, Panel, SampleBadge, buttonClass } from '../../components/ui';
import NotFound from './NotFound';

export default function ProgramDetail() {
  const { slug } = useParams();
  const q = useQuery({ queryKey: ['program', slug], queryFn: () => api.get<Program>(`/programs/${slug}`) });
  useDocumentTitle(q.data?.title ?? 'Program', q.data?.summary);
  if (q.isLoading) return <PageLoader />;
  if (q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
  if (!q.data) return <NotFound />;
  const p = q.data;
  const price = formatMoney(p.priceCents, p.currency);

  const facts = [
    { icon: <Users size={18} />, label: 'Who it is for', value: p.ageGroup ? `Ages ${p.ageGroup}` : null },
    { icon: <ListChecks size={18} />, label: 'Format', value: p.deliveryFormat },
    { icon: <CalendarClock size={18} />, label: 'Schedule', value: p.schedule },
    { icon: <Clock size={18} />, label: 'Duration', value: p.duration },
    { icon: <Wallet size={18} />, label: 'Fees', value: p.feeInfo ?? price },
  ].filter((f) => f.value);

  return (
    <article>
      <div className="container-page pt-8">
        <Link to="/programs" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
          <ChevronLeft size={16} aria-hidden /> All programs
        </Link>
      </div>
      <header className="container-page grid items-center gap-10 py-10 lg:grid-cols-2">
        <div className="hero-rise min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            {p.isSample && <SampleBadge />}
            {p.availability && <Badge tone="blue">{p.availability}</Badge>}
          </div>
          <h1 className="text-h1">{p.title}</h1>
          <p className="mt-5 text-lead text-ink">{p.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#register" data-button className={buttonClass('primary', 'lg')}>{p.registrationOpen ? 'Register or ask about a place' : 'Ask about this program'}</a>
          </div>
        </div>
        <div className="min-w-0 motion-safe:animate-rise-in" style={{ animationDelay: '120ms' }}>
          <SmartImage dbKey={p.imageKey} coverTitle={p.title} image="program.default" alt={p.imageAlt} priority rounded="rounded-[1.75rem]" className="shadow-lift" />
        </div>
      </header>

      <div className="container-page grid gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-12">
          <section>
            <h2 className="text-h3">About this program</h2>
            <div className="prose-lvf mt-4 whitespace-pre-line">{p.description}</div>
          </section>
          {p.objectives.length > 0 && (
            <section>
              <h2 className="text-h3">What children will work on</h2>
              <Stagger as="ul" className="mt-5 grid gap-3 sm:grid-cols-2">
                {p.objectives.map((o) => (
                  <li key={o} className="flex items-start gap-3 rounded-xl bg-teal-50 p-4">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-teal" size={20} aria-hidden />
                    <span>{o}</span>
                  </li>
                ))}
              </Stagger>
            </section>
          )}
          {p.requirements && (
            <section>
              <h2 className="text-h3">Requirements</h2>
              <p className="prose-lvf mt-3 whitespace-pre-line">{p.requirements}</p>
            </section>
          )}
          {p.instructors.length > 0 && (
            <section>
              <h2 className="text-h3">Led by</h2>
              <p className="mt-3">{p.instructors.join(', ')}</p>
            </section>
          )}
          {p.faq.length > 0 && (
            <section>
              <h2 className="text-h3">Questions about this program</h2>
              <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
                {p.faq.map((f) => (
                  <details key={f.question} className="group p-5">
                    <summary className="cursor-pointer list-none font-semibold text-heading marker:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {f.question}
                        <span aria-hidden className="text-xl text-blue-600 transition-transform group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-3 text-ink">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
          <AdminQuickBar kind="program" id={p.id} />
          <section id="register" className="scroll-mt-24">
            <Panel title="Registration" description={p.registrationInfo ?? undefined}>
              <RegistrationPanel kind="program" id={p.id} title={p.title} open={p.registrationOpen} priceCents={p.priceCents} currency={p.currency} closedMessage="Registration is not open for this program yet. Send us a message and we will let you know when places are available." />
              {!p.registrationOpen && <ButtonLink to="/contact" variant="secondary" className="mt-4">Send an enquiry</ButtonLink>}
            </Panel>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="At a glance">
            {facts.length > 0 ? (
              <dl className="space-y-4">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-3">
                    <span className="mt-0.5 text-blue-600" aria-hidden>{f.icon}</span>
                    <div>
                      <dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">{f.label}</dt>
                      <dd className="text-heading">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">Details will be added once confirmed.</p>
            )}
            <p className="mt-5 border-t border-line pt-4 text-caption text-ink-muted">Program details are provided by the foundation and may change. We do not promise certificates or specific outcomes unless stated here.</p>
          </Panel>
        </aside>
      </div>
    </article>
  );
}
