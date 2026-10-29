import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from '../../../components/ui/icons';
import { api, ApiError } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import { SmartImage } from '../../../components/brand/SmartImage';
import { SimpleMarkdown } from '../../../components/content/SimpleMarkdown';
import { Badge, PageLoader, SampleBadge } from '../../../components/ui';
import { useT } from '../../../i18n';
import NotFound from '../NotFound';
import { ArticleCard, type ArticleSummary } from './Resources';

interface Article extends ArticleSummary {
  body: string;
  updatedAt: string;
  authorName: string | null;
}

export default function ArticleDetail() {
  const t = useT();
  const { slug } = useParams();
  const q = useQuery({ queryKey: ['article', slug], queryFn: () => api.get<Article>(`/articles/${slug}`) });
  const more = useQuery({ queryKey: ['articles', ''], queryFn: () => api.get<ArticleSummary[]>('/articles'), enabled: q.isSuccess });
  useDocumentTitle(q.data?.title ?? t('articles.title'), q.data?.summary);
  if (q.isLoading) return <PageLoader />;
  if ((q.error instanceof ApiError && q.error.status === 404) || !q.data) return <NotFound />;
  const a = q.data;
  const related = (more.data ?? []).filter((x) => x.slug !== a.slug).slice(0, 3);

  return (
    <article>
      <div className="container-page max-w-4xl pt-6">
        <Link to="/resources" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
          <ChevronLeft size={16} aria-hidden /> {t('articles.back')}
        </Link>
      </div>
      <header className="container-page hero-rise max-w-4xl py-6 sm:py-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <Badge tone="blue">{t(`articles.categories.${a.category}`)}</Badge>
          {a.isSample && <SampleBadge />}
          {a.readMinutes && <span>{t('common.minRead', { n: a.readMinutes })}</span>}
        </div>
        <h1 className="text-h1">{a.title}</h1>
        <p className="mt-4 text-lead text-ink">{a.summary}</p>
        <p className="mt-4 text-sm text-ink-muted">
          {a.authorName && <>{t('articles.by', { name: a.authorName })} · </>}
          {a.publishedAt && <time dateTime={a.publishedAt}>{t('articles.published', { date: formatDate(a.publishedAt) })}</time>}
        </p>
      </header>
      <div className="container-page max-w-4xl">
        <SmartImage dbKey={a.imageKey} image="article.default" alt={a.imageAlt} ratio={16 / 9} priority rounded="rounded-2xl" className="shadow-card" sizes="(min-width: 896px) 896px, 100vw" />
      </div>
      <div className="container-page max-w-3xl py-8 sm:py-10">
        <SimpleMarkdown source={a.body} />
      </div>
      {related.length > 0 && (
        <section aria-labelledby="more-articles" className="border-t border-line bg-canvas py-10 sm:py-12">
          <div className="container-page">
            <h2 id="more-articles" className="mb-6 text-h3">
              {t('articles.more')}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <ArticleCard key={r.slug} a={r} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
