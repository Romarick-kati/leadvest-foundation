import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Newspaper } from '../../../components/ui/icons';
import { api, qs } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import { PageHeader, Section } from '../../../components/layout/PageHeader';
import { SmartImage } from '../../../components/brand/SmartImage';
import { Stagger } from '../../../components/motion/Reveal';
import { Alert, Badge, CardSkeleton, EmptyState, SampleBadge } from '../../../components/ui';
import { useT } from '../../../i18n';
import { cn } from '../../../lib/cn';

export const articleCategories = ['parenting', 'learning', 'leadership', 'digital', 'news'] as const;

export interface ArticleSummary {
  slug: string;
  title: string;
  summary: string;
  category: string;
  imageKey: string | null;
  imageAlt: string | null;
  readMinutes: number | null;
  publishedAt: string | null;
  isSample: boolean;
}

export function ArticleCard({ a }: { a: ArticleSummary }) {
  const t = useT();
  return (
    <Link
      to={`/resources/${a.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface text-ink no-underline shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-lift motion-safe:hover:-translate-y-0.5"
    >
      <SmartImage dbKey={a.imageKey} image="article.default" alt={a.imageAlt ?? ''} ratio={16 / 10} rounded="rounded-none" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <Badge tone="blue">{t(`articles.categories.${a.category}`)}</Badge>
          {a.isSample && <SampleBadge />}
          {a.readMinutes && <span>{t('common.minRead', { n: a.readMinutes })}</span>}
        </div>
        <h3 className="text-h4 group-hover:text-blue-700">{a.title}</h3>
        <p className="mt-2 flex-1 text-ink-muted">{a.summary}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          {a.publishedAt ? <time dateTime={a.publishedAt} className="text-ink-muted">{formatDate(a.publishedAt)}</time> : <span />}
          <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
            {t('articles.read')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Resources() {
  const t = useT();
  useDocumentTitle(t('articles.title'));
  const [params, setParams] = useSearchParams();
  const raw = params.get('topic') ?? '';
  const category = (articleCategories as readonly string[]).includes(raw) ? raw : '';
  const list = useQuery({ queryKey: ['articles', category], queryFn: () => api.get<ArticleSummary[]>(`/articles${qs({ category })}`) });

  const chip = (active: boolean) =>
    cn('min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors', active ? 'border-blue-600 bg-blue-600 text-white' : 'border-line-strong bg-surface text-heading hover:border-blue-600');

  return (
    <>
      <PageHeader eyebrow={t('articles.eyebrow')} title={t('articles.title')} image="resources.main">
        {t('articles.intro')}
      </PageHeader>
      <Section labelledBy="article-list">
        <h2 id="article-list" className="sr-only">{t('articles.title')}</h2>
        <div role="group" aria-label={t('articles.filter')} className="mb-8 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!category} className={chip(!category)} onClick={() => setParams({}, { replace: true })}>
            {t('articles.all')}
          </button>
          {articleCategories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} className={chip(category === c)} onClick={() => setParams({ topic: c }, { replace: true })}>
              {t(`articles.categories.${c}`)}
            </button>
          ))}
        </div>
        {list.isLoading ? (
          <CardSkeleton />
        ) : list.error ? (
          <Alert tone="error">{list.error instanceof Error ? list.error.message : t('errors.generic')}</Alert>
        ) : list.data && list.data.length > 0 ? (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.data.map((a) => <ArticleCard key={a.slug} a={a} />)}
          </Stagger>
        ) : (
          <EmptyState icon={<Newspaper size={28} />} title={t('articles.emptyTitle')}>
            {t('articles.emptyText')}
          </EmptyState>
        )}
      </Section>
    </>
  );
}
