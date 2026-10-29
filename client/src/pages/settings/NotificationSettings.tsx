import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useSite } from '../../lib/site';
import { Alert, Button, FormError, Panel, TableSkeleton, Toggle, useToast } from '../../components/ui';
import { SettingsHeader, SettingsLoadError } from './SettingsLayout';
import { usePreferencesForm } from './usePreferencesForm';

export default function NotificationSettings() {
  useDocumentTitle('Notification settings');
  const toast = useToast();
  const { site } = useSite();
  const f = usePreferencesForm(['securityAlerts', 'newsletterOptIn', 'eventAnnouncements', 'programUpdates']);
  return (
    <>
      <SettingsHeader title="Notifications" description="Choose which optional emails you receive." />
      {site.integrations && !site.integrations.emailDelivery && (
        <Alert tone="info" className="mb-6">Email delivery has not been set up on this website yet. Your choices are saved and will apply once it is.</Alert>
      )}
      {f.loadError ? <SettingsLoadError message={f.loadError} onRetry={f.retry} /> : f.loading || !f.draft ? <TableSkeleton rows={4} /> : (
        <div className="space-y-6">
          <Panel title="Essential messages" description="Always sent, because they are about your account or a request you made.">
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
              <li>Email confirmation and password reset links</li>
              <li>Registration confirmations and changes to events you registered for</li>
              <li>Replies to your enquiries</li>
            </ul>
            <div className="mt-4 border-t border-line pt-2">
              <Toggle label="Security alerts" hint="Emails when your password, email or two factor settings change. We strongly recommend keeping these on." checked={f.draft.securityAlerts} onChange={(v) => f.set('securityAlerts', v)} />
            </div>
          </Panel>
          <Panel title="Optional updates" description="Off unless you choose them. You can change your mind at any time.">
            <div className="divide-y divide-line">
              <Toggle label="Foundation newsletter" hint="Occasional news about the foundation." checked={f.draft.newsletterOptIn} onChange={(v) => f.set('newsletterOptIn', v)} />
              <Toggle label="Event announcements" hint="When new events are published." checked={f.draft.eventAnnouncements} onChange={(v) => f.set('eventAnnouncements', v)} />
              <Toggle label="Program updates" hint="When new programs open for registration." checked={f.draft.programUpdates} onChange={(v) => f.set('programUpdates', v)} />
            </div>
          </Panel>
          <FormError message={f.error} />
          <div className="flex items-center gap-3">
            <Button disabled={!f.dirty} loading={f.saving} onClick={async () => (await f.save()) && toast('Notification settings saved.')}>Save changes</Button>
            {f.dirty && <span className="text-sm text-ink-muted">You have unsaved changes.</span>}
          </div>
        </div>
      )}
    </>
  );
}
