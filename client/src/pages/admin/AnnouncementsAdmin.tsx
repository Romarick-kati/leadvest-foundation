import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, EmptyState, FormError, Panel, Select, TextArea, TextField, Toggle, useToast } from '../../components/ui';
import { AdminPage } from './shared';

interface Broadcast { id: string; title: string; audience: string; sendEmail: boolean; recipients: number; emailed: number; createdAt: string }
const audiences = [
  { value: 'EVERYONE', label: 'Everyone (parents, young people, members, instructors)' },
  { value: 'PARENTS', label: 'Parents and guardians' },
  { value: 'YOUTH', label: 'Young people' },
  { value: 'MEMBERS', label: 'Members' },
  { value: 'INSTRUCTORS', label: 'Instructors' },
];

/** Send an announcement to the notification bar of a group of people, and by email to those who chose to receive news. */
export default function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const config = useQuery({ queryKey: ['admin', 'overview-config'], queryFn: () => api.get<{ integrations?: { emailDelivery: boolean } }>('/admin/overview').catch(() => ({ integrations: undefined })) });
  const history = useQuery({ queryKey: ['admin', 'broadcasts'], queryFn: () => api.get<{ items: Broadcast[] }>('/admin/broadcasts') });
  const form = useForm({ title: '', body: '', link: '', audience: 'EVERYONE', sendEmail: false });
  const send = useMutation({
    mutationFn: () => api.post<Broadcast>('/admin/broadcasts', { ...form.values, link: form.values.link.trim() }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      toast(`Sent to ${r.recipients} ${r.recipients === 1 ? 'person' : 'people'}${r.sendEmail ? `, and ${r.emailed} email${r.emailed === 1 ? '' : 's'}` : ''}.`);
      form.setValues({ title: '', body: '', link: '', audience: form.values.audience, sendEmail: false });
    },
    onError: (e: Error) => form.setFormError(e.message),
  });
  const emailOn = config.data?.integrations?.emailDelivery;
  return (
    <AdminPage title="Announcements" description="Tell people about news. It appears in their notification bar at once. New programs, events and articles you publish are announced automatically.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="New announcement">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.setFormError(null); send.mutate(); }}>
            <FormError message={form.formError} />
            <Select label="Who should see it?" options={audiences} {...form.bind('audience')} />
            <TextField label="Title" {...form.bind('title')} hint="Short and clear, for example: Registration for the holiday camp is open." />
            <TextArea label="Message" rows={5} {...form.bind('body')} />
            <TextField label="Link (optional)" {...form.bind('link')} hint="A page on this site such as /events, or a full https:// address. People tap the notification to go there." />
            <Toggle label="Also send by email" hint="Email only goes to people who confirmed their email and chose to receive news in Settings > Notifications. Everyone else still sees it in the notification bar." checked={form.values.sendEmail} onChange={(v) => form.setValues({ ...form.values, sendEmail: v })} />
            {form.values.sendEmail && emailOn === false && <Alert tone="warning" title="Email delivery is not connected yet">The announcement will still reach the notification bar. To send emails, set EMAIL_TRANSPORT=resend, RESEND_API_KEY and EMAIL_FROM in your hosting settings.</Alert>}
            <Button type="submit" loading={send.isPending}>Send announcement</Button>
          </form>
        </Panel>
        <Panel title="Recently sent">
          {history.data && history.data.items.length > 0 ? (
            <ul className="divide-y divide-line">
              {history.data.items.map((b) => (
                <li key={b.id} className="py-3">
                  <p className="font-semibold text-heading">{b.title}</p>
                  <p className="text-caption text-ink-muted">{formatDateTime(b.createdAt)} · {b.recipients} in notification bar{b.sendEmail ? ` · ${b.emailed} emailed` : ''}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Nothing sent yet" />}
        </Panel>
      </div>
    </AdminPage>
  );
}
