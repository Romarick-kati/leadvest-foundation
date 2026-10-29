import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, DataTable, EmptyState, FormError, Modal, SampleBadge, StatusBadge, TableSkeleton, TextArea, TextField, useToast } from '../../components/ui';
import { AdminPage, slugify, TableCard } from './shared';

interface Row { id: string; title: string; slug: string; status: string; isPublic: boolean; isSample: boolean; sortOrder: number; _count: { lessons: number }; program: { title: string } | null }

export default function LearningAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const list = useQuery({ queryKey: ['admin', 'modules'], queryFn: () => api.get<Row[]>('/admin/learning/modules') });
  const form = useForm({ title: '', slug: '', description: '' });
  return (
    <AdminPage title="Learning" description="Topics and lessons for the child friendly learning area. Publish only content the foundation has approved." actions={<Button icon={<Plus size={18} />} onClick={() => setOpen(true)}>New topic</Button>}>
      <Alert tone="info" className="mb-6">The learning area does not claim to offer a complete curriculum. It shows whatever topics are published here.</Alert>
      <TableCard>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
          <DataTable
            caption="Learning topics"
            rows={list.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/admin/learning/${r.id}`)}
            columns={[
              { key: 'title', header: 'Topic', cell: (r) => <span className="font-semibold text-heading">{r.title} {r.isSample && <SampleBadge />}</span> },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              { key: 'access', header: 'Access', cell: (r) => (r.isPublic ? 'Everyone' : `Enrolled in ${r.program?.title ?? 'a program'}`) },
              { key: 'lessons', header: 'Lessons', cell: (r) => r._count.lessons },
              { key: 'order', header: 'Order', cell: (r) => r.sortOrder, mobile: false },
            ]}
          />
        ) : <div className="p-6"><EmptyState title="No topics yet" action={<Button onClick={() => setOpen(true)}>Create a topic</Button>} /></div>}
      </TableCard>
      <Modal open={open} onClose={() => setOpen(false)} title="New topic" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button loading={form.submitting} onClick={() => form.submit(async (v) => { const m = await api.post<{ id: string }>('/admin/learning/modules', v); qc.invalidateQueries({ queryKey: ['admin', 'modules'] }); toast('Topic created as a draft.'); setOpen(false); navigate(`/admin/learning/${m.id}`); })}>Create</Button></>}>
        <div className="space-y-4">
          <FormError message={form.formError} />
          <TextField label="Title" {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); form.set('slug', slugify(e.target.value)); }} />
          <TextField label="Web address" {...form.bind('slug')} />
          <TextArea label="Short description" rows={3} {...form.bind('description')} />
        </div>
      </Modal>
    </AdminPage>
  );
}
