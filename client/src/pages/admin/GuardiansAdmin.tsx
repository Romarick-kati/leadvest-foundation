import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime, titleCase } from '../../lib/format';
import { Alert, Button, DataTable, EmptyState, TableSkeleton, useToast } from '../../components/ui';
import { AdminPage, FilterSelect, TableCard } from './shared';

interface Link { id: string; status: string; relationship: string; createdAt: string; guardian: { id: string; displayName: string; email: string }; learner: { id: string; displayName: string; username: string } }

export default function GuardiansAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const list = useQuery({ queryKey: ['admin', 'guardian-links', status], queryFn: () => api.get<Link[]>(`/admin/guardian-links?status=${status || 'PENDING'}`) });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'verify' | 'revoke' }) => api.post(`/admin/guardian-links/${id}/${decision}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('Decision recorded.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  return (
    <AdminPage title="Guardian checks" description="Requests from a second parent or guardian to manage an existing learning account.">
      <Alert tone="warning" className="mb-4">Only verify a relationship after confirming it through the foundation’s agreed process, for example with the first guardian or official documents.</Alert>
      <TableCard toolbar={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'REVOKED', label: 'Revoked' }]} />}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
          <DataTable
            caption="Guardian link requests"
            rows={list.data}
            rowKey={(r) => r.id}
            columns={[
              { key: 'g', header: 'Guardian', cell: (r) => <span className="font-semibold text-heading">{r.guardian.displayName}<span className="block text-caption font-normal text-ink-muted">{r.guardian.email}</span></span> },
              { key: 'l', header: 'Learner', cell: (r) => `${r.learner.displayName} (${r.learner.username})` },
              { key: 'r', header: 'Relationship', cell: (r) => titleCase(r.relationship) },
              { key: 'd', header: 'Requested', cell: (r) => formatDateTime(r.createdAt), mobile: false },
              {
                key: 'a', header: 'Action', cell: (r) => (
                  <span className="flex gap-2">
                    {r.status !== 'VERIFIED' && <Button size="sm" onClick={() => window.confirm('Verify this guardian relationship?') && decide.mutate({ id: r.id, decision: 'verify' })}>Verify</Button>}
                    {r.status !== 'REVOKED' && <Button size="sm" variant="ghost" className="text-danger" onClick={() => decide.mutate({ id: r.id, decision: 'revoke' })}>{r.status === 'PENDING' ? 'Decline' : 'Revoke'}</Button>}
                  </span>
                ),
              },
            ]}
          />
        ) : <div className="p-6"><EmptyState title="Nothing to review" /></div>}
      </TableCard>
    </AdminPage>
  );
}
