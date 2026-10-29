import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate, formatDateTime, roleLabel } from '../../lib/format';
import { Alert, Panel, StatusBadge, TableSkeleton } from '../../components/ui';
import { AdminPage, StatCard } from './shared';
import { useT } from '../../i18n';

interface OverviewData {
  counts: { publishedPrograms: number; upcomingEvents: number; newEnquiries: number; pendingRegistrations: number; pendingGuardianLinks: number; openDataRequests: number; usersByRole: Record<string, number> };
  recentEnquiries: { id: string; name: string; category: string; subject: string | null; status: string; createdAt: string }[];
  nextEvents: { id: string; title: string; startsAt: string; status: string; capacity: number | null; _count: { registrations: number } }[];
  sampleContent: number;
  integrations: { emailDelivery: boolean; payments: string };
}

export default function Overview() {
  const t = useT();
  const q = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<OverviewData>('/admin/overview') });
  const d = q.data;
  return (
    <AdminPage title={t('admin.overview')} description={t('admin.overviewDescription')}>
      {!d ? <TableSkeleton rows={6} /> : (
        <div className="space-y-6">
          {(d.sampleContent > 0 || !d.integrations.emailDelivery || d.integrations.payments === 'mock') && (
            <div className="space-y-3">
              {d.sampleContent > 0 && <Alert tone="warning" title={`${d.sampleContent} sample items are in the database`}>Sample programs and events from the development seed are marked “Sample content”. Archive or replace them before launch.</Alert>}
              {!d.integrations.emailDelivery && <Alert tone="info" title="Email delivery is not connected">Confirmation and reset emails are not being delivered. See the deployment guide to connect an email provider.</Alert>}
              {d.integrations.payments === 'mock' && <Alert tone="info" title="Payments are in simulation mode">No real payments can be taken.</Alert>}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Published programs" value={d.counts.publishedPrograms} to="/admin/programs" />
            <StatCard label="Upcoming events" value={d.counts.upcomingEvents} tone="sun" to="/admin/events" />
            <StatCard label="New enquiries" value={d.counts.newEnquiries} tone="mint" to="/admin/enquiries" />
            <StatCard label="Pending registrations" value={d.counts.pendingRegistrations} tone="navy" to="/admin/registrations" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Guardian checks waiting" value={d.counts.pendingGuardianLinks} to="/admin/guardians" tone="sun" />
            <StatCard label="Open privacy requests" value={d.counts.openDataRequests} to="/admin/privacy" />
            <StatCard label="Active accounts" value={Object.values(d.counts.usersByRole).reduce((a, b) => a + b, 0)} hint={Object.entries(d.counts.usersByRole).map(([r, n]) => `${roleLabel[r]}: ${n}`).join(' · ')} tone="mint" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title={t('admin.latestEnquiries')} actions={<Link to="/admin/enquiries" className="text-sm font-semibold">View all</Link>}>
              {d.recentEnquiries.length === 0 ? <p className="text-ink-muted">{t('admin.noEnquiries')}</p> : (
                <ul className="divide-y divide-line">
                  {d.recentEnquiries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-heading">{e.subject ?? `${e.category} enquiry`}</p>
                        <p className="text-sm text-ink-muted">{e.name} · {formatDateTime(e.createdAt)}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('admin.nextEvents')} actions={<Link to="/admin/events" className="text-sm font-semibold">{t('admin.manage')}</Link>}>
              {d.nextEvents.length === 0 ? <p className="text-ink-muted">{t('admin.noEvents')}</p> : (
                <ul className="divide-y divide-line">
                  {d.nextEvents.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <Link to={`/admin/events/${e.id}`} className="font-semibold">{e.title}</Link>
                        <p className="text-sm text-ink-muted">{formatDate(e.startsAt)} · {e._count.registrations} registrations{e.capacity ? ` of ${e.capacity}` : ''}</p>
                      </div>
                      <StatusBadge status={e.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
