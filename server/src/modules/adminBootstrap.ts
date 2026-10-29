import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { randomToken } from '../lib/crypto.js';
import { emailSchema, nameSchema, passwordSchema } from '../lib/validate.js';
import { hashPassword } from './users.js';
import { appLink, issueToken } from './tokens.js';

export type BootstrapResult =
  | { outcome: 'created'; userId: string; setupLink?: string }
  | { outcome: 'exists'; userId: string; setupLink?: string }
  | { outcome: 'promoted'; userId: string; setupLink?: string }
  | { outcome: 'conflict' };

const input = z.object({ email: emailSchema, name: nameSchema, password: passwordSchema.optional() });

/**
 * Creates the first administrator, and is safe to run again: an existing administrator is
 * left exactly as it is (its password is never replaced). With a password (for example from
 * the ADMIN_PASSWORD environment variable) the account is ready to sign in; without one, a
 * single use setup link is returned so the person chooses their own. The password is only
 * ever stored as an Argon2id hash and is never logged or returned. An email that belongs to a
 * non administrator is refused, so an address alone never grants administrator rights.
 */
export async function bootstrapAdmin(raw: { email?: string; name?: string; password?: string }, opts: { issueLink?: boolean; promoteExisting?: boolean } = {}): Promise<BootstrapResult> {
  const { email, name, password } = input.parse({ ...raw, password: raw.password || undefined });
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  // Only the site owner can reach this: it runs from the build or command line using environment
  // variables, never from a web request. It lets the owner turn an account they already created
  // (for example by signing up with their own email) into the administrator account.
  const promotable = existing && ['MEMBER', 'PARENT', 'YOUTH'].includes(existing.role);
  if (existing && existing.role !== 'ADMIN' && !(opts.promoteExisting && promotable)) return { outcome: 'conflict' };

  let userId: string;
  let outcome: 'created' | 'exists' | 'promoted';
  if (existing && existing.role !== 'ADMIN') {
    userId = existing.id;
    outcome = 'promoted';
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(),
          ...(password ? { passwordHash: await hashPassword(password) } : {}),
        },
      });
      // Sign out any old sessions so the new role applies cleanly.
      await tx.session.deleteMany({ where: { userId: existing.id } });
      await tx.auditLog.create({ data: { action: 'user.promoted_by_cli', targetType: 'user', targetId: existing.id, metadata: { from: existing.role, to: 'ADMIN', passwordFrom: password ? 'environment' : 'unchanged' } } });
    });
  } else if (existing) {
    userId = existing.id;
    outcome = 'exists';
  } else {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          displayName: name,
          role: 'ADMIN',
          // Without a supplied password the account gets an unusable random one until the
          // setup link is used.
          passwordHash: await hashPassword(password ?? randomToken(32)),
          passwordChangedAt: new Date(),
          preferences: { create: {} },
        },
      });
      await tx.auditLog.create({ data: { action: 'user.created_by_cli', targetType: 'user', targetId: u.id, metadata: { role: 'ADMIN', passwordFrom: password ? 'environment' : 'setup_link' } } });
      return u;
    });
    userId = user.id;
    outcome = 'created';
  }

  // A promoted account without a supplied password keeps its own; no link unless asked for.
  const wantLink = opts.issueLink ?? (!password && outcome !== 'promoted');
  const setupLink = wantLink ? appLink('/reset-password', await issueToken(userId, 'PASSWORD_RESET')) : undefined;
  return { outcome, userId, setupLink };
}
