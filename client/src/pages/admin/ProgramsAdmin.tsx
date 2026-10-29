import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from '../../components/ui/icons';
import { api, qs } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Page } from '../../lib/types';
import { ButtonLink, DataTable, EmptyState, Pagination, SampleBadge, StatusBadge, TableSkeleton } from '../../components/ui';
import { AdminPage, FilterSelect, publishOptions, SearchBox, TableCard } from './shared';
import { RowActions } from './ShareLink';

interface Row { id: string; title: string; slug: string; status: string; isSample: boolean; updatedAt: string; registrationOpen: boolean; _count: { registrations: number }; assignments: { instructor: { displayName: string } }[] }

export default function ProgramsAdmin() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'programs', q, status, page], queryFn: () => api.get<Page<Row>>(`/admin/programs${qs({ q, status, page })}`) });
  return (
    <AdminPage title="Programs" description="Create programs, keep them as drafts until approved, then publish." actions={<ButtonLink to="/admin/programs/new" icon={<Plus size={18} />}>New program</ButtonLink>}>
      <TableCard toolbar={<><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search programs" /><FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={publishOptions} /></>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Programs"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/admin/programs/${r.id}`)}
              columns={[
                { key: 'title', header: 'Program', cell: (r) => <span className="font-semibold text-heading">{r.title} {r.isSample && <SampleBadge />}</span> },
                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'reg', header: 'Registration', cell: (r) => (r.registrationOpen ? 'Open' : 'Closed') },
                { key: 'count', header: 'Registrations', cell: (r) => r._count.registrations },
                { key: 'inst', header: 'Instructors', cell: (r) => r.assignments.map((a) => a.instructor.displayName).join(', ') || '—', mobile: false },
                { key: 'updated', header: 'Updated', cell: (r) => formatDate(r.updatedAt), mobile: false },
                { key: 'actions', header: 'Link', cell: (r) => <RowActions editTo={`/admin/programs/${r.id}`} path={`/programs/${r.slug}`} published={r.status === 'PUBLISHED'} /> },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No programs found" action={<ButtonLink to="/admin/programs/new">Create a program</ButtonLink>} /></div>}
      </TableCard>
    </AdminPage>
  );
}
