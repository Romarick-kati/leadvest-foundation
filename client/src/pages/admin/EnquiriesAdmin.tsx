import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import { formatDateTime, titleCase } from '../../lib/format';
import type { Page } from '../../lib/types';
import { enquiryCategories } from '../../components/forms/EnquiryForm';
import { Button, DataTable, EmptyState, Modal, Pagination, Select, StatusBadge, TableSkeleton, TextArea, useToast } from '../../components/ui';
import { AdminPage, FilterSelect, SearchBox, TableCard } from './shared';

interface Enquiry { id: string; category: string; name: string; email: string; phone: string | null; organization: string | null; subject: string | null; message: string; status: string; internalNotes: string | null; createdAt: string }

const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'].map((s) => ({ value: s, label: titleCase(s) }));

export default function EnquiriesAdmin() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Enquiry | null>(null);
  const list = useQuery({ queryKey: ['admin', 'enquiries', q, status, category, page], queryFn: () => api.get<Page<Enquiry>>(`/admin/enquiries${qs({ q, status, category, page })}`) });
  return (
    <AdminPage title="Enquiries" description="Messages from the contact and involvement forms.">
      <TableCard toolbar={<><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or subject" /><FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statuses} /><FilterSelect label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={enquiryCategories} /></>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Enquiries"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowClick={setOpen}
              columns={[
                { key: 'from', header: 'From', cell: (r) => <span className="font-semibold text-heading">{r.name}<span className="block text-caption font-normal text-ink-muted">{r.email}</span></span> },
                { key: 'subj', header: 'Subject', cell: (r) => r.subject ?? <span className="text-ink-muted">{r.message.slice(0, 60)}…</span> },
                { key: 'cat', header: 'Category', cell: (r) => enquiryCategories.find((c) => c.value === r.category)?.label ?? r.category },
                { key: 'st', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'd', header: 'Received', cell: (r) => formatDateTime(r.createdAt), mobile: false },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No enquiries match" /></div>}
      </TableCard>
      {open && <EnquiryModal enquiry={open} onClose={() => setOpen(null)} />}
    </AdminPage>
  );
}

function EnquiryModal({ enquiry, onClose }: { enquiry: Enquiry; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState(enquiry.status);
  const [category, setCategory] = useState(enquiry.category);
  const [notes, setNotes] = useState(enquiry.internalNotes ?? '');
  const save = useMutation({
    mutationFn: () => api.patch(`/admin/enquiries/${enquiry.id}`, { status, category, internalNotes: notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('Enquiry updated.'); onClose(); },
  });
  return (
    <Modal open onClose={onClose} title={enquiry.subject ?? 'Enquiry'} description={`${enquiry.name} · ${formatDateTime(enquiry.createdAt)}`} size="lg" footer={<><a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.subject ?? 'Your message to Lead Vest Foundation'}`)}`} className="mr-auto self-center text-sm font-semibold">Reply by email</a><Button variant="ghost" onClick={onClose}>Close</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">Email</dt><dd className="break-all text-heading">{enquiry.email}</dd></div>
        {enquiry.phone && <div><dt className="text-ink-muted">Phone</dt><dd className="text-heading">{enquiry.phone}</dd></div>}
        {enquiry.organization && <div><dt className="text-ink-muted">Organisation</dt><dd className="text-heading">{enquiry.organization}</dd></div>}
      </dl>
      <p className="whitespace-pre-line rounded-lg bg-navy-50 p-4 text-ink">{enquiry.message}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statuses} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={enquiryCategories} />
        <div className="sm:col-span-2"><TextArea label="Internal notes" hint="Visible to administrators only." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      </div>
    </Modal>
  );
}
