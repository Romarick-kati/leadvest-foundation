import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from '../../components/ui/icons';
import { api, qs } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Page } from '../../lib/types';
import { ButtonLink, DataTable, EmptyState, Pagination, SampleBadge, StatusBadge, TableSkeleton } from '../../components/ui';
import { useT } from '../../i18n';
import { articleCategories } from '../public/resources/Resources';
import { AdminPage, FilterSelect, publishOptions, SearchBox, TableCard } from './shared';

interface Row { id: string; title: string; slug: string; category: string; status: string; isSample: boolean; publishedAt: string | null; updatedAt: string }

export default function ArticlesAdmin() {
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'articles', q, status, category, page], queryFn: () => api.get<Page<Row>>(`/admin/articles${qs({ q, status, category, page })}`) });
  const categoryOptions = articleCategories.map((c) => ({ value: c, label: t(`articles.categories.${c}`) }));
  return (
    <AdminPage
      title={t('admin.articles')}
      description="Write guides and news for the Resources page. Drafts stay private until you publish them."
      actions={<ButtonLink to="/admin/articles/new" icon={<Plus size={18} />}>New article</ButtonLink>}
    >
      <TableCard
        toolbar={
          <>
            <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search articles" />
            <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={publishOptions} />
            <FilterSelect label="Topic" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={categoryOptions} />
          </>
        }
      >
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption={t('admin.articles')}
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/admin/articles/${r.id}`)}
              columns={[
                { key: 'title', header: 'Article', cell: (r) => <span className="font-semibold text-heading">{r.title} {r.isSample && <SampleBadge />}</span> },
                { key: 'category', header: 'Topic', cell: (r) => t(`articles.categories.${r.category}`) },
                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'published', header: 'Published', cell: (r) => (r.publishedAt ? formatDate(r.publishedAt) : '—'), mobile: false },
                { key: 'updated', header: 'Updated', cell: (r) => formatDate(r.updatedAt), mobile: false },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No articles found" action={<ButtonLink to="/admin/articles/new">Write an article</ButtonLink>} /></div>}
      </TableCard>
    </AdminPage>
  );
}
