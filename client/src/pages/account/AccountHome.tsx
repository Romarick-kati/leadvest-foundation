import { PayButtons } from '../../components/content/PayButtons';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, ShieldAlert, ShieldCheck, Users } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Button, ButtonLink, EmptyState, Panel, StatusBadge, TableSkeleton, useToast } from '../../components/ui';

interface Registration {
  id: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  event: { title: string; slug: string; startsAt: string } | null;
  program: { title: string; slug: string } | null;
  learner: { id: string; displayName: string } | null;
}

interface LearnerLink {
  linkStatus: string;
  learner: { id: string; displayName?: string; username: string | null };
}

export default function AccountHome() {
  const { user } = useAuth();
  useDocumentTitle('My account');
  const toast = useToast();
  const qc = useQueryClient();
  const regs = useQuery({ queryKey: ['registrations', 'mine'], queryFn: () => api.get<Registration[]>('/registrations/mine'), enabled: Boolean(user?.emailVerified) });
  const kids = useQuery({ queryKey: ['guardian', 'learners'], queryFn: () => api.get<LearnerLink[]>('/guardian/learners'), enabled: user?.role === 'PARENT' && Boolean(user?.emailVerified) });
  const resend = useMutation({
    mutationFn: () => api.post<{ delivered: boolean }>('/auth/resend-verification'),
    onSuccess: (r) => toast(r.delivered ? 'We sent a new confirmation link.' : 'Email delivery is not set up yet. Please contact the foundation to confirm your address.', r.delivered ? 'success' : 'info'),
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/registrations/${id}/cancel`),
    onSuccess: () => {
      toast('Registration cancelled.');
      qc.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  if (!user) return null;

  return (
    <div className="container-page py-10 sm:py-14">
      <p className="eyebrow mb-2">My account</p>
      <h1 className="text-h1">Hello, {user.displayName}</h1>
      <div className="mt-8 space-y-4">
        {!user.emailVerified && (
          <Alert tone="warning" title="Please confirm your email address" action={<Button size="sm" variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>Send link again</Button>}>
            You need a confirmed email before you can register for activities or pay.
          </Alert>
        )}
        {!user.twoFactorEnabled && (
          <Alert tone="info" title="Protect your account with two factor authentication" action={<ButtonLink to="/settings/security" size="sm" variant="secondary">Set up</ButtonLink>}>
            Add a second step when you sign in, using an authenticator app on your phone.
          </Alert>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="My registrations" actions={<ButtonLink to="/events" size="sm" variant="secondary">Find events</ButtonLink>}>
          {!user.emailVerified ? (
            <p className="text-ink-muted">Confirm your email to see and make registrations.</p>
          ) : regs.isLoading ? (
            <TableSkeleton rows={3} />
          ) : regs.data && regs.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {regs.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <Link to={r.event ? `/events/${r.event.slug}` : `/programs/${r.program?.slug}`} className="font-semibold">
                      {r.event?.title ?? r.program?.title}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      {r.event ? formatDate(r.event.startsAt, { dateStyle: 'medium' }) : 'Program'} · {r.learner ? `For ${r.learner.displayName}` : 'For me or my family'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.paymentStatus !== 'NOT_REQUIRED' && <StatusBadge status={r.paymentStatus} />}
                    {r.status !== 'CANCELLED' && r.paymentStatus !== 'PAID' && (
                      <Button size="sm" variant="ghost" onClick={() => window.confirm('Cancel this registration?') && cancel.mutate(r.id)}>Cancel</Button>
                    )}
                  </div>
                  {r.status !== 'CANCELLED' && r.paymentStatus === 'PENDING' && <div className="basis-full pt-3"><p className="mb-2 text-sm font-semibold text-heading">Payment due. Choose how to pay:</p><PayButtons registrationId={r.id} /></div>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No registrations yet" icon={<CalendarCheck size={26} />}>When you register for a program or event it will appear here.</EmptyState>
          )}
        </Panel>

        <div className="space-y-8">
          {user.role === 'PARENT' && <Panel title="My family" actions={<ButtonLink to="/settings/family" size="sm" variant="secondary">Manage</ButtonLink>}>
            {kids.data && kids.data.length > 0 ? (
              <ul className="space-y-3">
                {kids.data.map((k) => (
                  <li key={k.learner.id} className="flex items-center justify-between gap-3 rounded-lg bg-navy-50 px-4 py-3">
                    <span className="font-semibold text-heading">{k.learner.displayName ?? k.learner.username}</span>
                    <StatusBadge status={k.linkStatus} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center">
                <Users className="mx-auto text-blue-600" aria-hidden />
                <p className="mt-2 text-sm text-ink-muted">Add a learning account so your child can save progress and earn badges.</p>
              </div>
            )}
          </Panel>}
          <Panel title="Account security">
            <p className="flex items-center gap-2 text-sm">
              {user.twoFactorEnabled ? <ShieldCheck className="text-mint-700" aria-hidden /> : <ShieldAlert className="text-warn" aria-hidden />}
              Two factor authentication is <strong>{user.twoFactorEnabled ? 'on' : 'off'}</strong>.
            </p>
            <Link to="/settings/security" className="mt-3 inline-block text-sm font-semibold">Security settings</Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
