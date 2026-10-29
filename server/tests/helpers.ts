import request from 'supertest';
import { generate } from 'otplib';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/modules/users.js';
import { decrypt } from '../src/lib/crypto.js';
import type { Role } from '@prisma/client';

export const app = createApp();
export const PASSWORD = 'Correct-horse-42';

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

/** A supertest agent that keeps cookies and sends the CSRF header like the web client. */
export function client() {
  const agent = request.agent(app);
  const wrap = (method: 'get' | 'post' | 'patch' | 'put' | 'delete') => (url: string) =>
    agent[method](url).set('X-Requested-With', 'lvf-web').set('Origin', 'http://localhost:5173');
  return { agent, get: wrap('get'), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') };
}

export async function makeUser(role: Role, overrides: Partial<{ email: string; username: string; displayName: string; verified: boolean }> = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  return prisma.user.create({
    data: {
      role,
      email: role === 'LEARNER' ? null : (overrides.email ?? `${role.toLowerCase()}-${n}@example.test`),
      username: role === 'LEARNER' ? (overrides.username ?? `learner_${n}`) : null,
      displayName: overrides.displayName ?? `Test ${role}`,
      passwordHash: await hashPassword(PASSWORD),
      emailVerifiedAt: overrides.verified === false ? null : new Date(),
      preferences: { create: {} },
    },
  });
}

export async function signIn(identifier: string, password = PASSWORD) {
  const c = client();
  const res = await c.post('/api/auth/login').send({ identifier, password });
  return { c, res };
}

/** Current TOTP code for a user's stored secret (pending or active), optionally offset by steps. */
export async function totpFor(userId: string, opts: { pending?: boolean; stepOffset?: number } = {}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const enc = opts.pending ? user.totpPendingSecretEnc : user.totpSecretEnc;
  if (!enc) throw new Error('no secret');
  const epoch = Math.floor(Date.now() / 1000) + (opts.stepOffset ?? 0) * 30;
  return generate({ secret: decrypt(enc), epoch });
}

/** Creates an admin with 2FA fully enabled and returns a signed in client. */
export async function adminClient() {
  const admin = await makeUser('ADMIN');
  const { c } = await signIn(admin.email!);
  await c.post('/api/account/2fa/setup').send({ currentPassword: PASSWORD });
  await c.post('/api/account/2fa/enable').send({ code: await totpFor(admin.id, { pending: true }) });
  return { c, admin };
}
