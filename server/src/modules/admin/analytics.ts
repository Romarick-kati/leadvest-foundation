import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { h, send } from '../../lib/http.js';
import { parse } from '../../lib/validate.js';

/**
 * Numbers for the Analytics page in the dashboard. Only counts are returned, never the names of
 * people (and never anything about children beyond how many there are). Days and hours are
 * worked out in Cameroon time, which is UTC+1 all year.
 */
export const adminAnalyticsRouter = Router();

const DAY = 86_400_000;
const WAT_OFFSET = 3_600_000;
const MAX_ROWS = 100_000;

type Granularity = 'day' | 'week' | 'month';
const RANGES: Record<string, { days: number | null; by: Granularity }> = {
  '7': { days: 7, by: 'day' },
  '30': { days: 30, by: 'day' },
  '90': { days: 90, by: 'week' },
  '365': { days: 365, by: 'month' },
  all: { days: null, by: 'month' },
};

const wat = (d: Date) => new Date(d.getTime() + WAT_OFFSET);

/** The label of the day, week (its Monday) or month a moment falls in, in Cameroon time. */
export function bucketKey(d: Date, by: Granularity): string {
  const s = wat(d);
  if (by === 'month') return s.toISOString().slice(0, 7);
  if (by === 'week') {
    const back = (s.getUTCDay() + 6) % 7;
    return new Date(s.getTime() - back * DAY).toISOString().slice(0, 10);
  }
  return s.toISOString().slice(0, 10);
}

