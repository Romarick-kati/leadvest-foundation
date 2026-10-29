import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { h, notFound, pageResult, paginate, send } from '../../lib/http.js';
import { parse } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';
import { imageUpload, readStored, removeStored, storeImage } from '../../lib/uploads.js';
import { env } from '../../config/env.js';
import { getSiteSettings, saveSiteSettings, siteSettingsSchema } from '../siteSettings.js';
import { ENQUIRY_CATEGORIES } from '../enquiries.routes.js';
import { emailConfigured } from '../../services/email/index.js';
import { sendEmail } from '../../services/email/index.js';
import { templates } from '../../services/email/templates.js';

export const adminOpsRouter = Router();

/* Overview: real counts only */

adminOpsRouter.get(
  '/overview',
  h(async (_req, res) => {
    const now = new Date();
    const [publishedPrograms, upcomingEvents, newEnquiries, users, pendingRegistrations, pendingGuardianLinks, openDataRequests, recentEnquiries, nextEvents] =
      await Promise.all([
        prisma.program.count({ where: { status: 'PUBLISHED' } }),
        prisma.event.count({ where: { status: 'PUBLISHED', startsAt: { gte: now } } }),
        prisma.enquiry.count({ where: { status: 'NEW' } }),
        prisma.user.groupBy({ by: ['role'], where: { status: 'ACTIVE' }, _count: true }),
        prisma.registration.count({ where: { status: 'PENDING' } }),
        prisma.guardianLink.count({ where: { status: 'PENDING' } }),
        prisma.dataRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, category: true, subject: true, status: true, createdAt: true } }),
        prisma.event.findMany({ where: { startsAt: { gte: now } }, orderBy: { startsAt: 'asc' }, take: 5, select: { id: true, title: true, startsAt: true, status: true, capacity: true, _count: { select: { registrations: true } } } }),
      ]);
    const sampleContent = await prisma.program.count({ where: { isSample: true } }) + (await prisma.event.count({ where: { isSample: true } }));
    send(res, {
      counts: {
        publishedPrograms,
        upcomingEvents,
        newEnquiries,
        pendingRegistrations,
        pendingGuardianLinks,
        openDataRequests,
        usersByRole: Object.fromEntries(users.map((u) => [u.role, u._count])),
      },
      recentEnquiries,
      nextEvents,
      sampleContent,
      integrations: { emailDelivery: emailConfigured(), payments: env.PAYMENTS_MODE },
    });
  }),
);

/* Registrations */

adminOpsRouter.get(
  '/registrations',
  h(async (req, res) => {
    const query = parse(
      z.object({
        status: z.enum(['PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED']).optional(),
        eventId: z.string().max(40).optional(),
        programId: z.string().max(40).optional(),
      }),
      req.query,
    );
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.RegistrationWhereInput = { ...query };
    const [items, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true, priceCents: true, currency: true } },
          program: { select: { title: true, priceCents: true, currency: true } },
          registrant: { select: { id: true, displayName: true, email: true } },
          learner: { select: { id: true, displayName: true } },
        },
      }),
      prisma.registration.count({ where }),
    ]);
    // Requests still waiting for a decision, and what has really been paid (confirmed by the provider), for the same event or program.
    const scope: Prisma.RegistrationWhereInput = { ...(query.eventId ? { eventId: query.eventId } : {}), ...(query.programId ? { programId: query.programId } : {}) };
    const [pendingCount, paidRows] = await Promise.all([
      prisma.registration.count({ where: { ...scope, status: 'PENDING' } }),
      prisma.payment.groupBy({ by: ['currency'], where: { status: 'PAID', isSimulation: false, registration: { is: scope } }, _sum: { amountCents: true }, _count: true }),
    ]);
    const paid = paidRows.map((r) => ({ currency: r.currency, amountCents: r._sum.amountCents ?? 0, count: r._count }));
    send(res, { ...pageResult(items, total, page, pageSize), pendingCount, paid });
  }),
);

