import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { m } from 'framer-motion';
import { ArrowRight, Sparkles } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { ModuleSummary } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { FloatingShapes } from '../../components/motion/FloatingShapes';
import { CardSkeleton, EmptyState, ProgressBar, SampleBadge, ButtonLink } from '../../components/ui';
import { BadgeMedal, themeStyles, TopicIcon, type Badge } from './shared';
import { cn } from '../../lib/cn';

interface MyProgress {
  totalCompleted: number;
  modules: { slug: string; title: string; completed: number; total: number }[];
  badges: Badge[];
}

export default function LearningHome() {
  useDocumentTitle('Learning area');
  const { user } = useAuth();
  const isLearner = user?.role === 'LEARNER' || user?.role === 'YOUTH';
  const modules = useQuery({ queryKey: ['learning', 'modules', user?.id ?? 'guest'], queryFn: () => api.get<ModuleSummary[]>('/learning/modules') });
  const me = useQuery({ queryKey: ['learning', 'me'], queryFn: () => api.get<MyProgress>('/learning/me'), enabled: isLearner });
  const progressFor = (slug: string) => me.data?.modules.find((m) => m.slug === slug);

  return (
    <div className="font-play">
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-blue-50 to-surface">
        <FloatingShapes preset="learning" />
        <div className="container-page relative py-10 text-center sm:py-14">
          <m.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sun text-navy shadow-soft">
            <Sparkles size={32} aria-hidden />
          </m.div>
          <h1 className="text-h1">{isLearner ? `Hello, ${user!.displayName}!` : 'Let’s learn something new'}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lead text-ink">
            {isLearner ? 'Pick a topic to keep going. Every lesson you finish helps you grow.' : 'Short, friendly lessons about working together, being kind and becoming a leader. Pick a topic to begin.'}
          </p>
          {!user && (
            <p className="mx-auto mt-4 max-w-xl text-sm text-ink-muted">
              You can try lessons without an account. To save your progress, <Link to="/register">create a free account</Link>. Children under 16 get theirs from a parent or guardian.
            </p>
          )}
          {user?.role === 'MEMBER' && (
            <p className="mx-auto mt-4 max-w-xl text-sm text-ink-muted">
              To save your progress, <Link to="/welcome">choose how you’ll use Lead Vest</Link>. It takes one tap.
            </p>
          )}
        </div>
      </section>

      {isLearner && me.data && (
        <section className="container-page -mt-4 pb-6">
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-h3">My badges</h2>
            <p className="mt-1 text-ink-muted">You have finished {me.data.totalCompleted} {me.data.totalCompleted === 1 ? 'lesson' : 'lessons'} so far.</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {me.data.badges.map((b, i) => <BadgeMedal key={b.id} badge={b} index={i} />)}
            </ul>
          </div>
        </section>
      )}

      <section className="container-page py-12">
        <h2 className="mb-6 text-h2">Topics</h2>
        {modules.isLoading ? (
          <CardSkeleton count={3} />
        ) : modules.data && modules.data.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.data.map((mod, i) => {
              const t = themeStyles[mod.theme] ?? themeStyles.sky;
              const p = progressFor(mod.slug);
              return (
                <m.li key={mod.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Link to={`/learning/${mod.slug}`} className={cn('group flex h-full flex-col rounded-2xl border-2 p-6 text-ink no-underline transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-lift', t.card)}>
                    <div className="flex items-start justify-between gap-3">
                      <m.span whileHover={{ rotate: -8, scale: 1.08 }} className={cn('flex h-14 w-14 items-center justify-center rounded-2xl shadow-soft', t.icon)}>
                        <TopicIcon icon={mod.icon} />
                      </m.span>
                      {mod.isSample && <SampleBadge />}
                    </div>
                    <h3 className="mt-5 text-[1.5rem] font-extrabold leading-tight text-heading">{mod.title}</h3>
                    <p className="mt-2 flex-1 text-[1.05rem] text-ink">{mod.description}</p>
                    {p && p.total > 0 ? (
                      <ProgressBar className="mt-5" value={p.completed} max={p.total} label={`${p.completed} of ${p.total} lessons`} tone={t.bar} />
                    ) : (
                      <span className="mt-5 text-sm font-bold text-heading">{mod.lessonCount} {mod.lessonCount === 1 ? 'lesson' : 'lessons'}</span>
                    )}
                    <span className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface text-lg font-extrabold text-heading shadow-soft transition-colors group-hover:bg-navy group-hover:text-white">
                      {p && p.completed > 0 ? 'Keep going' : 'Start'} <ArrowRight size={20} aria-hidden />
                    </span>
                  </Link>
                </m.li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Lessons are on their way" action={<ButtonLink to="/">Back to the homepage</ButtonLink>}>
            The foundation is preparing learning activities. They will appear here once they are ready.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
