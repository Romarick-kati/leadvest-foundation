import { Link } from 'react-router-dom';
import { ArrowRight } from '../ui/icons';
import type { ProgramSummary } from '../../lib/types';
import { SmartImage } from '../brand/SmartImage';
import { Badge, SampleBadge } from '../ui';

export function ProgramCard({ program }: { program: ProgramSummary }) {
  return (
    <Link to={`/programs/${program.slug}`} className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface text-ink no-underline shadow-card transition-[box-shadow,transform,border-color] duration-300 hover:border-blue-100 hover:shadow-lift motion-safe:hover:-translate-y-1">
      <SmartImage dbKey={program.imageKey} coverTitle={program.title} image="program.default" alt={program.imageAlt ?? ''} rounded="rounded-none" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {program.isSample && <SampleBadge />}
          {program.ageGroup && <Badge tone="mint">Ages {program.ageGroup}</Badge>}
          {program.deliveryFormat && <Badge tone="blue">{program.deliveryFormat}</Badge>}
        </div>
        <h3 className="text-h4 group-hover:text-blue-700">{program.title}</h3>
        <p className="mt-2 flex-1 text-ink-muted">{program.summary}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-blue-600">
          View details <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