adminOpsRouter.patch(
  '/registrations/:id',
  h(async (req, res) => {
    const body = parse(z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED']) }), req.body);
    const before = await prisma.registration.findUnique({
      where: { id: req.params.id },
      include: { registrant: true, event: { select: { title: true } }, program: { select: { title: true } } },
    });
    if (!before) throw notFound();
    const reg = await prisma.registration.update({ where: { id: before.id }, data: { status: body.status } });
    await audit(req, 'registration.status_changed', { type: 'registration', id: reg.id }, { from: before.status, to: body.status });
    if (before.registrant.email && before.status !== body.status) {
      const title = before.event?.title ?? before.program?.title ?? 'your registration';
      await sendEmail(templates.registrationConfirmation(before.registrant.email, before.registrant.displayName, title, body.status));
    }
    send(res, reg);
  }),
);

/* Enquiries */

adminOpsRouter.get(
  '/enquiries',
  h(async (req, res) => {
    const query = parse(
      z.object({
        status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(),
        category: z.enum(ENQUIRY_CATEGORIES).optional(),
        q: z.string().trim().max(100).optional(),
      }),
      req.query,
    );
    const { page, pageSize, skip, take } = paginate(req.query);
    const where: Prisma.EnquiryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }, { subject: { contains: query.q, mode: 'insensitive' } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.enquiry.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.enquiry.count({ where }),
    ]);
    send(res, pageResult(items, total, page, pageSize));
  }),
);

adminOpsRouter.patch(
  '/enquiries/:id',
  h(async (req, res) => {
    const body = parse(
      z.object({ status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(), category: z.enum(ENQUIRY_CATEGORIES).optional(), internalNotes: z.string().trim().max(5000).optional() }).strict(),
      req.body,
    );
    const enquiry = await prisma.enquiry.update({ where: { id: req.params.id }, data: { ...body, handledById: req.auth!.user.id } });
    await audit(req, 'enquiry.updated', { type: 'enquiry', id: enquiry.id }, { fields: Object.keys(body), status: body.status });
    send(res, enquiry);
  }),
);

/* Payments (read only: statuses come from verified provider events) */

adminOpsRouter.get(
  '/payments',
  h(async (req, res) => {
    const { page, pageSize, skip, take } = paginate(req.query);
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, purpose: true, provider: true, providerRef: true, amountCents: true, currency: true, status: true, isSimulation: true, createdAt: true,
          registration: { select: { id: true, event: { select: { title: true } }, program: { select: { title: true } }, registrant: { select: { id: true, displayName: true, email: true } } } },
          payer: { select: { id: true, displayName: true, email: true } },
        },
      }),
      prisma.payment.count(),
    ]);
    send(res, { ...pageResult(items, total, page, pageSize), mode: env.PAYMENTS_MODE });
  }),
);

/* Media */

const FOLDERS = ['branding', 'homepage', 'programs', 'learning', 'events', 'team', 'illustrations', 'gallery', 'general'] as const;

adminOpsRouter.get(
  '/media',
  h(async (_req, res) => {
    send(res, await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }));
  }),
);

adminOpsRouter.post(
  '/media',
  imageUpload.single('file'),
  h(async (req, res) => {
    const meta = parse(
      z.object({ altText: z.string().trim().max(300).default(''), folder: z.enum(FOLDERS).default('general'), visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC') }),
      req.body,
    );
    const stored = await storeImage(req.file, meta.visibility === 'PUBLIC' ? 'public' : 'private', meta.folder);
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: stored.filename,
        originalName: (req.file?.originalname ?? 'upload').slice(0, 200),
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        altText: meta.altText,
        folder: meta.folder,
        visibility: meta.visibility,
        uploadedById: req.auth!.user.id,
      },
    });
    await audit(req, 'media.uploaded', { type: 'media', id: asset.id }, { visibility: asset.visibility, folder: asset.folder });
    send(res, { ...asset, url: stored.url }, 201);
  }),
);

adminOpsRouter.patch(
  '/media/:id',
  h(async (req, res) => {
    const body = parse(z.object({ altText: z.string().trim().max(300) }), req.body);
    send(res, await prisma.mediaAsset.update({ where: { id: req.params.id }, data: body }));
  }),
);

adminOpsRouter.delete(
  '/media/:id',
  h(async (req, res) => {
    const asset = await prisma.mediaAsset.delete({ where: { id: req.params.id } });
    await removeStored(asset.filename, asset.visibility === 'PUBLIC' ? 'public' : 'private');
    await audit(req, 'media.deleted', { type: 'media', id: asset.id });
    send(res, { deleted: true });
  }),
);

/* Site settings */

