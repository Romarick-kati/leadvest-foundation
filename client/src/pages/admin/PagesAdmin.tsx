import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useForm } from '../../components/forms/useForm';
import { SimpleMarkdown } from '../../components/content/SimpleMarkdown';
import { Alert, Badge, Button, Checkbox, DataTable, EmptyState, FormError, Modal, Select, StatusBadge, TableSkeleton, TextArea, TextField, useToast } from '../../components/ui';
import { AdminPage, publishOptions, TableCard } from './shared';

interface PageRow { id: string; slug: string; title: string; body: string; status: string; needsReview: boolean; updatedAt: string }

const knownSlugs = 'privacy, child-safety, terms, consent, faq';

export default function PagesAdmin() {
  const list = useQuery({ queryKey: ['admin', 'pages'], queryFn: () => api.get<PageRow[]>('/admin/pages') });
  const [editing, setEditing] = useState<PageRow | 'new' | null>(null);
  return (
    <AdminPage title="Pages and policies" description={`Publish approved versions of policies and other text pages. A published page with the web address ${knownSlugs} replaces the built in draft.`} actions={<Button icon={<Plus size={18} />} onClick={() => setEditing('new')}>New page</Button>}>
      <TableCard>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
          <DataTable
            caption="Pages"
            rows={list.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => setEditing(r)}
            columns={[
              { key: 't', header: 'Title', cell: (r) => <span className="font-semibold text-heading">{r.title}</span> },
              { key: 's', header: 'Address', cell: (r) => `/${r.slug}` },
              { key: 'st', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              { key: 'rv', header: 'Review', cell: (r) => (r.needsReview ? <Badge tone="sun">Needs review</Badge> : <Badge tone="mint">Approved</Badge>) },
              { key: 'u', header: 'Updated', cell: (r) => formatDateTime(r.updatedAt), mobile: false },
            ]}
          />
        ) : <div className="p-6"><EmptyState title="No managed pages yet">Policies currently show their built in drafts.</EmptyState></div>}
      </TableCard>
      {editing && <PageModal page={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </AdminPage>
  );
}

function PageModal({ page, onClose }: { page: PageRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  const form = useForm({ title: page?.title ?? '', slug: page?.slug ?? '', body: page?.body ?? '', status: page?.status ?? 'DRAFT', needsReview: page?.needsReview ?? true });
  return (
    <Modal open onClose={onClose} title={page ? 'Edit page' : 'New page'} size="lg" footer={<>
      <Button variant="ghost" onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</Button>
      <Button loading={form.submitting} onClick={() => form.submit(async (v) => { if (page) await api.patch(`/admin/pages/${page.id}`, v); else await api.post('/admin/pages', v); qc.invalidateQueries({ queryKey: ['admin', 'pages'] }); qc.invalidateQueries({ queryKey: ['page'] }); toast('Page saved.'); onClose(); })}>Save</Button>
    </>}>
      {preview ? <SimpleMarkdown source={form.values.body} /> : (
        <div className="space-y-4">
          <FormError message={form.formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Title" {...form.bind('title')} />
            <TextField label="Web address" hint="For example privacy" {...form.bind('slug')} />
          </div>
          <TextArea label="Content" rows={14} hint="Use ## for headings, - for lists, **bold**, and [[text]] to highlight something still to be supplied." {...form.bind('body')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Status" options={publishOptions} {...form.bind('status')} />
            <div className="pt-7"><Checkbox label="Still needs review (shows a draft notice)" {...form.bindCheck('needsReview')} /></div>
          </div>
          <Alert tone="warning">Only clear “needs review” once the foundation has formally approved this text.</Alert>
        </div>
      )}
    </Modal>
  );
}
