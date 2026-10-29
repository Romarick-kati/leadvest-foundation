import { Link } from 'react-router-dom';
import { MapPin, Monitor } from '../ui/icons';
import type { EventSummary } from '../../lib/types';
import { formatDate } from '../../lib/format';
import { Badge, SampleBadge } from '../ui';

export function EventDateTile({ iso, timeZone }: { iso: string; timeZone?: string }) {
  const d = new Date(iso);
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-heading ring-1 ring-inset ring-blue-100 sm:h-20 sm:w-20">
      <span className="text-caption font-bold uppercase tracking-wide text-blue-700">{formatDate(d, { month: 'short' }, timeZone)}</span>
      <span className="text-2xl font-extrabold leading-none sm:text-[1.75rem]">{formatDate(d, { day: 'numeric' }, timeZone)}</span>
    </div>
  );
}

export function eventStatusBadge(e: Pick<EventSummary, 'eventStatus' | 'registrationOpen' | 'spacesLeft'>) {
  if (e.eventStatus === 'CANCELLED') return <Badge tone="danger">Cancelled</Badge>;
  if (e.eventStatus === 'POSTPONED') return <Badge tone="sun">Postponed</Badge>;
  if (e.eventStatus === 'COMPLETED') return <Badge>Completed</Badge>;
  if (!e.registrationOpen) return <Badge>Registration not open</Badge>;
  if (e.spacesLeft === 0) return <Badge tone="blue">Waiting list</Badge>;
  return <Badge tone="mint">Registration open</Badge>;
}

export function EventItem({ event }: { event: EventSummary }) {
  return (
    <Link to={`/events/${event.slug}`} className="group flex min-w-0 gap-4 rounded-xl border border-line bg-surface p-4 text-ink no-underline shadow-card transition-[box-shadow,border-color] hover:border-blue-100 hover:shadow-lift sm:gap-5 sm:p-5">
      <EventDateTile iso={event.startsAt} timeZone={event.timezone} />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap gap-2">
          {event.isSample && <SampleBadge />}
          {eventStatusBadge(event)}
        </div>
        <h3 className="text-h4 group-hover:text-blue-700">{event.title}</h3>
        <p className="mt-1 line-clamp-2 text-ink-muted">{event.summary}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            {event.locationType === 'ONLINE' ? <Monitor size={15} className="shrink-0" aria-hidden /> : <MapPin size={15} className="shrink-0" aria-hidden />}
            {event.locationType === 'ONLINE' ? 'Online' : event.location ?? 'Location to be confirmed'}
          </span>
          <span className="whitespace-nowrap">{formatDate(event.startsAt, { weekday: 'short', hour: 'numeric', minute: '2-digit' }, event.timezone)}</span>
        </p>
      </div>
    </Link>
  );
}
