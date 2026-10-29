import type { AuthTokenType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hashToken, randomToken } from '../lib/crypto.js';
import { env } from '../config/env.js';

const LIFETIME: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Issues a single use token, invalidating earlier unused tokens of the same type. */
export async function issueToken(userId: string, type: AuthTokenType) {
  const token = randomToken();
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LIFETIME[type]) },
    }),
  ]);
  return token;
}

/** Atomically consumes a token. Returns the user id or null if invalid, used or expired. */
export async function consumeToken(token: string, type: AuthTokenType): Promise<string | null> {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;
  const res = await prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  return res.count === 1 ? record.userId : null;
}

export const appLink = (path: string, token: string) => `${env.publicAppUrl}${path}?token=${encodeURIComponent(token)}`;
