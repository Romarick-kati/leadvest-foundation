import { Download } from '../../components/ui/icons';
import { apiUrl } from '../../lib/api';
import { Alert, Panel } from '../../components/ui';
import { AdminPage } from './shared';

const reports = [
  { id: 'registrations', title: 'Registrations', text: 'Every registration with status and payment state. Includes registrant contact details and learner first names.' },
  { id: 'enquiries', title: 'Enquiries', text: 'Enquiries with category, contact details and status. Message text is not included.' },
  { id: 'events', title: 'Event attendance', text: 'Each event with capacity, confirmed and waiting list counts. No personal data.' },
];

export default function ReportsAdmin() {
  return (
    <AdminPage title="Reports" description="Download CSV exports. Each export is recorded in the audit log.">
      <Alert tone="warning" className="mb-6">Exports can contain personal information. Store them securely and delete them when no longer needed.</Alert>
      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((r) => (
          <Panel key={r.id} title={r.title}>
            <p className="text-sm text-ink-muted">{r.text}</p>
            <a href={apiUrl(`/admin/reports/${r.id}.csv`)} download className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold text-heading no-underline hover:bg-blue-50">
              <Download size={16} aria-hidden /> Download CSV
            </a>
          </Panel>
        ))}
      </div>
    </AdminPage>
  );
}
