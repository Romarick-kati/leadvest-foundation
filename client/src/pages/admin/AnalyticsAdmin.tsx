import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '../../lib/api';
import { formatMoney, roleLabel } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';
import { Alert, Button, Panel, TableSkeleton } from '../../components/ui';
import { Download } from '../../components/ui/icons';
import { COLORS, Columns, Donut, Legend, NamedBars, type Series } from '../../components/charts/Charts';
import { AdminPage, StatCard } from './shared';

type Counts = { total: number; confirmed: number; pending: number; waitlisted: number; refused: number };
interface Analytics {
  range: string;
  granularity: 'day' | 'week' | 'month';
  generatedAt: string;
  totals: { accounts: number; newAccounts: number; registrations: number; confirmed: number; pending: number; waitlisted: number; refused: number; paidRegistrations: number };
  usersByRole: { role: string; count: number }[];
  usersOverTime: { period: string; count: number }[];
  registrationsOverTime: ({ period: string } & Counts)[];
  registrationsByStatus: Counts;
  byItem: ({ id: string; kind: 'event' | 'program'; title: string } & Counts)[];
  itemCount: number;
  byHour: { hour: number; count: number }[];
  byWeekday: { day: number; count: number }[];
  revenue: { byCurrency: { currency: string; amountCents: number; count: number }[]; byProvider: { provider: string; amountCents: number; count: number }[]; overTime: { period: string; byCurrency: Record<string, number> }[] };
}

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '3 months' },
  { id: '365', label: '12 months' },
  { id: 'all', label: 'All time' },
];

const STATUS: Series[] = [
  { key: 'confirmed', label: 'Accepted', color: COLORS.confirmed },
  { key: 'pending', label: 'Pending', color: COLORS.pending },
  { key: 'waitlisted', label: 'Waiting list', color: COLORS.waitlisted },
  { key: 'refused', label: 'Refused', color: COLORS.refused },
];

