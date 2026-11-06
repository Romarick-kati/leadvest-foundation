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
  const [programId, setProgramId] = useState('');
  const [page, setPage] = useState(1);
  const events = useQuery({ queryKey: ['admin', 'events', 'filter'], queryFn: () => api.get<Page<{ id: string; title: string }>>('/admin/events?pageSize=100') });
  const programs = useQuery({ queryKey: ['admin', 'programs', 'filter'], queryFn: () => api.get<Page<{ id: string; title: string }>>('/admin/programs?pageSize=100') });
  const list = useQuery({ queryKey: ['admin', 'registrations', status, eventId, programId, page], queryFn: () => api.get<List>(`/admin/registrations${qs({ status, eventId, programId, page })}`) });
  const update = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: string }) => api.patch(`/admin/registrations/${id}`, { status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'registrations'] }); toast('Saved. The person has been told by email if email is connected.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const decide = (r: Row, s: string) => {
    if (s === 'CANCELLED' && r.paymentStatus === 'PAID' && !window.confirm('This person has already paid. Refusing does not send the money back automatically: refund it from the dashboard of your payment provider (Notch Pay, Fapshi or Flutterwave). Refuse anyway?')) return;
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
        <FilterSelect label="Program" value={programId} onChange={(v) => { setProgramId(v); setPage(1); }} options={(programs.data?.items ?? []).map((p) => ({ value: p.id, label: p.title }))} />
      </div>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Registrations"
              rows={list.data.items}
              rowKey={(r) => r.id}
              stackBelow="xl"
              renderCard={(r) => {
                const item = r.event ?? r.program;
                const price = item?.priceCents ? formatMoney(item.priceCents, item.currency ?? 'XAF') : 'Free';
                return (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-bold text-heading">{r.event?.title ?? r.program?.title}</p>
                        <p className="text-caption text-ink-muted">{r.event ? 'Event' : 'Program'} · {price} · {formatDateTime(r.createdAt)}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                      <div className="min-w-0"><dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Requested by</dt><dd className="break-words font-medium text-heading">{r.registrant.displayName}{r.registrant.email && <span className="block break-all text-ink-muted">{r.registrant.email}</span>}</dd></div>
                      <div><dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">For</dt><dd className="font-medium text-heading">{r.learner?.displayName ?? 'Family'}</dd></div>
                      <div><dt className="text-caption font-semibold uppercase tracking-wide text-ink-muted">Payment</dt><dd className="mt-0.5"><StatusBadge status={r.paymentStatus} /></dd></div>
                    </dl>
                    <div className="flex flex-col gap-2 min-[460px]:flex-row">
                      {r.status !== 'CONFIRMED' && <Button className="flex-1" disabled={update.isPending} onClick={() => decide(r, 'CONFIRMED')}>Accept</Button>}
                      {r.status !== 'WAITLISTED' && <Button className="flex-1" variant="secondary" disabled={update.isPending} onClick={() => decide(r, 'WAITLISTED')}>Waiting list</Button>}
                      {r.status !== 'CANCELLED' && <Button className="flex-1" variant="danger" disabled={update.isPending} onClick={() => decide(r, 'CANCELLED')}>Refuse</Button>}
                    </div>
                  </div>
                );
              }}
              columns={[
                { key: 'for', header: 'For', className: 'min-w-[10rem]', cell: (r) => { const i = r.event ?? r.program; return <span><span className="font-semibold text-heading">{r.event?.title ?? r.program?.title}</span><span className="block text-caption text-ink-muted">{r.event ? 'Event' : 'Program'} · {i?.priceCents ? formatMoney(i.priceCents, i.currency ?? 'XAF') : 'Free'}</span></span>; } },
                { key: 'who', header: 'Requested by', className: 'min-w-[11rem]', cell: (r) => <span className="break-words">{r.registrant.displayName}{r.learner && <span className="text-ink-muted"> for {r.learner.displayName}</span>}<span className="block break-all text-caption text-ink-muted">{r.registrant.email}</span></span> },
                { key: 'pay', header: 'Payment', cell: (r) => <StatusBadge status={r.paymentStatus} /> },
                { key: 'date', header: 'Received', className: 'whitespace-nowrap', cell: (r) => formatDateTime(r.createdAt), mobile: false },
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
