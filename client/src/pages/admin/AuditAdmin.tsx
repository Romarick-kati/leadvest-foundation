import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Page } from '../../lib/types';
import { DataTable, EmptyState, Pagination, TableSkeleton } from '../../components/ui';
import { AdminPage, FilterSelect, TableCard } from './shared';

interface Row { id: string; action: string; targetType: string | null; targetId: string | null; metadata: Record<string, unknown>; ipAddress: string | null; createdAt: string; actor: { id: string; displayName: string } | null }

const areas = ['user', 'program', 'event', 'learning', 'page', 'registration', 'enquiry', 'guardian', 'guardian_link', 'security', 'settings', 'media', 'report', 'payment', 'privacy'].map((a) => ({ value: a, label: a.replace('_', ' ') }));

export default function AuditAdmin() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'audit', action, page], queryFn: () => api.get<Page<Row>>(`/admin/audit-logs${qs({ action, page, pageSize: 50 })}`) });
  return (
    <AdminPage title="Audit log" description="A record of sensitive actions. It never contains passwords, codes or secret values.">
      <TableCard toolbar={<FilterSelect label="Area" value={action} onChange={(v) => { setAction(v); setPage(1); }} options={areas} />}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Audit log"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                { key: 'w', header: 'When', cell: (r) => formatDateTime(r.createdAt) },
                { key: 'a', header: 'Action', cell: (r) => <code className="text-sm text-heading">{r.action}</code> },
                { key: 'by', header: 'By', cell: (r) => r.actor?.displayName ?? 'System' },
                { key: 't', header: 'Target', cell: (r) => (r.targetType ? `${r.targetType} ${r.targetId?.slice(-6) ?? ''}` : '—'), mobile: false },
                { key: 'm', header: 'Details', cell: (r) => (Object.keys(r.metadata ?? {}).length ? <code className="break-all text-caption text-ink-muted">{JSON.stringify(r.metadata)}</code> : '—'), mobile: false },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No entries" /></div>}
      </TableCard>
    </AdminPage>
  );
}
