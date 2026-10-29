import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, UserPlus } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, titleCase } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Badge, Button, Checkbox, EmptyState, FormError, Modal, ProgressBar, Select, StatusBadge, TableSkeleton, TextField, Toggle, useToast } from '../../components/ui';
import { SettingsHeader } from './SettingsLayout';
import { Link } from 'react-router-dom';

interface Learner {
  id: string;
  username: string | null;
  displayName?: string;
  status?: string;
  createdAt?: string;
  learnerProfile?: { ageBand: string | null; learningLevel: string; largerText: boolean } | null;
}
interface LearnerLink { linkStatus: 'VERIFIED' | 'PENDING'; relationship: string; learner: Learner }

const ageBands = ['4-6', '7-9', '10-12', '13-15'].map((a) => ({ value: a, label: `Ages ${a.replace('-', ' to ')}` }));

export default function FamilySettings() {
  useDocumentTitle('Family settings');
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const q = useQuery({ queryKey: ['guardian', 'learners'], queryFn: () => api.get<LearnerLink[]>('/guardian/learners'), enabled: Boolean(user?.emailVerified) });

  if (!user?.emailVerified) {
    return (
      <>
        <SettingsHeader title="Family and children" />
        <Alert tone="warning" title="Confirm your email first">To protect children, you need a confirmed email address before adding a learning account. <Link to="/settings/account">Account settings</Link></Alert>
      </>
    );
  }

  return (
    <>
      <SettingsHeader title="Family and children" description="Create and manage learning accounts for your children. Only verified guardians can see or change a child’s account." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Button icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>Add a child</Button>
        <Button variant="secondary" icon={<UserPlus size={18} />} onClick={() => setLinkOpen(true)}>Link to an existing account</Button>
      </div>
      {q.isLoading ? <TableSkeleton rows={2} /> : q.data && q.data.length > 0 ? (
        <ul className="space-y-4">
          {q.data.map((l) => <LearnerCard key={l.learner.id} link={l} />)}
        </ul>
      ) : (
        <EmptyState title="No learning accounts yet" action={<Button onClick={() => setAddOpen(true)}>Add a child</Button>}>
          A learning account lets your child save progress and earn badges. Only a nickname is needed.
        </EmptyState>
      )}
      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} />
      <LinkModal open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  );
}

function LearnerCard({ link }: { link: LearnerLink }) {
  const [open, setOpen] = useState(false);
  const l = link.learner;
  if (link.linkStatus === 'PENDING') {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong p-5">
        <div>
          <p className="font-semibold text-heading">{l.username}</p>
          <p className="text-sm text-ink-muted">Waiting for the foundation to verify your relationship.</p>
        </div>
        <StatusBadge status="PENDING" />
      </li>
    );
  }
  return (
    <li className="rounded-lg border border-line bg-surface">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span>
          <span className="block text-h4">{l.displayName}</span>
          <span className="text-sm text-ink-muted">Username: {l.username} {l.learnerProfile?.ageBand && `· Ages ${l.learnerProfile.ageBand}`}</span>
        </span>
        <span className="flex items-center gap-3">
          {l.status && <StatusBadge status={l.status} />}
          <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && <LearnerManage learner={l} />}
    </li>
  );
}

