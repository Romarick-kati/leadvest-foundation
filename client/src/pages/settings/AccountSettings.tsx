import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, roleLabel } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, FormError, Modal, Panel, StatusBadge, TextField, useToast } from '../../components/ui';
import { SettingsHeader } from './SettingsLayout';
import type { User } from '../../lib/types';

export default function AccountSettings() {
  useDocumentTitle('Account settings');
  const { user, setUser, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const pw = useForm({ currentPassword: '', newPassword: '', confirm: '' });
  const em = useForm({ email: '', currentPassword: '' });
  const deact = useForm({ currentPassword: '', confirm: '' });
  const resend = useMutation({
    mutationFn: () => api.post<{ delivered: boolean }>('/auth/resend-verification'),
    onSuccess: (r) => toast(r.delivered ? 'We sent a new confirmation link.' : 'Email delivery is not set up yet. Please contact the foundation.', r.delivered ? 'success' : 'info'),
    onError: (e: Error) => toast(e.message, 'error'),
  });
  if (!user) return null;

  return (
    <>
      <SettingsHeader title="Account" description="Your sign in details and account status." />
      <div className="space-y-6">
        <Panel title="Account information">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-caption font-semibold uppercase text-ink-muted">Email</dt><dd className="text-heading">{user.email}</dd></div>
            <div><dt className="text-caption font-semibold uppercase text-ink-muted">Email confirmed</dt><dd>{user.emailVerified ? <StatusBadge status="VERIFIED" /> : <span className="flex items-center gap-3"><StatusBadge status="PENDING" /><Button size="sm" variant="ghost" onClick={() => resend.mutate()} loading={resend.isPending}>Send link</Button></span>}</dd></div>
            <div><dt className="text-caption font-semibold uppercase text-ink-muted">Account type</dt><dd className="text-heading">{roleLabel[user.role]}</dd></div>
            <div><dt className="text-caption font-semibold uppercase text-ink-muted">Member since</dt><dd className="text-heading">{formatDate(user.createdAt)}</dd></div>
            <div><dt className="text-caption font-semibold uppercase text-ink-muted">Status</dt><dd><StatusBadge status={user.status} /></dd></div>
          </dl>
        </Panel>

        <Panel title="Change password" description="You will stay signed in here and be signed out everywhere else.">
          <form
            className="max-w-md space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (pw.values.newPassword !== pw.values.confirm) return pw.setErrors({ confirm: 'The passwords do not match.' });
              pw.submit(async (v) => {
                await api.post('/account/password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
                pw.setValues({ currentPassword: '', newPassword: '', confirm: '' });
                toast('Password changed. Other devices have been signed out.');
              });
            }}
          >
            <FormError message={pw.formError} />
            <TextField label="Current password" type="password" autoComplete="current-password" required {...pw.bind('currentPassword')} />
            <TextField label="New password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." {...pw.bind('newPassword')} />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" required {...pw.bind('confirm')} />
            <Button type="submit" loading={pw.submitting}>Change password</Button>
          </form>
        </Panel>

        <Panel title="Change email address" description="We will send a confirmation link to the new address and let the old address know.">
          <form
            className="max-w-md space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              em.submit(async (v) => {
                const r = await api.post<{ user: User; verificationEmailDelivered: boolean }>('/account/email', v);
                setUser({ ...user, email: r.user.email, emailVerified: false });
                em.setValues({ email: '', currentPassword: '' });
                toast(r.verificationEmailDelivered ? 'Email changed. Please confirm the new address.' : 'Email changed. Email delivery is not set up, so ask the foundation to confirm it.', 'info');
              });
            }}
          >
            <FormError message={em.formError} />
            <TextField label="New email address" type="email" autoComplete="email" required {...em.bind('email')} />
            <TextField label="Current password" type="password" autoComplete="current-password" required {...em.bind('currentPassword')} />
            <Button type="submit" variant="secondary" loading={em.submitting}>Change email</Button>
          </form>
        </Panel>

        <Panel title="Account recovery">
          <ul className="list-disc space-y-1 pl-5 text-ink">
            <li>If you forget your password, use “Forgot your password?” on the sign in page. A reset link goes to your confirmed email.</li>
            <li>If you lose your phone, sign in with one of your two factor recovery codes, then set up two factor again.</li>
            <li>If you lose both, contact the foundation. We will verify your identity before restoring access.</li>
          </ul>
        </Panel>

        <Panel title="Sign out">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={async () => { await signOut(); navigate('/'); }}>Sign out on this device</Button>
          </div>
          <p className="mt-3 text-sm text-ink-muted">To sign out other devices, go to Security settings.</p>
        </Panel>

        <Panel title="Deactivate account" className="border-[#FECDCA]">
          <p className="text-ink">Deactivating stops you from signing in. To have your data deleted, make a deletion request in Privacy settings.</p>
          <Button variant="danger" className="mt-4" onClick={() => setDeactivateOpen(true)}>Deactivate my account</Button>
        </Panel>
      </div>

      <Modal
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title="Deactivate your account?"
        description="You will be signed out everywhere and will not be able to sign in again without contacting the foundation."
        footer={<>
          <Button variant="ghost" onClick={() => setDeactivateOpen(false)}>Keep my account</Button>
          <Button variant="danger" loading={deact.submitting} onClick={() => deact.submit(async (v) => { await api.post('/account/deactivate', v); await signOut(); navigate('/'); })}>Deactivate</Button>
        </>}
      >
        <div className="space-y-4">
          <FormError message={deact.formError} />
          <TextField label="Current password" type="password" autoComplete="current-password" {...deact.bind('currentPassword')} />
          <TextField label="Type DEACTIVATE to confirm" {...deact.bind('confirm')} />
          <Alert tone="warning">This affects any learning accounts you manage. Consider their access first.</Alert>
        </div>
      </Modal>
    </>
  );
}
