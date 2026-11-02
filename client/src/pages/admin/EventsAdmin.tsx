import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from '../../components/ui/icons';
import { api, qs } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Page } from '../../lib/types';
import { ButtonLink, DataTable, EmptyState, Pagination, SampleBadge, StatusBadge, TableSkeleton, useToast } from '../../components/ui';
import { AdminPage, FilterSelect, publishOptions, refreshPublicContent, SearchBox, TableCard } from './shared';
import { RowActions } from './ShareLink';

interface Row { id: string; slug: string; title: string; startsAt: string; timezone: string; status: string; eventStatus: string; capacity: number | null; isSample: boolean; _count: { registrations: number } }

export default function EventsAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: (r: { id: string }) => api.delete(`/admin/events/${r.id}`),
    onSuccess: () => { refreshPublicContent(qc); toast('Event deleted.'); },
    onError: (e) => toast(e instanceof Error ? e.message : 'Could not delete it.', 'error'),
  });
  const confirmDelete = (r: { id: string; title: string; _count: { registrations: number } }) => {
    const n = r._count.registrations;
    if (window.confirm(`Delete "${r.title}" for good?${n ? ` Its ${n} registration${n === 1 ? '' : 's'} will be deleted too.` : ''} To hide it without deleting, set it to Draft instead.`)) remove.mutate(r);
  };
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'events', q, status, page], queryFn: () => api.get<Page<Row>>(`/admin/events${qs({ q, status, page })}`) });
  return (
    <AdminPage title="Events" description="Manage event details, registration, capacity and status." actions={<ButtonLink to="/admin/events/new" icon={<Plus size={18} />}>New event</ButtonLink>}>
      <TableCard toolbar={<><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search events" /><FilterSelect label="Visibility" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={publishOptions} /></>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Events"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/admin/events/${r.id}`)}
              columns={[
                { key: 'title', header: 'Event', cell: (r) => <span className="font-semibold text-heading">{r.title} {r.isSample && <SampleBadge />}</span> },
                { key: 'date', header: 'Starts', cell: (r) => formatDateTime(r.startsAt, r.timezone) },
                { key: 'vis', header: 'Visibility', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'state', header: 'Event status', cell: (r) => <StatusBadge status={r.eventStatus} /> },
                { key: 'reg', header: 'Registrations', cell: (r) => `${r._count.registrations}${r.capacity ? ` / ${r.capacity}` : ''}` },
                { key: 'actions', header: 'Actions', cell: (r) => <RowActions editTo={`/admin/events/${r.id}`} path={`/events/${r.slug}`} published={r.status === 'PUBLISHED'} onDelete={() => confirmDelete(r)} deleting={remove.isPending && remove.variables?.id === r.id} /> },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No events found" action={<ButtonLink to="/admin/events/new">Create an event</ButtonLink>} /></div>}
      </TableCard>
    </AdminPage>
  );
}