function LearnerManage({ learner }: { learner: Learner }) {
  const qc = useQueryClient();
  const toast = useToast();
  const progress = useQuery({ queryKey: ['guardian', 'progress', learner.id], queryFn: () => api.get<{ id: string; score: number | null; total: number | null; completedAt: string; lesson: { title: string; module: { title: string } } }[]>(`/guardian/learners/${learner.id}/progress`) });
  const consents = useQuery({ queryKey: ['guardian', 'consents', learner.id], queryFn: () => api.get<{ id: string; type: string; granted: boolean; createdAt: string }[]>(`/guardian/learners/${learner.id}/consents`) });
  const details = useForm({ displayName: learner.displayName ?? '', ageBand: learner.learnerProfile?.ageBand ?? '', learningLevel: learner.learnerProfile?.learningLevel ?? 'starter' });
  const pw = useForm({ password: '' });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['guardian'] });

  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'SUSPENDED') => api.patch(`/guardian/learners/${learner.id}`, { status }),
    onSuccess: (_d, s) => { invalidate(); toast(s === 'SUSPENDED' ? 'Account paused. Your child has been signed out.' : 'Account active again.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const consent = useMutation({
    mutationFn: (v: { type: string; granted: boolean }) => api.post(`/guardian/learners/${learner.id}/consents`, v),
    onSuccess: () => { invalidate(); toast('Consent choice recorded.'); },
  });
  const latest = (type: string) => consents.data?.find((c) => c.type === type);
  const photo = latest('photography');

  return (
    <div className="space-y-6 border-t border-line p-5">
      <section>
        <h3 className="text-h4">Learning progress</h3>
        {progress.data && progress.data.length > 0 ? (
          <>
            <ProgressBar className="mt-3 max-w-sm" value={progress.data.length} max={Math.max(progress.data.length, 10)} label={`${progress.data.length} lessons finished`} showValue={false} tone="mint" />
            <ul className="mt-3 space-y-1 text-sm">
              {progress.data.slice(0, 6).map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2"><span className="text-heading">{p.lesson.module.title}: {p.lesson.title}</span><span className="text-ink-muted">{p.total ? `${p.score}/${p.total} · ` : ''}{formatDate(p.completedAt)}</span></li>
              ))}
            </ul>
          </>
        ) : <p className="mt-2 text-sm text-ink-muted">No lessons finished yet.</p>}
      </section>

      <section>
        <h3 className="text-h4">Details</h3>
        <form className="mt-3 grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); details.submit(async (v) => { await api.patch(`/guardian/learners/${learner.id}`, { displayName: v.displayName, ageBand: v.ageBand || null, learningLevel: v.learningLevel }); invalidate(); toast('Details saved.'); }); }}>
          <div className="sm:col-span-3"><FormError message={details.formError} /></div>
          <TextField label="Nickname" {...details.bind('displayName')} />
          <Select label="Age range" placeholder="Not set" options={ageBands} {...details.bind('ageBand')} />
          <Select label="Level" options={[{ value: 'starter', label: 'Starter' }, { value: 'explorer', label: 'Explorer' }, { value: 'leader', label: 'Leader' }]} {...details.bind('learningLevel')} />
          <div><Button type="submit" variant="secondary" loading={details.submitting}>Save details</Button></div>
        </form>
      </section>

      <section>
        <h3 className="text-h4">Password</h3>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); pw.submit(async (v) => { await api.post(`/guardian/learners/${learner.id}/password`, v); pw.setValues({ password: '' }); toast('New password set. Your child has been signed out on all devices.'); }); }}>
          <div className="w-full max-w-xs"><TextField label="New password for your child" type="password" autoComplete="new-password" {...pw.bind('password')} /></div>
          <Button type="submit" variant="secondary" loading={pw.submitting}>Set password</Button>
          {pw.formError && <p className="w-full text-sm text-danger">{pw.formError}</p>}
        </form>
      </section>

      <section>
        <h3 className="text-h4">Consent</h3>
        <div className="mt-2 divide-y divide-line">
          <Toggle label="Photography" hint="Allow the foundation to photograph your child at activities. Off unless you turn it on." checked={Boolean(photo?.granted)} onChange={(v) => consent.mutate({ type: 'photography', granted: v })} />
        </div>
        {consents.data && consents.data.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-blue-600">Consent history</summary>
            <ul className="mt-2 space-y-1">
              {consents.data.map((c) => <li key={c.id} className="text-ink-muted">{titleCase(c.type)}: {c.granted ? 'given' : 'withdrawn'} on {formatDate(c.createdAt)}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-wrap gap-3 border-t border-line pt-5">
        {learner.status === 'SUSPENDED' ? (
          <Button variant="secondary" onClick={() => setStatus.mutate('ACTIVE')}>Resume account</Button>
        ) : (
          <Button variant="secondary" onClick={() => window.confirm('Pause this learning account? Your child will be signed out.') && setStatus.mutate('SUSPENDED')}>Pause account</Button>
        )}
        <Button variant="ghost" className="text-danger" onClick={() => window.confirm('Withdraw consent for this learning account? The account will be paused immediately.') && consent.mutate({ type: 'learning_account', granted: false })}>Withdraw learning consent</Button>
        <Badge tone="neutral">Child sign in: username and password</Badge>
      </section>
    </div>
  );
}

function AddChildModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm({ displayName: '', username: '', password: '', ageBand: '', relationship: 'parent', consent: false });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a child’s learning account"
      description="Use a first name or nickname only. We never ask for your child’s full name, birth date or school."
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={form.submitting} onClick={() => form.submit(async (v) => {
          await api.post('/guardian/learners', { ...v, ageBand: v.ageBand || undefined });
          qc.invalidateQueries({ queryKey: ['guardian'] });
          toast(`Learning account created. Your child can sign in with the username ${v.username.toLowerCase()}.`);
          form.setValues({ displayName: '', username: '', password: '', ageBand: '', relationship: 'parent', consent: false });
          onClose();
        })}>Create account</Button>
      </>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><FormError message={form.formError} /></div>
        <TextField label="First name or nickname" required {...form.bind('displayName')} />
        <Select label="Age range" optional placeholder="Prefer not to say" options={ageBands} {...form.bind('ageBand')} />
        <TextField label="Username" required autoComplete="off" hint="Letters, numbers and underscores. Avoid using your child’s full name." {...form.bind('username')} />
        <TextField label="Password" type="password" required autoComplete="new-password" hint="At least 10 characters, with a letter and a number." {...form.bind('password')} />
        <Select label="Your relationship" options={[{ value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Legal guardian' }, { value: 'other', label: 'Other responsible adult' }]} {...form.bind('relationship')} />
        <div className="sm:col-span-2">
          <Checkbox label={<>I am this child’s parent or legal guardian, and I consent to them using a learning account as described in the <Link to="/consent" target="_blank">consent information</Link>.</>} {...form.bindCheck('consent')} />
        </div>
      </div>
    </Modal>
  );
}

function LinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [done, setDone] = useState<string | null>(null);
  const form = useForm({ username: '', relationship: 'parent' });
  return (
    <Modal
      open={open}
      onClose={() => { setDone(null); onClose(); }}
      title="Link to an existing learning account"
      description="For a second parent or guardian. The foundation verifies the relationship before you can see or manage the account."
      footer={done ? <Button onClick={() => { setDone(null); onClose(); }}>Close</Button> : <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={form.submitting} onClick={() => form.submit(async (v) => { const r = await api.post<{ message: string }>('/guardian/links', v); setDone(r.message); qc.invalidateQueries({ queryKey: ['guardian'] }); })}>Send request</Button>
      </>}
    >
      {done ? <Alert tone="success">{done}</Alert> : (
        <div className="space-y-4">
          <FormError message={form.formError} />
          <TextField label="Child’s username" autoComplete="off" {...form.bind('username')} />
          <Select label="Your relationship" options={[{ value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Legal guardian' }, { value: 'other', label: 'Other responsible adult' }]} {...form.bind('relationship')} />
        </div>
      )}
    </Modal>
  );
}
