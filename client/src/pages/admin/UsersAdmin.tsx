import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, UserPlus } from '../../components/ui/icons';
import { api, qs } from '../../lib/api';
import { formatDate, roleLabel } from '../../lib/format';
import type { Page } from '../../lib/types';
import { useForm } from '../../components/forms/useForm';
import { Alert, Badge, Button, DataTable, EmptyState, FormError, Modal, Pagination, Select, StatusBadge, TableSkeleton, TextField, useToast } from '../../components/ui';
import { AdminPage, FilterSelect, SearchBox, TableCard } from './shared';

export interface AdminUser { id: string; email: string | null; username: string | null; displayName: string; role: string; status: string; emailVerified: boolean; twoFactorEnabled: boolean; lastLoginAt: string | null; createdAt: string }

export const roleOptions = Object.entries(roleLabel).map(([value, label]) => ({ value, label }));

export default function UsersAdmin() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [recent, setRecent] = useState(false);
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const list = useQuery({ queryKey: ['admin', 'users', q, role, status, recent, page], queryFn: () => api.get<Page<AdminUser>>(`/admin/users${qs({ q, role, status, page, recent: recent ? '1' : undefined })}`), refetchInterval: 30_000 });
  return (
    <AdminPage title="Users" description={list.data ? `Manage accounts, roles and access. ${list.data.total} ${list.data.total === 1 ? 'account' : 'accounts'}${recent ? ' joined in the last 7 days' : ''}; newest first.` : 'Manage accounts, roles and access.'} actions={<Button icon={<UserPlus size={18} />} onClick={() => setInviteOpen(true)}>Invite someone</Button>}>
      <TableCard toolbar={<><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, email or username" /><Button size="sm" variant={recent ? 'primary' : 'secondary'} onClick={() => { setRecent((v) => !v); setPage(1); }}>New this week</Button><FilterSelect label="Role" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={roleOptions} /><FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'DEACTIVATED', label: 'Deactivated' }]} /></>}>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Users"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
              columns={[
                { key: 'n', header: 'Name', cell: (r) => <span className="font-semibold text-heading">{r.displayName}{Date.now() - new Date(r.createdAt).getTime() < 7 * 86400_000 && <Badge tone="mint" className="ml-2 align-middle">New</Badge>}<span className="block text-caption font-normal text-ink-muted">{r.email ?? r.username}</span></span> },
                { key: 'r', header: 'Role', cell: (r) => roleLabel[r.role] },
                { key: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
                { key: 'm', header: 'Two factor', cell: (r) => (r.role === 'LEARNER' ? <span className="text-ink-muted">Not used</span> : r.twoFactorEnabled ? <Badge tone="mint">On</Badge> : <Badge tone="sun">Off</Badge>) },
                { key: 'c', header: 'Joined', cell: (r) => formatDate(r.createdAt) },
                { key: 'l', header: 'Last sign in', cell: (r) => (r.lastLoginAt ? formatDate(r.lastLoginAt) : 'Never'), mobile: false },
              ]}
            />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} total={list.data.total} onPage={setPage} />
          </>
        ) : <div className="p-6"><EmptyState title="No users match" /></div>}
      </TableCard>
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AdminPage>
  );
}

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [result, setResult] = useState<{ setupEmailDelivered: boolean; setupLink: string | null } | null>(null);
  const form = useForm({ displayName: '', email: '', role: 'INSTRUCTOR' });
  const close = () => { setResult(null); form.setValues({ displayName: '', email: '', role: 'INSTRUCTOR' }); onClose(); };
  return (
    <Modal open={open} onClose={close} title="Invite someone" description="They will receive a single use link to choose their own password. You never see or set their password." footer={result ? <Button onClick={close}>Done</Button> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button loading={form.submitting} onClick={() => form.submit(async (v) => { setResult(await api.post('/admin/users', v)); qc.invalidateQueries({ queryKey: ['admin', 'users'] }); })}>Create account</Button></>}>
      {result ? (
        result.setupEmailDelivered ? <Alert tone="success">Account created and the setup email has been sent.</Alert> : (
          <div className="space-y-3">
            <Alert tone="warning" title="Email delivery is not connected">Share this link with the person through a secure channel. It works once and expires in one hour.</Alert>
            <code className="block break-all rounded bg-navy-50 p-3 text-sm">{result.setupLink}</code>
            <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={async () => { await navigator.clipboard.writeText(result.setupLink!); toast('Link copied.'); }}>Copy link</Button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <FormError message={form.formError} />
          <TextField label="Full name" {...form.bind('displayName')} />
          <TextField label="Email address" type="email" {...form.bind('email')} />
          <Select label="Role" options={roleOptions.filter((r) => r.value !== 'LEARNER' && r.value !== 'YOUTH' && r.value !== 'MEMBER')} {...form.bind('role')} hint="Administrators must turn on two factor authentication before using the dashboard." />
        </div>
      )}
    </Modal>
  );
}