/** Every bucket from start to end, so quiet periods show as zero instead of being missing. */
export function bucketKeys(start: Date, end: Date, by: Granularity): string[] {
  const keys: string[] = [];
  for (let t = start.getTime(); t <= end.getTime() && keys.length < 4000; t += DAY) {
    const k = bucketKey(new Date(t), by);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  const last = bucketKey(end, by);
  if (keys[keys.length - 1] !== last) keys.push(last);
  return keys;
}

/** The moment a bucket label starts, in Cameroon time. */
const bucketStart = (key: string) => new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00+01:00`);

const statusKey = (s: string) => (s === 'CONFIRMED' ? 'confirmed' : s === 'PENDING' ? 'pending' : s === 'WAITLISTED' ? 'waitlisted' : 'refused');

adminAnalyticsRouter.get(
  '/analytics',
  h(async (req, res) => {
    const { range } = parse(z.object({ range: z.enum(['7', '30', '90', '365', 'all']).default('30') }), req.query);
    const { days, by } = RANGES[range]!;
    const now = new Date();

    let start: Date;
    if (days === null) {
      const [firstUser, firstReg] = await Promise.all([
        prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.registration.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      ]);
      const firsts = [firstUser?.createdAt, firstReg?.createdAt].filter((d): d is Date => Boolean(d));
      start = firsts.length ? new Date(Math.min(...firsts.map((d) => d.getTime()))) : now;
    } else {
      start = new Date(now.getTime() - (days - 1) * DAY);
    }
    const keys = bucketKeys(start, now, by);
    // Begin at the first full bucket so the first bar is never half empty.
    const since = days === null ? null : bucketStart(keys[0]!);
    const sinceFilter = since ? { createdAt: { gte: since } } : {};

    const [roleGroups, users, regs, payments] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], where: { status: 'ACTIVE' }, _count: true }),
      prisma.user.findMany({ where: { ...sinceFilter, role: { not: 'ADMIN' } }, select: { createdAt: true }, take: MAX_ROWS }),
      prisma.registration.findMany({
        where: sinceFilter,
        select: { createdAt: true, status: true, paymentStatus: true, eventId: true, programId: true, event: { select: { title: true } }, program: { select: { title: true } } },
        take: MAX_ROWS,
      }),
      prisma.payment.findMany({
        where: { status: 'PAID', isSimulation: false, ...sinceFilter },
        select: { createdAt: true, amountCents: true, currency: true, provider: true },
        take: MAX_ROWS,
      }),
    ]);

    const roleCounts = roleGroups as unknown as { role: string; _count: number }[];

    // New accounts over time.
    const usersOver = new Map(keys.map((k) => [k, 0]));
    for (const u of users) usersOver.set(bucketKey(u.createdAt, by), (usersOver.get(bucketKey(u.createdAt, by)) ?? 0) + 1);

    // Registrations over time, by what happened to them, plus per event or program and by time of day.
    const blank = () => ({ total: 0, confirmed: 0, pending: 0, waitlisted: 0, refused: 0 });
    const regOver = new Map(keys.map((k) => [k, blank()]));
    const items = new Map<string, { id: string; kind: 'event' | 'program'; title: string } & ReturnType<typeof blank>>();
    const byHour = Array.from({ length: 24 }, () => 0);
    const byWeekday = Array.from({ length: 7 }, () => 0);
    const statuses = blank();
    let paidRegistrations = 0;
    for (const r of regs) {
      const s = statusKey(r.status);
      const bucket = regOver.get(bucketKey(r.createdAt, by));
      if (bucket) { bucket.total += 1; bucket[s] += 1; }
      statuses.total += 1; statuses[s] += 1;
      if (r.paymentStatus === 'PAID') paidRegistrations += 1;
      const local = wat(r.createdAt);
      byHour[local.getUTCHours()]! += 1;
      byWeekday[local.getUTCDay()]! += 1;
      const id = r.eventId ?? r.programId;
      if (!id) continue;
      const kind = r.eventId ? 'event' : 'program';
      const mapKey = `${kind}:${id}`;
      const item = items.get(mapKey) ?? { id, kind, title: (r.event?.title ?? r.program?.title ?? 'Removed item') as string, ...blank() };
      item.total += 1; item[s] += 1;
      items.set(mapKey, item);
    }

    // Money that has really been paid (test payments are left out).
    const byCurrency = new Map<string, { currency: string; amountCents: number; count: number }>();
    const byProvider = new Map<string, { provider: string; amountCents: number; count: number }>();
    const revenueOver = new Map<string, Record<string, number>>(keys.map((k) => [k, {}]));
    for (const p of payments) {
      const c = byCurrency.get(p.currency) ?? { currency: p.currency, amountCents: 0, count: 0 };
      c.amountCents += p.amountCents; c.count += 1; byCurrency.set(p.currency, c);
      const pr = byProvider.get(p.provider) ?? { provider: p.provider, amountCents: 0, count: 0 };
      pr.amountCents += p.amountCents; pr.count += 1; byProvider.set(p.provider, pr);
      const bucket = revenueOver.get(bucketKey(p.createdAt, by));
      if (bucket) bucket[p.currency] = (bucket[p.currency] ?? 0) + p.amountCents;
    }

    const itemList = [...items.values()].sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));

    send(res, {
      range,
      granularity: by,
      generatedAt: now.toISOString(),
      totals: {
        accounts: roleCounts.reduce((sum, r) => sum + r._count, 0),
        newAccounts: users.length,
        registrations: statuses.total,
        confirmed: statuses.confirmed,
        pending: statuses.pending,
        waitlisted: statuses.waitlisted,
        refused: statuses.refused,
        paidRegistrations,
      },
      usersByRole: roleCounts.map((r) => ({ role: r.role, count: r._count })).sort((a, b) => b.count - a.count),
      usersOverTime: keys.map((period) => ({ period, count: usersOver.get(period) ?? 0 })),
      registrationsOverTime: keys.map((period) => ({ period, ...(regOver.get(period) ?? blank()) })),
      registrationsByStatus: statuses,
      byItem: itemList.slice(0, 15),
      itemCount: itemList.length,
      byHour: byHour.map((count, hour) => ({ hour, count })),
      byWeekday: byWeekday.map((count, day) => ({ day, count })),
      revenue: {
        byCurrency: [...byCurrency.values()].sort((a, b) => b.amountCents - a.amountCents),
        byProvider: [...byProvider.values()].sort((a, b) => b.amountCents - a.amountCents),
        overTime: keys.map((period) => ({ period, byCurrency: revenueOver.get(period) ?? {} })),
      },
    });
  }),
);
