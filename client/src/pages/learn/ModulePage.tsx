import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, Circle, Clock } from '../../components/ui/icons';
import { m } from 'framer-motion';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { EmptyState, PageLoader, ProgressBar, SampleBadge } from '../../components/ui';
import { themeStyles, TopicIcon } from './shared';
import { cn } from '../../lib/cn';
import NotFound from '../public/NotFound';

interface ModuleDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  theme: 'sky' | 'sun' | 'mint';
  icon: string;
  isSample: boolean;
  lessons: { id: string; slug: string; title: string; minutes: number }[];
  completedLessonIds: string[];
}

export default function ModulePage() {
  const { moduleSlug } = useParams();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['learning', 'module', moduleSlug, user?.id ?? 'guest'], queryFn: () => api.get<ModuleDetail>(`/learning/modules/${moduleSlug}`) });
  useDocumentTitle(q.data?.title ?? 'Learning');
  if (q.isLoading) return <PageLoader />;
  if ((q.error instanceof ApiError && q.error.status === 404) || !q.data) return <NotFound />;
  const mod = q.data;
  const t = themeStyles[mod.theme] ?? themeStyles.sky;
  const done = new Set(mod.completedLessonIds);
  const isLearner = user?.role === 'LEARNER' || user?.role === 'YOUTH';
  const nextLesson = mod.lessons.find((l) => !done.has(l.id)) ?? mod.lessons[0];

  return (
    <div className="font-play">
      <div className="container-page pt-8">
        <Link to="/learning" className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-base font-bold no-underline">
          <ChevronLeft size={20} aria-hidden /> All topics
        </Link>
      </div>
      <header className={cn('container-page mt-4 rounded-2xl border-2 p-6 sm:p-10', t.card)}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className={cn('flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl shadow-soft', t.icon)}>
            <TopicIcon icon={mod.icon} size={40} />
          </span>
          <div className="flex-1">
            {mod.isSample && <SampleBadge />}
            <h1 className="mt-2 text-h1">{mod.title}</h1>
            <p className="mt-2 text-lead text-ink">{mod.description}</p>
          </div>
        </div>
        {isLearner && mod.lessons.length > 0 && <ProgressBar className="mt-8" value={done.size} max={mod.lessons.length} label={`${done.size} of ${mod.lessons.length} lessons done`} tone={t.bar} />}
      </header>
      <section className="container-page py-10">
        {mod.lessons.length === 0 ? (
          <EmptyState title="No lessons yet">Lessons for this topic are coming soon.</EmptyState>
        ) : (
          <>
            <ol className="space-y-4">
              {mod.lessons.map((l, i) => {
                const complete = done.has(l.id);
                return (
                  <m.li key={l.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link to={`/learning/${mod.slug}/${l.slug}`} className="group flex min-h-20 items-center gap-4 rounded-2xl border-2 border-line bg-surface p-4 text-ink no-underline transition-[border-color,box-shadow] hover:border-blue hover:shadow-lift sm:p-5">
                      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-extrabold', complete ? 'bg-mint text-heading' : 'bg-navy-50 text-heading')}>
                        {complete ? <CheckCircle2 aria-label="Done" /> : i + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[1.25rem] font-extrabold text-heading group-hover:text-blue-700">{l.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted"><Clock size={14} aria-hidden /> About {l.minutes} minutes</span>
                      </span>
                      {complete ? <span className="hidden text-sm font-bold text-mint-700 sm:inline">Done</span> : <Circle className="text-line-strong" aria-hidden />}
                    </Link>
                  </m.li>
                );
              })}
            </ol>
            {nextLesson && (
              <div className="mt-8 text-center">
                <Link to={`/learning/${mod.slug}/${nextLesson.slug}`} data-button className="inline-flex min-h-14 items-center rounded-full bg-blue-600 px-8 text-xl font-extrabold text-white no-underline shadow-lift hover:bg-blue-700">
                  {done.size > 0 && done.size < mod.lessons.length ? 'Continue' : done.size === mod.lessons.length && isLearner ? 'Practise again' : 'Start the first lesson'}
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
