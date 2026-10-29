import { Stagger } from '../../components/motion/Reveal';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { EventSummary } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PhotoBand } from '../../components/content/PhotoBand';
import { PageHeader, Section } from '../../components/layout/PageHeader';
import { EventItem } from '../../components/content/EventItem';
import { Alert, ButtonLink, EmptyState } from '../../components/ui';
import { cn } from '../../lib/cn';

export default function Events() {
  useDocumentTitle('Events and activities');
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const q = useQuery({ queryKey: ['events', when], queryFn: () => api.get<EventSummary[]>(`/events?when=${when}`) });
  return (
    <>
      <PageHeader eyebrow="Events and activities" title="Join us at an upcoming event" image="events.main">
        Workshops, open days and family activities. Registration details are listed on each event.
      </PageHeader>
      <Section>
        <h2 className="sr-only">{when === 'upcoming' ? 'Upcoming events' : 'Past events'}</h2>
        <div role="group" aria-label="Show events" className="mb-8 inline-flex rounded-full border border-line bg-canvas p-1">
          {(['upcoming', 'past'] as const).map((w) => (
            <button
              key={w}
              aria-pressed={when === w}
              type="button"
              onClick={() => setWhen(w)}
              className={cn('min-h-10 rounded-full px-5 text-sm font-semibold transition-colors', when === w ? 'bg-surface text-heading shadow-soft' : 'text-ink-muted hover:text-heading')}
            >
              {w === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        {q.isError && <Alert tone="error">Events could not be loaded. Please try again later.</Alert>}
        {q.isLoading ? (
          <div role="status" aria-label="Loading" className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
          </div>
        ) : q.data && q.data.length > 0 ? (
          <Stagger as="ul" className="grid gap-4 lg:grid-cols-2">
            {q.data.map((e) => (
              <li key={e.id} className="min-w-0">
                <EventItem event={e} />
              </li>
            ))}
          </Stagger>
        ) : (
          !q.isError && <EmptyState title={when === 'upcoming' ? 'No upcoming events yet' : 'No past events to show'}>New events are added here as soon as dates are confirmed.</EmptyState>
        )}
      </Section>
      <PhotoBand
        image="about.main"
        eyebrow="Stay in touch"
        title="Want to hear about new events?"
        actions={<ButtonLink to="/contact" size="lg" variant="sun">Contact us</ButtonLink>}
      >
        Dates are added here as soon as they are confirmed. You can also contact us to ask about upcoming activities.
      </PhotoBand>
    </>
  );
}
