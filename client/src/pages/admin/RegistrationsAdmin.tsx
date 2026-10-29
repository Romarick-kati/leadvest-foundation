import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import { formatDateTime, formatMoney } from '../../lib/format';
import type { Page } from '../../lib/types';
import { Alert, Button, DataTable, EmptyState, Pagination, StatusBadge, TableSkeleton, useToast } from '../../components/ui';
import { AdminPage, FilterSelect, TableCard } from './shared';

interface Row {
  id: string; status: string; paymentStatus: string; createdAt: string; notes: string | null;
  event: { title: string; priceCents: number | null; currency: string | null } | null;
  program: { title: string; priceCents: number | null; currency: string | null } | null;
  registrant: { id: string; displayName: string; email: string | null };
  learner: { id: string; displayName: string } | null;
}
type List = Page<Row> & { pendingCount: number; paid: { currency: string; amountCents: number; count: number }[] };

const statuses = ['PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED'].map((s) => ({ value: s, label: s === 'CANCELLED' ? 'Refused / cancelled' : s[0] + s.slice(1).toLowerCase() }));

/** Every request waits here as Pending until an admin accepts it, puts it on the waiting list or refuses it. */
export default function RegistrationsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [eventId, setEventId] = useState('');
  const [page, setPage] = useState(1);
  const events = useQuery({ queryKey: ['admin', 'events', 'filter'], queryFn: () => api.get<Page<{ id: string; title: string }>>('/admin/events?pageSize=100') });
  const list = useQuery({ queryKey: ['admin', 'registrations', status, eventId, page], queryFn: () => api.get<List>(`/admin/registrations${qs({ status, eventId, page })}`) });
  const update = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: string }) => api.patch(`/admin/registrations/${id}`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'registrations'] }); toast('Saved. The person has been told by email if email is connected.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const decide = (r: Row, s: string) => {
    if (s === 'CANCELLED' && r.paymentStatus === 'PAID' && !window.confirm('This person has already paid. Refusing does not send the money back automatically: refund it from your Flutterwave dashboard. Refuse anyway?')) return;
    update.mutate({ id: r.id, status: s });
  };
  const pending = list.data?.pendingCount ?? 0;
  return (
    <AdminPage title="Registrations" description="Requests to join events and programs. Each one stays Pending until you accept it, put it on the waiting list or refuse it. Children are shown by first name only.">
      {pending > 0 && <Alert tone="warning" className="mb-4" title={`${pending} request${pending === 1 ? '' : 's'} waiting for your decision`}>Use Accept, Waiting list or Refuse on each row.</Alert>}
      {list.data && list.data.paid.length > 0 && (
        <Alert tone="info" className="mb-4" title="Paid so far (confirmed by the payment provider)">
          {list.data.paid.map((p) => `${formatMoney(p.amountCents, p.currency)} from ${p.count} payment${p.count === 1 ? '' : 's'}`).join(' · ')}
        </Alert>
      )}
      <TableCard toolbar={<div className="flex flex-wrap gap-2">
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statuses} />
        <FilterSelect label="Event" value={eventId} onChange={(v) => { setEventId(v); setPage(1); }} options={(events.data?.items ?? []).map((e) => ({ value: e.id, label: e.title }))} />
      </div>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Registrations"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                { key: 'for', header: 'For', cell: (r) => <span className="font-semibold text-heading">{r.event?.title ?? r.program?.title}</span> },
                { key: 'who', header: 'Requested by', cell: (r) => <span>{r.registrant.displayName}<span className="block text-caption text-ink-muted">{r.registrant.email}</span></span> },
                { key: 'learner', header: 'Learner', cell: (r) => r.learner?.displayName ?? 'Family', mobile: false },
                { key: 'price', header: 'Price', cell: (r) => { const i = r.event ?? r.program; return i?.priceCents ? formatMoney(i.priceCents, i.currency ?? 'XAF') : 'Free'; }, mobile: false },
                { key: 'pay', header: 'Payment', cell: (r) => <StatusBadge status={r.paymentStatus} /> },
                { key: 'date', header: 'Received', cell: (r) => formatDateTime(r.createdAt), mobile: false },
                { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                {
                  key: 'act', header: 'Decision', cell: (r) => (
                    <div className="flex flex-wrap gap-1.5">
                      {r.status !== 'CONFIRMED' && <Button size="sm" disabled={update.isPending} onClick={() => decide(r, 'CONFIRMED')}>Accept</Button>}
                      {r.status !== 'WAITLISTED' && <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => decide(r, 'WAITLISTED')}>Waiting list</Button>}
                      {r.status !== 'CANCELLED' && <Button size="sm" variant="danger" disabled={update.isPending} onClick={() => decide(r, 'CANCELLED')}>Refuse</Button>}
                    </div>
                  ),
                },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No registrations" /></div>}
      </TableCard>
    </AdminPage>
  );
}
