import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'framer-motion';
import { Copy, Download, Google, Laptop, ShieldCheck, ShieldOff, Smartphone } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime, relativeTime } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Badge, Button, Checkbox, FormError, Modal, Panel, Steps, TableSkeleton, TextField, useToast } from '../../components/ui';
import { SettingsHeader, SettingsLoadError } from './SettingsLayout';
import { GoogleError, googleStartUrl, useGoogleEnabled } from '../auth/Google';
import { useT } from '../../i18n';

interface SecurityInfo {
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
  twoFactorAvailable: boolean;
  recoveryCodesRemaining: number;
  passwordChangedAt: string;
  recentEvents: { type: string; createdAt: string; userAgent: string | null }[];
}

interface SessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

const eventLabels: Record<string, string> = {
  sign_in: 'Signed in',
  sign_in_mfa: 'Signed in with two factor',
  sign_in_recovery_code: 'Signed in with a recovery code',
  mfa_failed: 'Wrong two factor code entered',
  mfa_enabled: 'Two factor turned on',
  mfa_disabled: 'Two factor turned off',
  recovery_codes_regenerated: 'New recovery codes created',
  password_changed: 'Password changed',
  password_reset: 'Password reset by email',
  email_changed: 'Email address changed',
  account_locked: 'Account locked after failed attempts',
  signed_out_other_sessions: 'Signed out other devices',
  google_linked: 'Google account linked',
  google_unlinked: 'Google account unlinked',
  sign_in_google: 'Signed in with Google',
};

function describeAgent(ua: string | null) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}

