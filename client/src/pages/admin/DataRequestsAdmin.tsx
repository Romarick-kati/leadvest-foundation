import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime, titleCase } from '../../lib/format';
import { Alert, DataTable, EmptyState, TableSkeleton, useToast } from '../../components/ui';
import { AdminPage, TableCard } from './shared';

interface Row { id: string; type: string; status: string; details: string | null; createdAt: string; user: { id: string; displayName: string; email: string | null } }

export default function DataRequestsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: ['admin', 'data-requests'], queryFn: () => api.get<Row[]>('/admin/data-requests') });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/data-requests/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('Request updated.'); },
  });
  return (
    <AdminPage title="Privacy requests" description="Requests to export, correct or delete personal data.">
      <Alert tone="info" className="mb-4">Handle each request according to the foundation’s approved privacy policy and applicable law. Users can download their own data at any time from their Privacy settings.</Alert>
      <TableCard>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
          <DataTable
            caption="Privacy requests"
            rows={list.data}
            rowKey={(r) => r.id}
            columns={[
              { key: 'u', header: 'Person', cell: (r) => <span className="font-semibold text-heading">{r.user.displayName}<span className="block text-caption font-normal text-ink-muted">{r.user.email}</span></span> },
              { key: 't', header: 'Request', cell: (r) => titleCase(r.type) },
              { key: 'd', header: 'Details', cell: (r) => r.details ?? '—' },
              { key: 'c', header: 'Received', cell: (r) => formatDateTime(r.createdAt), mobile: false },
              {
                key: 's', header: 'Status', cell: (r) => (
                  <select aria-label="Status" value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className="rounded border border-line-strong px-2 py-1 text-sm">
                    {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </select>
                ),
              },
            ]}
          />
        ) : <div className="p-6"><EmptyState title="No privacy requests" /></div>}
      </TableCard>
    </AdminPage>
  );
}
