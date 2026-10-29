import type { NextFunction, Request, Response } from 'express';
import type { Prisma, Role } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from '../lib/http.js';

/** Roles that pay. Staff (instructors, administrators) never do, and a new member must first choose a role. */
const PAYING: Role[] = ['PARENT', 'YOUTH', 'LEARNER'];

type AccessFields = { role: Role; accessUntil: Date | null; accessLifetime: boolean };

/** Is the access fee switched on for this site? It needs a price and a working payment provider. */
export const accessFeeEnabled = () => env.ACCESS_FEE_XAF > 0 && env.PAYMENTS_MODE !== 'disabled';

/** What a person is allowed to do, worked out from their stored fields. No database call. */
export function accessState(user: AccessFields, now = new Date()) {
  const required = accessFeeEnabled() && PAYING.includes(user.role);
  const until = user.accessUntil;
  const active = !required || user.accessLifetime || Boolean(until && until > now);
  return {
    required,
    active,
    lifetime: user.accessLifetime,
    until: user.accessLifetime ? null : until,
    feeXaf: env.ACCESS_FEE_XAF,
    // The price for card payers from abroad. Null means they pay the FCFA price.
    feeUsd: env.ACCESS_FEE_USD > 0 ? env.ACCESS_FEE_USD : null,
    periodDays: env.ACCESS_PERIOD_DAYS,
    providers: env.paymentProviders,
  };
}

/** Blocks the request with 402 when the person has to pay first. Anyone not signed in passes (the route's own checks handle that). */
export function requireAccess(req: Request, _res: Response, next: NextFunction) {
  const user = req.auth?.user;
  if (user && !accessState(user).active) {
    return next(new ApiError(402, 'payment_required', 'Please pay the access fee to continue.'));
  }
  next();
}

/** Adds one paid period (or lifetime) to a person, and gives the same access to children they guard. */
export async function grantAccess(tx: Prisma.TransactionClient, userId: string, opts: { lifetime?: boolean; days?: number } = {}) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const days = opts.days ?? env.ACCESS_PERIOD_DAYS;
  const lifetime = opts.lifetime ?? days === 0;
  const now = new Date();
  const base = user.accessUntil && user.accessUntil > now ? user.accessUntil : now;
  const accessUntil = lifetime ? user.accessUntil : new Date(base.getTime() + days * 86_400_000);
  await tx.user.update({ where: { id: userId }, data: { accessLifetime: lifetime || user.accessLifetime, accessUntil } });
  await copyToChildren(tx, userId);
}

/** Removes paid access (administrator action). */
export async function revokeAccess(tx: Prisma.TransactionClient, userId: string) {
  await tx.user.update({ where: { id: userId }, data: { accessLifetime: false, accessUntil: null } });
  await copyToChildren(tx, userId);
}

/** A child learner has the best access among their guardians. */
export async function copyToChildren(tx: Prisma.TransactionClient, guardianId: string) {
  const links = await tx.guardianLink.findMany({ where: { guardianId }, select: { learnerId: true } });
  for (const { learnerId } of links) await syncLearner(tx, learnerId);
}

export async function syncLearner(tx: Prisma.TransactionClient, learnerId: string) {
  const guardians = await tx.guardianLink.findMany({ where: { learnerId }, include: { guardian: true } });
  let lifetime = false;
  let until: Date | null = null;
  for (const g of guardians) {
    if (g.guardian.accessLifetime) lifetime = true;
    if (g.guardian.accessUntil && (!until || g.guardian.accessUntil > until)) until = g.guardian.accessUntil;
  }
  await tx.user.update({ where: { id: learnerId }, data: { accessLifetime: lifetime, accessUntil: until } });
}

