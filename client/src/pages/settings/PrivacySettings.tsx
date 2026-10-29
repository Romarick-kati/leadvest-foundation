import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from '../../components/ui/icons';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime, titleCase } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Button, EmptyState, FormError, Panel, Select, StatusBadge, TextArea, Toggle, useToast } from '../../components/ui';
import { SettingsHeader } from './SettingsLayout';
import { usePreferencesForm } from './usePreferencesForm';

interface DataRequest { id: string; type: string; status: string; createdAt: string; details: string | null }
interface Consent { id: string; type: string; granted: boolean; policyVersion: string; createdAt: string; subjectId: string | null }

export default function PrivacySettings() {
  useDocumentTitle('Privacy settings');
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const isLearner = user?.role === 'LEARNER';
  const prefs = usePreferencesForm(['showProfilePhoto']);
  const requests = useQuery({ queryKey: ['data-requests'], queryFn: () => api.get<DataRequest[]>('/account/data-requests'), enabled: !isLearner });
  const consents = useQuery({ queryKey: ['consents'], queryFn: () => api.get<Consent[]>('/account/consents'), enabled: !isLearner });
  const form = useForm({ type: 'EXPORT', details: '' });
  const exportData = useMutation({
    mutationFn: () => api.get<unknown>('/account/export'),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-lead-vest-data.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  if (isLearner) {
    return (
      <>
        <SettingsHeader title="Privacy" />
        <Panel>
          <p className="text-ink">Your grown up looks after your privacy settings. Nothing about you is shown to other people on this website.</p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <SettingsHeader title="Privacy" description="Control your information and see the choices you have made." />
      <div className="space-y-6">
        <Panel title="Your information">
          <p className="text-ink">Download a copy of the information we hold about your account, including registrations, consents and preferences.</p>
          <Button variant="secondary" className="mt-4" icon={<Download size={16} />} loading={exportData.isPending} onClick={() => exportData.mutate()}>Download my data</Button>
        </Panel>

        {prefs.draft && (
          <Panel title="Profile visibility">
            <Toggle label="Show my profile picture to foundation staff" hint="Your picture is never shown publicly." checked={prefs.draft.showProfilePhoto} onChange={async (v) => { prefs.set('showProfilePhoto', v); }} />
            {prefs.dirty && <Button size="sm" className="mt-2" loading={prefs.saving} onClick={async () => (await prefs.save()) && toast('Saved.')}>Save</Button>}
          </Panel>
        )}

        <Panel title="Ask us to correct or delete data" description="The foundation reviews each request. Some records may need to be kept for legal reasons, and we will tell you if so.">
          <form
            className="max-w-lg space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              form.submit(async (v) => {
                await api.post('/account/data-requests', v);
                form.setValues({ type: 'EXPORT', details: '' });
                qc.invalidateQueries({ queryKey: ['data-requests'] });
                toast('Your request has been sent to the foundation.');
              });
            }}
          >
            <FormError message={form.formError} />
            <Select label="Type of request" options={[{ value: 'EXPORT', label: 'A full copy of my data' }, { value: 'CORRECTION', label: 'Correct something' }, { value: 'DELETION', label: 'Delete my data' }]} {...form.bind('type')} />
            <TextArea label="Details" optional rows={3} {...form.bind('details')} />
            <Button type="submit" loading={form.submitting}>Send request</Button>
          </form>
          {requests.data && requests.data.length > 0 && (
            <ul className="mt-6 divide-y divide-line border-t border-line">
              {requests.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-heading">{titleCase(r.type)} request · {formatDateTime(r.createdAt)}</span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Consent history" description={<>A record of the agreements you have given. Manage your children’s consent in <Link to="/settings/family">Family settings</Link>.</>}>
          {consents.data && consents.data.length > 0 ? (
            <ul className="divide-y divide-line text-sm">
              {consents.data.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-heading">{titleCase(c.type)}{c.subjectId && ' (for a child)'}</span>
                  <span className="text-ink-muted">{c.granted ? 'Given' : 'Withdrawn'} · {formatDateTime(c.createdAt)} · version {c.policyVersion}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No consents recorded" />}
        </Panel>
      </div>
    </>
  );
}