const ROLE_COLOR: Record<string, string> = { PARENT: COLORS.blue, YOUTH: COLORS.purple, MEMBER: COLORS.teal, LEARNER: COLORS.pending, INSTRUCTOR: COLORS.confirmed, ADMIN: COLORS.grey };
const PROVIDER_LABEL: Record<string, string> = { fapshi: 'Mobile Money (Fapshi)', notchpay: 'Notch Pay', flutterwave: 'Flutterwave', mock: 'Test' };

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });
const periodLabel = (period: string) => (period.length === 7 ? monthFmt.format(new Date(`${period}-01T00:00:00Z`)) : dateFmt.format(new Date(`${period}T00:00:00Z`)));
const periodLong = (period: string, g: Analytics['granularity']) => (g === 'week' ? `Week of ${periodLabel(period)}` : g === 'month' ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T00:00:00Z`)) : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${period}T00:00:00Z`)));
const weekdayName = (d: number) => new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + d)));
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}h`;

function CsvButton({ onClick }: { onClick: () => void }) {
  return <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={onClick}>CSV</Button>;
}

export default function AnalyticsAdmin() {
  const [range, setRange] = useState('30');
  const q = useQuery({ queryKey: ['admin', 'analytics', range], queryFn: () => api.get<Analytics>(`/admin/analytics${qs({ range })}`), placeholderData: (prev) => prev });
  const d = q.data;
  const rangeLabel = RANGES.find((r) => r.id === range)?.label ?? '';
  const stamp = new Date().toISOString().slice(0, 10);

  // The currency with the most money, for the money chart. Others are listed in words.
  const mainCurrency = d?.revenue.byCurrency[0]?.currency;

  const exportAll = () => {
    if (!d) return;
    downloadCsv(`analytics-${range}-${stamp}.csv`, [
      ['Lead Vest Foundation analytics'], ['Period', rangeLabel], ['Created', d.generatedAt], [],
      ['SUMMARY'], ['Active accounts', d.totals.accounts], ['New accounts', d.totals.newAccounts], ['Registrations', d.totals.registrations], ['Accepted', d.totals.confirmed], ['Pending', d.totals.pending], ['Waiting list', d.totals.waitlisted], ['Refused', d.totals.refused], [],
      ['ACCOUNTS BY TYPE'], ['Type', 'Accounts'], ...d.usersByRole.map((r) => [roleLabel[r.role] ?? r.role, r.count]), [],
      ['NEW ACCOUNTS OVER TIME'], ['Period', 'New accounts'], ...d.usersOverTime.map((p) => [p.period, p.count]), [],
      ['REGISTRATIONS OVER TIME'], ['Period', 'Total', 'Accepted', 'Pending', 'Waiting list', 'Refused'], ...d.registrationsOverTime.map((p) => [p.period, p.total, p.confirmed, p.pending, p.waitlisted, p.refused]), [],
      ['EVENTS AND PROGRAMS'], ['Name', 'Type', 'Total', 'Accepted', 'Pending', 'Waiting list', 'Refused'], ...d.byItem.map((i) => [i.title, i.kind === 'event' ? 'Event' : 'Program', i.total, i.confirmed, i.pending, i.waitlisted, i.refused]), [],
      ['WHEN PEOPLE APPLY (Cameroon time)'], ['Hour', 'Registrations'], ...d.byHour.map((h) => [hourLabel(h.hour), h.count]), [], ['Day', 'Registrations'], ...d.byWeekday.map((w) => [weekdayName(w.day), w.count]), [],
      ['MONEY RECEIVED (real payments only)'], ['Currency', 'Amount', 'Payments'], ...d.revenue.byCurrency.map((c) => [c.currency, c.amountCents / 100, c.count]),
    ]);
  };

  return (
    <AdminPage
      title="Analytics"
      description="See who is using the platform, which events and programs people join, and when they apply. Only numbers are shown here, never names."
      actions={<Button icon={<Download size={16} />} disabled={!d} onClick={exportAll}>Download everything (CSV)</Button>}
    >
      <div role="group" aria-label="Period" className="mb-6 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`min-h-10 rounded-full border-2 px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${range === r.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-line-strong text-heading hover:border-blue-600'}`}>{r.label}</button>
        ))}
      </div>

      {q.isError && <Alert tone="error" className="mb-6" title="The numbers could not be loaded">Please refresh the page and try again.</Alert>}
      {!d ? <TableSkeleton rows={6} /> : (
        <div className={`space-y-6 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`} aria-busy={q.isFetching}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Active accounts" value={d.totals.accounts} hint="Everyone who can sign in today" />
            <StatCard label={`New accounts · ${rangeLabel}`} value={d.totals.newAccounts} tone="mint" />
            <StatCard label={`Registrations · ${rangeLabel}`} value={d.totals.registrations} tone="sun" to="/admin/registrations" hint={`${d.totals.paidRegistrations} paid`} />
            <StatCard label="Waiting for your decision" value={d.totals.pending} tone="navy" to="/admin/registrations" hint="Pending in this period" />
          </div>

          <Panel title="Registrations over time" description={`How many people asked to join, by what happened next. ${rangeLabel}${d.granularity === 'week' ? ', per week' : d.granularity === 'month' ? ', per month' : ', per day'}.`} actions={<CsvButton onClick={() => downloadCsv(`registrations-over-time-${stamp}.csv`, [['Period', 'Total', 'Accepted', 'Pending', 'Waiting list', 'Refused'], ...d.registrationsOverTime.map((p) => [p.period, p.total, p.confirmed, p.pending, p.waitlisted, p.refused])])} />}>
            <div className="mb-4"><Legend items={STATUS.map((s) => ({ label: s.label, color: s.color, value: d.registrationsByStatus[s.key as keyof Counts] }))} /></div>
            <Columns label="Registrations over time" series={STATUS} data={d.registrationsOverTime.map((p) => ({ id: p.period, label: periodLabel(p.period), values: { confirmed: p.confirmed, pending: p.pending, waitlisted: p.waitlisted, refused: p.refused } }))} describe={(c) => `${periodLong(c.id, d.granularity)}: ${STATUS.reduce((n, s) => n + (c.values[s.key] ?? 0), 0)} registrations`} />
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Who uses the platform" description="Active accounts by type." actions={<CsvButton onClick={() => downloadCsv(`accounts-by-type-${stamp}.csv`, [['Type', 'Accounts'], ...d.usersByRole.map((r) => [roleLabel[r.role] ?? r.role, r.count])])} />}>
              <Donut label="Active accounts by type" centre="accounts" slices={d.usersByRole.map((r) => ({ label: roleLabel[r.role] ?? r.role, value: r.count, color: ROLE_COLOR[r.role] ?? COLORS.grey }))} />
            </Panel>
            <Panel title="What happened to the requests" description={`Registrations in ${rangeLabel.toLowerCase()}.`}>
              <Donut label="Registrations by outcome" centre="requests" slices={STATUS.map((s) => ({ label: s.label, value: d.registrationsByStatus[s.key as keyof Counts], color: s.color }))} />
            </Panel>
          </div>

          <Panel title="New accounts over time" description="People who created an account." actions={<CsvButton onClick={() => downloadCsv(`new-accounts-${stamp}.csv`, [['Period', 'New accounts'], ...d.usersOverTime.map((p) => [p.period, p.count])])} />}>
            <Columns label="New accounts over time" unit=" new accounts" series={[{ key: 'count', label: 'New accounts', color: COLORS.purple }]} data={d.usersOverTime.map((p) => ({ id: p.period, label: periodLabel(p.period), values: { count: p.count } }))} />
          </Panel>

          <Panel title="Events and programs: who signed up" description={d.itemCount > d.byItem.length ? `The ${d.byItem.length} most popular of ${d.itemCount}. The CSV button has them all in the full download.` : 'Each event and program with its numbers.'} actions={<CsvButton onClick={() => downloadCsv(`events-and-programs-${stamp}.csv`, [['Name', 'Type', 'Total', 'Accepted', 'Pending', 'Waiting list', 'Refused'], ...d.byItem.map((i) => [i.title, i.kind === 'event' ? 'Event' : 'Program', i.total, i.confirmed, i.pending, i.waitlisted, i.refused])])} />}>
            <div className="mb-4"><Legend items={STATUS.map((s) => ({ label: s.label, color: s.color }))} /></div>
            <NamedBars series={STATUS} empty="Nobody has registered in this period yet." rows={d.byItem.map((i) => ({ id: `${i.kind}-${i.id}`, label: i.title, sublabel: i.kind === 'event' ? 'Event' : 'Program', values: { confirmed: i.confirmed, pending: i.pending, waitlisted: i.waitlisted, refused: i.refused } }))} />
            <p className="mt-4 text-sm text-ink-muted">Need the names of the people? Open <Link to="/admin/reports">Reports</Link> for the registrations list with names and contact details.</p>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="What time people apply" description="Registrations by hour of the day, in Cameroon time." actions={<CsvButton onClick={() => downloadCsv(`applications-by-hour-${stamp}.csv`, [['Hour (Cameroon time)', 'Registrations'], ...d.byHour.map((h) => [hourLabel(h.hour), h.count])])} />}>
              <Columns label="Registrations by hour" unit=" registrations" height={150} series={[{ key: 'count', label: 'Registrations', color: COLORS.teal }]} data={d.byHour.map((h) => ({ id: String(h.hour), label: hourLabel(h.hour), values: { count: h.count } }))} describe={(c) => `${c.label}: ${c.values.count} registrations`} />
              {d.totals.registrations > 0 && <p className="mt-1 text-sm text-ink-muted">Busiest hour: <strong className="text-heading">{hourLabel([...d.byHour].sort((a, b) => b.count - a.count)[0]!.hour)}</strong></p>}
            </Panel>
            <Panel title="Which day people apply" description="Registrations by day of the week." actions={<CsvButton onClick={() => downloadCsv(`applications-by-weekday-${stamp}.csv`, [['Day', 'Registrations'], ...d.byWeekday.map((w) => [weekdayName(w.day), w.count])])} />}>
              <Columns label="Registrations by weekday" unit=" registrations" height={150} series={[{ key: 'count', label: 'Registrations', color: COLORS.navy }]} data={[1, 2, 3, 4, 5, 6, 0].map((day) => ({ id: String(day), label: weekdayName(day), values: { count: d.byWeekday.find((w) => w.day === day)?.count ?? 0 } }))} />
              {d.totals.registrations > 0 && <p className="mt-1 text-sm text-ink-muted">Busiest day: <strong className="text-heading">{weekdayName([...d.byWeekday].sort((a, b) => b.count - a.count)[0]!.day)}</strong></p>}
            </Panel>
          </div>

          <Panel title="Money received" description="Real payments only. Test payments are not counted." actions={<CsvButton onClick={() => downloadCsv(`money-received-${stamp}.csv`, [['Currency', 'Amount', 'Payments'], ...d.revenue.byCurrency.map((c) => [c.currency, c.amountCents / 100, c.count]), [], ['Provider', 'Amount (cents)', 'Payments'], ...d.revenue.byProvider.map((p) => [PROVIDER_LABEL[p.provider] ?? p.provider, p.amountCents, p.count])])} />}>
            {d.revenue.byCurrency.length === 0 ? <p className="text-ink-muted">No real payments in this period yet.</p> : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {d.revenue.byCurrency.map((c) => <StatCard key={c.currency} label={`Received in ${c.currency}`} value={formatMoney(c.amountCents, c.currency)} hint={`${c.count} payment${c.count === 1 ? '' : 's'}`} tone="mint" />)}
                </div>
                {mainCurrency && (
                  <Columns label={`Money received in ${mainCurrency}`} series={[{ key: 'amount', label: mainCurrency, color: COLORS.confirmed }]} format={(n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))} data={d.revenue.overTime.map((p) => ({ id: p.period, label: periodLabel(p.period), values: { amount: Math.round((p.byCurrency[mainCurrency] ?? 0) / 100) } }))} describe={(c) => `${periodLong(c.id, d.granularity)}: ${formatMoney((c.values.amount ?? 0) * 100, mainCurrency)}`} />
                )}
                <Legend items={d.revenue.byProvider.map((p, i) => ({ label: PROVIDER_LABEL[p.provider] ?? p.provider, color: [COLORS.confirmed, COLORS.blue, COLORS.purple, COLORS.pending][i % 4]!, value: `${p.count} payment${p.count === 1 ? '' : 's'}` }))} />
              </div>
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
