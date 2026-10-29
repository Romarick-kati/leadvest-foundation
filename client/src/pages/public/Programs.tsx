import { Stagger } from '../../components/motion/Reveal';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ProgramSummary } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PhotoBand } from '../../components/content/PhotoBand';
import { PageHeader, Section } from '../../components/layout/PageHeader';
import { ProgramCard } from '../../components/content/ProgramCard';
import { Alert, ButtonLink, CardSkeleton, EmptyState } from '../../components/ui';
import { cn } from '../../lib/cn';

// Filters appear only once there are enough programs to make them useful.
const FILTER_THRESHOLD = 6;

export default function Programs() {
  useDocumentTitle('Programs and activities');
  const q = useQuery({ queryKey: ['programs'], queryFn: () => api.get<ProgramSummary[]>('/programs') });
  const [format, setFormat] = useState<string>('all');
  const formats = useMemo(() => Array.from(new Set((q.data ?? []).map((p) => p.deliveryFormat).filter(Boolean))) as string[], [q.data]);
  const list = (q.data ?? []).filter((p) => format === 'all' || p.deliveryFormat === format);

  return (
    <>
      <PageHeader eyebrow="Programs and activities" title="Learning experiences for growing leaders" image="programs.main">
        Explore the programs currently offered by the foundation. Each one lists who it is for, how it runs and how to ask about a place.
      </PageHeader>
      <Section>
        <h2 className="sr-only">All programs</h2>
        {q.isError && <Alert tone="error" title="Programs could not be loaded">Please refresh the page or try again later.</Alert>}
        {(q.data?.length ?? 0) >= FILTER_THRESHOLD && formats.length > 1 && (
          <div role="group" aria-label="Filter by format" className="mb-8 flex flex-wrap gap-2">
            {['all', ...formats].map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                onClick={() => setFormat(f)}
                className={cn('min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors', format === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-line-strong text-heading hover:bg-blue-50')}
              >
                {f === 'all' ? 'All formats' : f}
              </button>
            ))}
          </div>
        )}
        {q.isLoading ? (
          <CardSkeleton count={3} />
        ) : list.length > 0 ? (
          <Stagger as="ul" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className="min-w-0">
                <ProgramCard program={p} />
              </li>
            ))}
          </Stagger>
        ) : (
          !q.isError && (
            <EmptyState title="No programs published yet" action={<ButtonLink to="/contact">Ask about future programs</ButtonLink>}>
              Approved programs will be listed here as soon as they are ready.
            </EmptyState>
          )
        )}
      </Section>
      <PhotoBand
        image="digital.main"
        eyebrow="Questions"
        title="Not sure which program fits?"
        actions={<ButtonLink to="/contact" size="lg" variant="sun">Contact us</ButtonLink>}
      >
        Tell us your child’s age and interests and we will point you to the right place.
      </PhotoBand>
    </>
  );
}
