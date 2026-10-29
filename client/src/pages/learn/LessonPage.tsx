import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Lightbulb, PartyPopper, Puzzle, RotateCcw, X } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { ContentBlock } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Celebration } from '../../components/motion/Celebration';
import { Alert, PageLoader, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/cn';
import NotFound from '../public/NotFound';

interface Lesson {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  content: ContentBlock[];
  quiz: { prompt: string; options: string[] }[];
  module: { slug: string; title: string; theme: string };
  position: { index: number; total: number };
  next: { slug: string; title: string } | null;
  previous: { slug: string; title: string } | null;
}

interface CheckResult {
  score: number;
  total: number;
  results: { correct: boolean; answerIndex: number; explanation: string | null }[];
  recorded: boolean;
}

type Stage = 'read' | 'quiz' | 'done';

export default function LessonPage() {
  const { moduleSlug, lessonSlug } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['learning', 'lesson', moduleSlug, lessonSlug, user?.id ?? 'guest'], queryFn: () => api.get<Lesson>(`/learning/modules/${moduleSlug}/lessons/${lessonSlug}`) });
  // A learner may ask for bigger words in Learning preferences. Same query key as that page.
  const profile = useQuery({
    queryKey: ['learner-profile'],
    queryFn: () => api.get<{ largerText: boolean }>('/account/learning'),
    enabled: user?.role === 'LEARNER' || user?.role === 'YOUTH',
  });
  const large = Boolean(profile.data?.largerText);
  const [stage, setStage] = useState<Stage>('read');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  useDocumentTitle(q.data?.title ?? 'Lesson');

  const check = useMutation({
    mutationFn: () => api.post<CheckResult>(`/learning/lessons/${q.data!.id}/check`, { answers }),
    onSuccess: (r) => {
      setResult(r);
      setStage('done');
      qc.invalidateQueries({ queryKey: ['learning'] });
    },
  });
  const complete = useMutation({
    mutationFn: () => api.post(`/learning/lessons/${q.data!.id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning'] }),
  });

  if (q.isLoading) return <PageLoader />;
  if ((q.error instanceof ApiError && q.error.status === 404) || !q.data) return <NotFound />;
  const l = q.data;
  const hasQuiz = l.quiz.length > 0;
  const isLearner = user?.role === 'LEARNER' || user?.role === 'YOUTH';

  const finishReading = () => {
    if (hasQuiz) setStage('quiz');
    else {
      setStage('done');
      if (isLearner) complete.mutate();
    }
  };

  const restart = () => {
    setStage('read');
    setCurrent(0);
    setAnswers([]);
    setResult(null);
  };

  return (
    <div className="font-play" data-larger-text={large || undefined} style={large ? { zoom: 1.15 } : undefined}>
      <div className="container-page flex flex-wrap items-center justify-between gap-3 pt-8">
        <Link to={`/learning/${l.module.slug}`} className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-base font-bold no-underline">
          <ChevronLeft size={20} aria-hidden /> {l.module.title}
        </Link>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-sm font-bold text-heading">
          Lesson {l.position.index + 1} of {l.position.total}
        </span>
      </div>

      <div className="container-page max-w-3xl py-8">
        <h1 className="text-h1">{l.title}</h1>

        <AnimatePresence mode="wait">
          {stage === 'read' && (
            <m.div key="read" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-8 space-y-5">
              {l.content.map((block, i) => (
                <m.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
                  {block.type === 'text' && <p className="text-[1.3rem] leading-relaxed text-ink">{block.text}</p>}
                  {block.type === 'tip' && (
                    <div className="flex gap-4 rounded-2xl border-2 border-sun bg-sun-100 p-5">
                      <Lightbulb className="mt-1 shrink-0 text-heading" aria-hidden />
                      <p className="text-[1.15rem] text-heading"><strong>Tip: </strong>{block.text}</p>
                    </div>
                  )}
                  {block.type === 'activity' && (
                    <div className="flex gap-4 rounded-2xl border-2 border-mint bg-mint-50 p-5">
                      <Puzzle className="mt-1 shrink-0 text-mint-700" aria-hidden />
                      <div>
                        <p className="text-lg font-extrabold text-heading">{block.title || 'Try it'}</p>
                        <p className="mt-1 text-[1.15rem] text-ink">{block.text}</p>
                      </div>
                    </div>
                  )}
                </m.div>
              ))}
              <div className="pt-4">
                <BigButton onClick={finishReading}>
                  {hasQuiz ? <>I’m ready for the questions <ArrowRight aria-hidden /></> : <>I finished this lesson <Check aria-hidden /></>}
                </BigButton>
              </div>
            </m.div>
          )}

          {stage === 'quiz' && (
            <m.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
              <ProgressBar value={current + (answers[current] !== undefined ? 1 : 0)} max={l.quiz.length} label={`Question ${current + 1} of ${l.quiz.length}`} showValue={false} tone="sun" />
              <AnimatePresence mode="wait">
                <m.fieldset key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="mt-8">
                  <legend className="text-[1.6rem] font-extrabold leading-snug text-heading">{l.quiz[current].prompt}</legend>
                  <div className="mt-6 grid gap-3">
                    {l.quiz[current].options.map((opt, i) => {
                      const selected = answers[current] === i;
                      return (
                        <m.button
                          key={opt}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          aria-pressed={selected}
                          onClick={() => setAnswers((a) => { const next = [...a]; next[current] = i; return next; })}
                          className={cn(
                            'flex min-h-16 items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left text-[1.2rem] font-bold transition-colors',
                            selected ? 'border-blue-600 bg-blue-50 text-heading' : 'border-line bg-surface text-heading hover:border-blue',
                          )}
                        >
                          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base', selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-line-strong')}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </m.button>
                      );
                    })}
                  </div>
                </m.fieldset>
              </AnimatePresence>
              {check.error && <Alert tone="error" className="mt-6">We could not check your answers. Please try again.</Alert>}
              <div className="mt-8 flex flex-wrap justify-between gap-3">
                <button type="button" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-line-strong px-6 text-lg font-bold text-heading disabled:opacity-40">
                  <ArrowLeft aria-hidden /> Back
                </button>
                {current < l.quiz.length - 1 ? (
                  <BigButton disabled={answers[current] === undefined} onClick={() => setCurrent((c) => c + 1)}>Next <ArrowRight aria-hidden /></BigButton>
                ) : (
                  <BigButton disabled={answers[current] === undefined || check.isPending} onClick={() => check.mutate()}>{check.isPending ? 'Checking…' : 'Check my answers'}</BigButton>
                )}
              </div>
            </m.div>
          )}

          {stage === 'done' && (
            <m.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-8">
              <div className="relative overflow-visible rounded-3xl border-2 border-sun bg-sun-100 p-8 text-center sm:p-10" role="status">
                <Celebration />
                <m.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sun text-navy shadow-lift">
                  <PartyPopper size={40} aria-hidden />
                </m.div>
                <h2 className="mt-5 text-h2">{result ? (result.score === result.total ? 'Amazing, all correct!' : 'Well done for finishing!') : 'Lesson complete!'}</h2>
                {result && <p className="mt-2 text-xl font-bold text-heading">You got {result.score} out of {result.total}.</p>}
                {isLearner && (result?.recorded || complete.isSuccess) && <p className="mt-2 text-ink">Your progress has been saved.</p>}
                {!user && <p className="mt-2 text-sm text-ink-muted">Progress is not saved without a learning account.</p>}
              </div>

              {result && (
                <ul className="mt-8 space-y-4">
                  {l.quiz.map((qq, i) => {
                    const r = result.results[i];
                    return (
                      <li key={i} className={cn('rounded-2xl border-2 p-5', r.correct ? 'border-mint bg-mint-50' : 'border-line bg-surface')}>
                        <p className="flex items-start gap-3 text-lg font-extrabold text-heading">
                          <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', r.correct ? 'bg-mint-700 text-white' : 'bg-navy-50 text-heading')}>
                            {r.correct ? <Check size={16} aria-label="Correct" /> : <X size={16} aria-label="Not quite" />}
                          </span>
                          {qq.prompt}
                        </p>
                        <p className="mt-2 pl-10 text-ink">
                          {r.correct ? 'You chose the right answer: ' : 'The answer is: '}<strong>{qq.options[r.answerIndex]}</strong>
                        </p>
                        {r.explanation && <p className="mt-1 pl-10 text-ink-muted">{r.explanation}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={restart} className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-line-strong px-6 text-lg font-bold text-heading hover:bg-blue-50">
                  <RotateCcw aria-hidden /> Try again
                </button>
                {l.next ? (
                  <Link to={`/learning/${l.module.slug}/${l.next.slug}`} onClick={restart} data-button className="inline-flex min-h-14 items-center gap-2 rounded-full bg-blue-600 px-7 text-lg font-extrabold text-white no-underline hover:bg-blue-700">
                    Next lesson <ArrowRight aria-hidden />
                  </Link>
                ) : (
                  <Link to={`/learning/${l.module.slug}`} data-button className="inline-flex min-h-14 items-center gap-2 rounded-full bg-blue-600 px-7 text-lg font-extrabold text-white no-underline hover:bg-blue-700">
                    Back to the topic
                  </Link>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BigButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className="inline-flex min-h-14 items-center gap-2 rounded-full bg-blue-600 px-7 text-lg font-extrabold text-white shadow-lift hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </m.button>
  );
}
