import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useDocumentTitle } from '../../../lib/useDocumentTitle';
import { formatDate } from '../../../lib/format';
import { PageHeader } from '../../../components/layout/PageHeader';
import { SimpleMarkdown, headingId } from '../../../components/content/SimpleMarkdown';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { useSite } from '../../../lib/site';
import { Alert, PageLoader } from '../../../components/ui';

/**
 * Policy pages show the administrator managed version (Dashboard > Pages) when one is
 * published, otherwise the built in draft. Both carry a review notice until approved.
 */
export function PolicyPage({ slug, title, intro, approved, draft }: { slug: string; title: string; intro: string; approved: boolean; draft: string }) {
  useDocumentTitle(title);
  const q = useQuery({ queryKey: ['page', slug], queryFn: () => api.get<{ title: string; body: string; needsReview: boolean; updatedAt: string } | null>(`/pages/${slug}`), retry: false });
  const { site } = useSite();
  const { user } = useAuth();
  if (q.isLoading) return <PageLoader />;
  const managed = q.data;
  const source = managed?.body ?? draft;
  const headings = [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
  const needsReview = managed ? managed.needsReview : !approved;
  return (
    <>
      <PageHeader eyebrow="Policies" title={managed?.title ?? title}>
        {intro}
      </PageHeader>
      <div className="container-page py-12">
        {needsReview && (user?.role === 'ADMIN' ? (
          <Alert tone="warning" title="Admin: this page is not approved yet" className="mb-10 max-w-prose">
            Visitors see a notice until you approve it. First fill in the highlighted details in <Link to="/admin/settings">Dashboard &gt; Settings</Link> (Legal details and Contact). Then switch on the approval for this page under Policies in the same place, and save.
          </Alert>
        ) : (
          <Alert tone="info" title="This page is being finalised" className="mb-10 max-w-prose">
            The foundation is still completing some details. For anything urgent, please <Link to="/contact">contact us</Link>.
          </Alert>
        ))}
        {site.legal.lastReviewed && <p className="mb-6 text-caption font-semibold text-ink-muted">Last reviewed: {site.legal.lastReviewed}</p>}
        {headings.length >= 4 && (
          <nav aria-label="On this page" className="mb-10 max-w-prose rounded-xl border border-line bg-canvas p-5">
            <p className="mb-3 text-label text-ink-muted">On this page</p>
            <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {headings.map((h) => (<li key={h}><a href={`#${headingId(h)}`}>{h}</a></li>))}
            </ol>
          </nav>
        )}
        <SimpleMarkdown source={source} />
        {managed && <p className="mt-10 text-caption text-ink-muted">Last updated {formatDate(managed.updatedAt)}</p>}
      </div>
    </>
  );
}