export default function SecuritySettings() {
  useDocumentTitle('Security settings');
  const { user, refresh } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const info = useQuery({ queryKey: ['security'], queryFn: () => api.get<SecurityInfo>('/account/security') });
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<SessionRow[]>('/account/sessions') });
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/account/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast('Device signed out.'); },
  });
  const revokeOthers = useMutation({
    mutationFn: () => api.post<{ revoked: number }>('/account/sessions/revoke-others'),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast(`Signed out ${r.revoked} other ${r.revoked === 1 ? 'device' : 'devices'}.`); },
  });

  const afterChange = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ['security'] }), refresh()]);
  };

  if (!user) return null;
  const s = info.data;

  return (
    <>
      <SettingsHeader title="Security" description="Protect your account with two factor authentication and keep track of where you are signed in." />
      <div className="space-y-6">
        {user.role === 'ADMIN' && !user.twoFactorEnabled && (
          <Alert tone="warning" title="Two factor authentication is required for administrators">Set it up below to open the dashboard.</Alert>
        )}

        <Panel title="Two factor authentication">
          {info.isError ? <SettingsLoadError message="Could not load your security settings." onRetry={() => { void info.refetch(); }} /> : info.isLoading || !s ? <TableSkeleton rows={2} /> : !s.twoFactorAvailable ? (
            <p className="text-ink">Learner accounts are protected by a parent or guardian, who can reset the password if needed.</p>
          ) : s.twoFactorEnabled ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mint text-heading"><ShieldCheck aria-hidden /></span>
                <div>
                  <p className="font-semibold text-heading">On, using an authenticator app</p>
                  <p className="text-sm text-ink-muted">Turned on {s.twoFactorEnabledAt && formatDateTime(s.twoFactorEnabledAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-navy-50 px-4 py-3 text-sm">
                <span>Recovery codes left: <strong className="text-heading">{s.recoveryCodesRemaining} of 10</strong></span>
                {s.recoveryCodesRemaining <= 3 && <Badge tone="sun">Running low</Badge>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setRegenOpen(true)}>Create new recovery codes</Button>
                <Button variant="ghost" className="text-danger" icon={<ShieldOff size={16} />} onClick={() => setDisableOpen(true)}>Turn off</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-ink">When two factor authentication is on, signing in needs your password and a 6 digit code from an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or a similar app.</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-warn"><ShieldOff size={16} aria-hidden /> Currently off</p>
              <Button icon={<Smartphone size={18} />} onClick={() => setSetupOpen(true)}>Set up two factor authentication</Button>
            </div>
          )}
        </Panel>

        {user.role !== 'LEARNER' && <GooglePanel linked={Boolean(user.googleLinked)} onChange={afterChange} />}

        <Panel
          title="Where you are signed in"
          description="Sign out any device you do not recognise."
          actions={sessions.data && sessions.data.length > 1 ? <Button size="sm" variant="secondary" loading={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>Sign out other devices</Button> : undefined}
        >
          {sessions.isLoading ? <TableSkeleton rows={2} /> : (
            <ul className="divide-y divide-line">
              {sessions.data?.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Laptop className="text-ink-muted" aria-hidden />
                    <div>
                      <p className="font-semibold text-heading">{describeAgent(row.userAgent)} {row.current && <Badge tone="mint">This device</Badge>}</p>
                      <p className="text-sm text-ink-muted">Active {relativeTime(row.lastSeenAt)} · Signed in {formatDateTime(row.createdAt)}</p>
                    </div>
                  </div>
                  {!row.current && <Button size="sm" variant="ghost" onClick={() => revoke.mutate(row.id)}>Sign out</Button>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent security activity">
          {s && s.recentEvents.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {s.recentEvents.map((e, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2 last:border-0">
                  <span className="font-medium text-heading">{eventLabels[e.type] ?? e.type}</span>
                  <span className="text-ink-muted">{formatDateTime(e.createdAt)} · {describeAgent(e.userAgent)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">No recent activity.</p>}
          <p className="mt-4 text-caption text-ink-muted">Security alerts are emailed to you when important changes happen, if email delivery is set up. You can manage alerts in Notification settings.</p>
        </Panel>
      </div>

      <SetupModal open={setupOpen} onClose={() => setSetupOpen(false)} onEnabled={async (codes) => { setFreshCodes(codes); await afterChange(); }} />
      <DisableModal open={disableOpen} onClose={() => setDisableOpen(false)} onDone={async () => { setDisableOpen(false); toast('Two factor authentication is now off.', 'info'); await afterChange(); }} />
      <RegenerateModal open={regenOpen} onClose={() => setRegenOpen(false)} onDone={async (codes) => { setRegenOpen(false); setFreshCodes(codes); await afterChange(); }} />
      <RecoveryCodesModal codes={freshCodes} onClose={() => setFreshCodes(null)} />
    </>
  );
}

function SetupModal({ open, onClose, onEnabled }: { open: boolean; onClose: () => void; onEnabled: (codes: string[]) => void }) {
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const pw = useForm({ currentPassword: '' });
  const code = useForm({ code: '' });
  const close = () => {
    setStep(0);
    setSetup(null);
    pw.setValues({ currentPassword: '' });
    code.setValues({ code: '' });
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Set up two factor authentication" size="lg">
      <Steps steps={['Confirm password', 'Scan code', 'Verify']} current={step} />
      <AnimatePresence mode="wait">
        <m.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="mt-6">
          {step === 0 && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                pw.submit(async (v) => {
                  setSetup(await api.post<{ qrDataUrl: string; manualKey: string }>('/account/2fa/setup', v));
                  setStep(1);
                });
              }}
            >
              <p className="text-ink">For your security, please enter your password first.</p>
              <FormError message={pw.formError} />
              <TextField label="Current password" type="password" autoComplete="current-password" required autoFocus {...pw.bind('currentPassword')} />
              <Button type="submit" loading={pw.submitting}>Continue</Button>
            </form>
          )}
          {step === 1 && setup && (
            <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
              <img src={setup.qrDataUrl} alt="QR code for your authenticator app" width={200} height={200} className="mx-auto rounded-lg border border-line" />
              <div className="space-y-4">
                <ol className="list-decimal space-y-2 pl-5 text-ink">
                  <li>Open an authenticator app on your phone.</li>
                  <li>Add a new account and scan this QR code.</li>
                  <li>Cannot scan? Enter this key instead:</li>
                </ol>
                <code className="block break-all rounded bg-navy-50 px-3 py-2 font-mono text-[0.95rem] tracking-wider text-heading">{setup.manualKey}</code>
                <Button onClick={() => setStep(2)}>I have added it</Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                code.submit(async (v) => {
                  const r = await api.post<{ recoveryCodes: string[] }>('/account/2fa/enable', v);
                  close();
                  onEnabled(r.recoveryCodes);
                });
              }}
            >
              <p className="text-ink">Enter the 6 digit code your app shows for Lead Vest Foundation. Two factor authentication is only turned on once this code is correct.</p>
              <FormError message={code.formError} />
              <TextField label="Code from your app" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus className="text-center text-2xl tracking-[0.4em]" {...code.bind('code')} />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" loading={code.submitting}>Verify and turn on</Button>
              </div>
            </form>
          )}
        </m.div>
      </AnimatePresence>
    </Modal>
  );
}

function RecoveryCodesModal({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const toast = useToast();
  if (!codes) return null;
  const text = `Lead Vest Foundation recovery codes\nEach code works once.\n\n${codes.join('\n')}\n`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-vest-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal
      open
      onClose={() => saved && onClose()}
      title="Save your recovery codes"
      description="If you lose your phone, each of these codes lets you sign in once. They will not be shown again."
      footer={<Button disabled={!saved} onClick={() => { setSaved(false); onClose(); }}>Done</Button>}
    >
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-navy-50 p-4 font-mono text-[0.95rem] text-heading">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" icon={<Copy size={16} />} onClick={async () => { try { await navigator.clipboard.writeText(text); toast('Codes copied.'); } catch { toast('Copy is not available. Please download instead.', 'error'); } }}>Copy</Button>
        <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={download}>Download</Button>
      </div>
      <Alert tone="warning" className="mt-4">Store these somewhere safe, such as a password manager. Anyone with a code and your password can sign in.</Alert>
      <Checkbox className="mt-4" label="I have saved my recovery codes somewhere safe" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
    </Modal>
  );
}

function DisableModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const form = useForm({ currentPassword: '', code: '', recoveryCode: '' });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Turn off two factor authentication?"
      description="Your account will only be protected by your password."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Keep it on</Button>
        <Button variant="danger" loading={form.submitting} onClick={() => form.submit(async (v) => { await api.post('/account/2fa/disable', useRecovery ? { currentPassword: v.currentPassword, recoveryCode: v.recoveryCode } : { currentPassword: v.currentPassword, code: v.code }); form.setValues({ currentPassword: '', code: '', recoveryCode: '' }); onDone(); })}>Turn off</Button>
      </>}
    >
      <div className="space-y-4">
        <FormError message={form.formError} />
        <TextField label="Current password" type="password" autoComplete="current-password" {...form.bind('currentPassword')} />
        {useRecovery ? <TextField label="Recovery code" autoComplete="off" {...form.bind('recoveryCode')} /> : <TextField label="Code from your authenticator app" inputMode="numeric" autoComplete="one-time-code" {...form.bind('code')} />}
        <button type="button" className="text-sm font-semibold text-blue-600" onClick={() => setUseRecovery((r) => !r)}>{useRecovery ? 'Use an app code instead' : 'Use a recovery code instead'}</button>
      </div>
    </Modal>
  );
}

function RegenerateModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (codes: string[]) => void }) {
  const form = useForm({ currentPassword: '', code: '' });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create new recovery codes"
      description="Your old recovery codes will stop working."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={form.submitting} onClick={() => form.submit(async (v) => { const r = await api.post<{ recoveryCodes: string[] }>('/account/2fa/recovery-codes', v); form.setValues({ currentPassword: '', code: '' }); onDone(r.recoveryCodes); })}>Create codes</Button>
      </>}
    >
      <div className="space-y-4">
        <FormError message={form.formError} />
        <TextField label="Current password" type="password" autoComplete="current-password" {...form.bind('currentPassword')} />
        <TextField label="Code from your authenticator app" inputMode="numeric" autoComplete="one-time-code" {...form.bind('code')} />
      </div>
    </Modal>
  );
}