adminOpsRouter.get(
  '/settings',
  h(async (_req, res) => {
    send(res, {
      site: await getSiteSettings(),
      // Configuration status only. Secret values are never returned.
      system: {
        environment: env.NODE_ENV,
        emailTransport: env.EMAIL_TRANSPORT,
        emailDeliveryConfigured: emailConfigured(),
        paymentsMode: env.PAYMENTS_MODE,
        requireAdmin2fa: env.REQUIRE_ADMIN_2FA,
        cookieSameSite: env.COOKIE_SAMESITE,
      },
    });
  }),
);

adminOpsRouter.put(
  '/settings',
  h(async (req, res) => {
    const site = parse(siteSettingsSchema, req.body);
    // Donations cannot be switched on from the dashboard until a live provider exists.
    if (site.donations.enabled && env.PAYMENTS_MODE === 'disabled') site.donations.enabled = false;
    await saveSiteSettings(site);
    await audit(req, 'settings.updated', { type: 'settings', id: 'site' });
    send(res, site);
  }),
);

/* Privacy data requests */

adminOpsRouter.get(
  '/data-requests',
  h(async (_req, res) => {
    send(res, await prisma.dataRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { id: true, displayName: true, email: true } } } }));
  }),
);

adminOpsRouter.patch(
  '/data-requests/:id',
  h(async (req, res) => {
    const body = parse(z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'DECLINED']) }), req.body);
    const dr = await prisma.dataRequest.update({ where: { id: req.params.id }, data: body });
    await audit(req, 'privacy.data_request_updated', { type: 'data_request', id: dr.id }, { status: body.status });
    send(res, dr);
  }),
);

/* Audit log */

adminOpsRouter.get(
  '/audit-logs',
  h(async (req, res) => {
    const query = parse(z.object({ action: z.string().trim().max(80).optional(), actorId: z.string().max(40).optional() }), req.query);
    const { page, pageSize, skip, take } = paginate(req.query, 100);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, displayName: true } } } }),
      prisma.auditLog.count({ where }),
    ]);
    send(res, pageResult(items, total, page, pageSize));
  }),
);

/* Reports: controlled CSV exports. Child records are limited to display names. */

function csv(rows: (string | number | null | undefined | Date)[][]) {
  const cell = (v: unknown) => {
    let s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v);
    // Prevent spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

adminOpsRouter.get(
  '/reports/:report.csv',
  h(async (req, res) => {
    const report = parse(z.enum(['registrations', 'enquiries', 'events']), req.params.report);
    let body = '';
    if (report === 'registrations') {
      const regs = await prisma.registration.findMany({
        orderBy: { createdAt: 'desc' },
        include: { event: { select: { title: true } }, program: { select: { title: true } }, registrant: { select: { displayName: true, email: true } }, learner: { select: { displayName: true } } },
      });
      body = csv([
        ['Created', 'For', 'Registrant', 'Registrant email', 'Learner', 'Status', 'Payment'],
        ...regs.map((r) => [r.createdAt, r.event?.title ?? r.program?.title, r.registrant.displayName, r.registrant.email, r.learner?.displayName, r.status, r.paymentStatus]),
      ]);
    } else if (report === 'enquiries') {
      const items = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } });
      body = csv([['Created', 'Category', 'Name', 'Email', 'Subject', 'Status'], ...items.map((e) => [e.createdAt, e.category, e.name, e.email, e.subject, e.status])]);
    } else {
      const events = await prisma.event.findMany({ orderBy: { startsAt: 'desc' }, include: { registrations: { select: { status: true } } } });
      body = csv([
        ['Event', 'Starts', 'Status', 'Capacity', 'Confirmed', 'Waitlisted'],
        ...events.map((e) => [e.title, e.startsAt, e.eventStatus, e.capacity, e.registrations.filter((r) => r.status === 'CONFIRMED').length, e.registrations.filter((r) => r.status === 'WAITLISTED').length]),
      ]);
    }
    await audit(req, 'report.exported', { type: 'report', id: report });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(body);
  }),
);

/** Private files are streamed only to administrators, never served statically. */
adminOpsRouter.get(
  '/media/:id/file',
  h(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw notFound();
    const file = await readStored(asset.filename, asset.visibility === 'PUBLIC' ? 'public' : 'private');
    if (!file) throw notFound('The file is missing from storage.');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', asset.mimeType);
    res.send(file.body);
  }),
);
