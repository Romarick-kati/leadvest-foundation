import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ExternalLink, MapPin, Monitor, Ticket, Users } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import type { EventDetail as Ev } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatDateTime, formatMoney } from '../../lib/format';
import { SmartImage } from '../../components/brand/SmartImage';
import { EventDateTile, eventStatusBadge } from '../../components/content/EventItem';
import { AdminQuickBar } from '../../components/content/AdminQuickBar';
import { RegistrationPanel } from '../../components/content/RegistrationPanel';
import { Alert, PageLoader, Panel, SampleBadge, buttonClass } from '../../components/ui';
import NotFound from './NotFound';

export default function EventDetail() {
  const { slug } = useParams();
  const q = useQuery({ queryKey: ['event', slug], queryFn: () => api.get<Ev>(`/events/${slug}`) });
  useDocumentTitle(q.data?.title ?? 'Event', q.data?.summary);
  if (q.isLoading) return <PageLoader />;
  if ((q.error instanceof ApiError && q.error.status === 404) || !q.data) return <NotFound />;
  const e = q.data;
  const deadlinePassed = e.registrationDeadline ? new Date(e.registrationDeadline) < new Date() : false;
  const canRegister = e.registrationOpen && e.eventStatus === 'SCHEDULED' && !deadlinePassed && new Date(e.startsAt) > new Date();
  const price = formatMoney(e.priceCents, e.currency);

  return (
    <article>
      <div className="container-page pt-8">
        <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
          <ChevronLeft size={16} aria-hidden /> All events
        </Link>
      </div>
      <header className="container-page py-8">
        <div className="hero-rise flex flex-col gap-6 sm:flex-row sm:items-start">
          <EventDateTile iso={e.startsAt} timeZone={e.timezone} />
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {e.isSample && <SampleBadge />}
              {eventStatusBadge(e)}
            </div>
            <h1 className="text-h1">{e.title}</h1>
            <p className="mt-4 max-w-2xl text-lead text-ink">{e.summary}</p>
          </div>
        </div>
      </header>
      <div className="container-page grid gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-10">
          {e.eventStatus === 'CANCELLED' && <Alert tone="error" title="This event has been cancelled">If you registered, the foundation will contact you.</Alert>}
          {e.eventStatus === 'POSTPONED' && <Alert tone="warning" title="This event has been postponed">A new date will be shared here when confirmed.</Alert>}
          <SmartImage dbKey={e.imageKey} coverTitle={e.title} image="event.default" alt={e.imageAlt} priority rounded="rounded-[1.75rem]" className="shadow-card motion-safe:animate-rise-in" />
          <section>
            <h2 className="text-h3">About this event</h2>
            <div className="prose-lvf mt-4 whitespace-pre-line">{e.description}</div>
          </section>
          <AdminQuickBar kind="event" id={e.id} />
          <section id="register" className="scroll-mt-24">
            <Panel title="Registration" description={e.registrationInfo ?? undefined}>
              {e.externalUrl ? (
                <a href={e.externalUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md')} data-button>
                  Register on the event page <ExternalLink size={16} aria-hidden />
                </a>
              ) : (
                <RegistrationPanel
                  kind="event"
                  id={e.id}
                  title={e.title}
                  open={canRegister}
                  priceCents={e.priceCents}
                  currency={e.currency}
                  closedMessage={deadlinePassed ? 'The registration deadline has passed.' : undefined}
                />
              )}
            </Panel>
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Event details">
            <dl className="space-y-4 text-heading">
              <div className="flex gap-3"><CalendarDays size={18} className="mt-0.5 text-blue-600" aria-hidden /><div><dt className="sr-only">Date and time</dt><dd>{formatDateTime(e.startsAt, e.timezone)}{e.endsAt && <> to {formatDateTime(e.endsAt, e.timezone)}</>}<span className="block text-caption text-ink-muted">Time zone: {e.timezone}</span></dd></div></div>
              <div className="flex gap-3">{e.locationType === 'ONLINE' ? <Monitor size={18} className="mt-0.5 text-blue-600" aria-hidden /> : <MapPin size={18} className="mt-0.5 text-blue-600" aria-hidden />}<div><dt className="sr-only">Location</dt><dd>{e.locationType === 'ONLINE' ? 'Online. Joining details are sent to registered participants.' : e.location ?? 'Location to be confirmed'}{e.locationType === 'HYBRID' && ' (also online)'}</dd></div></div>
              {e.audience && <div className="flex gap-3"><Users size={18} className="mt-0.5 text-blue-600" aria-hidden /><div><dt className="sr-only">Audience</dt><dd>{e.audience}</dd></div></div>}
              <div className="flex gap-3"><Ticket size={18} className="mt-0.5 text-blue-600" aria-hidden /><div><dt className="sr-only">Cost and places</dt><dd>{price ?? 'Free'}{e.capacity != null && <span className="block text-caption text-ink-muted">{e.spacesLeft === 0 ? 'Full, waiting list available' : `${e.spacesLeft} of ${e.capacity} places left`}</span>}</dd></div></div>
              {e.registrationDeadline && <p className="border-t border-line pt-4 text-sm text-ink-muted">Register by {formatDateTime(e.registrationDeadline, e.timezone)}</p>}
            </dl>
          </Panel>
        </aside>
      </div>
    </article>
  );
}
