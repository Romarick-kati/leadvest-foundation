import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime, roleLabel } from '../../lib/format';
import { Alert, Badge, Button, PageLoader, Panel, Select, StatusBadge, useToast } from '../../components/ui';
import { AdminPage } from './shared';
import { roleOptions, type AdminUser } from './UsersAdmin';

interface Detail extends AdminUser {
  access?: { lifetime: boolean; until: string | null; active: boolean; required: boolean };
  assignments: { id: string; title: string }[];
  learners: { id: string; displayName: string; username: string; linkStatus: string }[];
  guardians: { id: string; displayName: string; email: string; linkStatus: string }[];
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [link, setLink] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api.get<Detail>(`/admin/users/${id}`) });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/admin/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('User updated.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const access = useMutation({
    mutationFn: (body: { action: 'grant_lifetime' | 'grant_days' | 'revoke'; days?: number }) => api.post(`/admin/users/${id}/access`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('Access updated.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const reset = useMutation({
    mutationFn: () => api.post<{ delivered: boolean; setupLink: string | null }>(`/admin/users/${id}/password-reset`),
    onSuccess: (r) => { if (r.delivered) toast('Password reset email sent.'); else setLink(r.setupLink); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (withLearners: boolean) => api.delete(`/admin/users/${id}${withLearners ? '?withLearners=1' : ''}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast('Account deleted.'); navigate('/admin/users', { replace: true }); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const revoke = useMutation({
    mutationFn: () => api.post<{ revoked: number }>(`/admin/users/${id}/revoke-sessions`),
    onSuccess: (r) => toast(`Signed out of ${r.revoked} sessions.`),
  });
  if (q.isLoading || !q.data) return <PageLoader />;
  const u = q.data;
  const isSelf = me?.id === u.id;
  return (
    <AdminPage title={u.displayName} description={roleLabel[u.role]}>
      <Link to="/admin/users" className="-mt-4 mb-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"><ChevronLeft size={16} aria-hidden /> All users</Link>
      <p className="mb-4 text-caption text-ink-muted">Viewing this record is recorded in the audit log.</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Account">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-caption uppercase text-ink-muted">{u.email ? 'Email' : 'Username'}</dt><dd className="break-all text-heading">{u.email ?? u.username}</dd></div>
            <div><dt className="text-caption uppercase text-ink-muted">Status</dt><dd><StatusBadge status={u.status} /></dd></div>
            {u.email && <div><dt className="text-caption uppercase text-ink-muted">Email confirmed</dt><dd>{u.emailVerified ? 'Yes' : 'No'}</dd></div>}
            {u.role !== 'LEARNER' && <div><dt className="text-caption uppercase text-ink-muted">Two factor</dt><dd>{u.twoFactorEnabled ? <Badge tone="mint">On</Badge> : <Badge tone="sun">Off</Badge>}</dd></div>}
            <div><dt className="text-caption uppercase text-ink-muted">Joined</dt><dd>{formatDateTime(u.createdAt)}</dd></div>
            <div><dt className="text-caption uppercase text-ink-muted">Last sign in</dt><dd>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</dd></div>
          </dl>
        </Panel>
        <Panel title="Access">
          <div className="space-y-4">
            {u.role !== 'LEARNER' && (
              <Select label="Role" value={u.role} disabled={isSelf} onChange={(e) => window.confirm(`Change role to ${roleLabel[e.target.value]}? They will be signed out.`) && update.mutate({ role: e.target.value })} options={roleOptions.filter((r) => r.value !== 'LEARNER' && r.value !== 'YOUTH')} hint={isSelf ? 'You cannot change your own role.' : undefined} />
            )}
            <div className="flex flex-wrap gap-2">
              {u.status === 'ACTIVE' ? (
                <Button variant="secondary" disabled={isSelf} onClick={() => window.confirm('Suspend this account? They will be signed out.') && update.mutate({ status: 'SUSPENDED' })}>Suspend</Button>
              ) : (
                <Button variant="secondary" onClick={() => update.mutate({ status: 'ACTIVE' })}>Reactivate</Button>
              )}
              {u.email && !u.emailVerified && <Button variant="ghost" onClick={() => update.mutate({ markEmailVerified: true })}>Mark email as confirmed</Button>}
              {u.email && <Button variant="ghost" loading={reset.isPending} onClick={() => reset.mutate()}>Send password reset</Button>}
              <Button variant="ghost" onClick={() => revoke.mutate()}>Sign out everywhere</Button>
              {!isSelf && (
                <Button variant="ghost" className="text-danger" loading={remove.isPending} onClick={() => {
                  const hasLearners = u.learners.length > 0;
                  if (!window.confirm(`Delete ${u.displayName}'s account for good? Their registrations and settings are deleted too. This cannot be undone.${hasLearners ? ' Their learner accounts will be deleted as well.' : ''}`)) return;
                  remove.mutate(hasLearners);
                }}>Delete account</Button>
              )}
            </div>
            {u.email && !u.emailVerified && <p className="text-caption text-ink-muted">Only mark an email as confirmed after checking the person controls it.</p>}
            {link && (
              <div className="space-y-2">
                <Alert tone="warning">Email delivery is not connected. Share this one hour, single use link securely.</Alert>
                <code className="block break-all rounded bg-navy-50 p-3 text-sm">{link}</code>
                <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={async () => { await navigator.clipboard.writeText(link); toast('Copied.'); }}>Copy</Button>
              </div>
            )}
          </div>
        </Panel>
        {(u.role === 'PARENT' || u.role === 'YOUTH') && u.access && (
          <Panel title="Paid access">
            <div className="space-y-4">
              <p className="text-heading">
                {!u.access.required ? 'Not charged: the access fee is switched off.' : u.access.lifetime ? 'Free access for good.' : u.access.active && u.access.until ? `Active until ${formatDateTime(u.access.until)}.` : 'Not paid. They are asked to pay before they continue.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" loading={access.isPending} onClick={() => window.confirm('Give this person free access for good?') && access.mutate({ action: 'grant_lifetime' })}>Give free access</Button>
                <Button variant="ghost" onClick={() => access.mutate({ action: 'grant_days', days: 30 })}>Add 30 days</Button>
                <Button variant="ghost" onClick={() => window.confirm('Remove all paid access?') && access.mutate({ action: 'revoke' })}>Remove access</Button>
              </div>
              <p className="text-caption text-ink-muted">Children follow their parent or guardian. Use this for scholarships, partners and testers.</p>
            </div>
          </Panel>
        )}
        {u.assignments.length > 0 && (
          <Panel title="Assigned programs"><ul className="space-y-1">{u.assignments.map((a) => <li key={a.id}><Link to={`/admin/programs/${a.id}`}>{a.title}</Link></li>)}</ul></Panel>
        )}
        {u.learners.length > 0 && (
          <Panel title="Children (learning accounts)"><ul className="space-y-2">{u.learners.map((l) => <li key={l.id} className="flex items-center justify-between"><Link to={`/admin/users/${l.id}`}>{l.displayName} ({l.username})</Link><StatusBadge status={l.linkStatus} /></li>)}</ul></Panel>
        )}
        {u.guardians.length > 0 && (
          <Panel title="Guardians"><ul className="space-y-2">{u.guardians.map((g) => <li key={g.id} className="flex items-center justify-between"><Link to={`/admin/users/${g.id}`}>{g.displayName}</Link><StatusBadge status={g.linkStatus} /></li>)}</ul></Panel>
        )}
      </div>
    </AdminPage>
  );
}