/** Link or unlink Google sign in. Linking goes through Google and back, verified on the server. */
function GooglePanel({ linked, onChange }: { linked: boolean; onChange: () => Promise<void> }) {
  const t = useT();
  const toast = useToast();
  const enabled = useGoogleEnabled();
  const [params, setParams] = useSearchParams();
  const [confirm, setConfirm] = useState(false);
  const unlink = useMutation({
    mutationFn: () => api.post('/account/google/unlink'),
    onSuccess: async () => {
      setConfirm(false);
      toast(t('settings.googleUnlinkedToast'), 'info');
      await onChange();
    },
  });

  useEffect(() => {
    if (params.get('google') !== 'linked') return;
    toast(t('settings.googleLinkedToast'));
    void onChange();
    params.delete('google');
    setParams(params, { replace: true });
  }, [params, setParams, toast, t, onChange]);

  if (!enabled && !linked) return null;
  return (
    <Panel title={t('settings.google')}>
      <div className="space-y-4">
        <GoogleError />
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface" aria-hidden>
            <Google size={18} />
          </span>
          <p className="min-w-0 flex-1 text-ink">{linked ? t('settings.googleLinked') : t('settings.googleNotLinked')}</p>
        </div>
        {linked ? (
          <Button variant="secondary" onClick={() => setConfirm(true)}>{t('settings.googleUnlink')}</Button>
        ) : enabled ? (
          <a href={googleStartUrl('link')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 font-semibold text-white no-underline hover:bg-blue-700">
            <Google size={16} aria-hidden /> {t('settings.googleLink')}
          </a>
        ) : (
          <p className="text-sm text-ink-muted">{t('settings.googleNotConfigured')}</p>
        )}
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('settings.googleUnlink')}
        description={t('settings.googleUnlinkConfirm')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={unlink.isPending} onClick={() => unlink.mutate()}>{t('settings.googleUnlink')}</Button>
          </>
        }
      />
    </Panel>
  );
}
