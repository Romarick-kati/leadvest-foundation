import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import { formatDateTime, formatMoney } from '../../lib/format';
import type { Page } from '../../lib/types';
import { Alert, Badge, DataTable, EmptyState, Pagination, StatusBadge, TableSkeleton } from '../../components/ui';
import { AdminPage, TableCard } from './shared';

interface Row { id: string; purpose: string; provider: string; providerRef: string | null; amountCents: number; currency: string; status: string; isSimulation: boolean; createdAt: string; registration: { event: { title: string } | null; program: { title: string } | null; registrant: { displayName: string; email: string | null } } | null; payer: { displayName: string; email: string | null } | null }

export default function PaymentsAdmin() {
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['admin', 'payments', page], queryFn: () => api.get<Page<Row> & { mode: string }>(`/admin/payments${qs({ page })}`) });
  return (
    <AdminPage title="Payments" description="Statuses are set only by verified payment provider events. Card details are never stored.">
      {list.data?.mode === 'disabled' && <Alert tone="info" className="mb-4" title="Online payments are switched off">Before enabling payments, the foundation must confirm the receiving legal entity, merchant account, currency, provider, settlement account, pricing, cancellation and refund rules. See the deployment guide.</Alert>}
      {list.data?.mode === 'fapshi' && <Alert tone="info" className="mb-4" title="Fapshi mobile money is on">Payments are confirmed with Fapshi's servers before access is given. Rows marked Simulation were made with test keys and no real money moved. Your earnings are in your Fapshi dashboard.</Alert>}
      {(list.data?.mode === 'flutterwave' || list.data?.mode === 'both') && <Alert tone="info" className="mb-4" title="Flutterwave is on">Every payment is confirmed with Flutterwave's servers (status, amount and currency) before anything is approved. Rows marked Simulation were made with test keys and no real money moved. Your earnings and refunds are in your Flutterwave dashboard.</Alert>}
      {list.data?.mode === 'mock' && <Alert tone="warning" className="mb-4" title="Simulation mode">Payments listed as simulations involved no money.</Alert>}
      <TableCard>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Payments"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                { key: 'f', header: 'For', cell: (r) => <span className="font-semibold text-heading">{r.registration?.event?.title ?? r.registration?.program?.title ?? (r.purpose === 'ACCESS' ? 'Access fee' : r.purpose)}</span> },
                { key: 'w', header: 'Paid by', cell: (r) => { const who = r.payer ?? r.registration?.registrant; return who ? <span>{who.displayName}<span className="block text-caption text-ink-muted">{who.email}</span></span> : '—'; }, mobile: false },
                { key: 'a', header: 'Amount', cell: (r) => formatMoney(r.amountCents, r.currency) },
                { key: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'p', header: 'Provider', cell: (r) => <span>{r.provider} {r.isSimulation && <Badge tone="sun">Simulation</Badge>}</span> },
                { key: 'd', header: 'Created', cell: (r) => formatDateTime(r.createdAt), mobile: false },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No payments" /></div>}
      </TableCard>
    </AdminPage>
  );
}
