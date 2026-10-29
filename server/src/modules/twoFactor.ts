import crypto from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { decrypt, encrypt, keyedHash } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';

const ISSUER = 'Lead Vest Foundation';
const RECOVERY_CODE_COUNT = 10;

export async function beginSetup(user: User) {
  const secret = generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecretEnc: encrypt(secret) } });
  const otpauthUrl = generateURI({ issuer: ISSUER, label: user.email ?? user.username ?? user.id, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
  return { otpauthUrl, qrDataUrl, manualKey: secret.match(/.{1,4}/g)!.join(' ') };
}

function normalizeCode(code: string) {
  return code.replace(/\s+/g, '');
}

async function checkTotp(secret: string, code: string, afterTimeStep?: number | null) {
  const token = normalizeCode(code);
  if (!/^\d{6}$/.test(token)) return null;
  // epochTolerance 30s allows one step of clock drift either side.
  const result = await verify({
    secret,
    token,
    epochTolerance: 30,
    ...(afterTimeStep != null ? { afterTimeStep } : {}),
  });
  return result.valid && 'timeStep' in result ? result.timeStep : null;
}

/**
 * Decrypts a stored 2FA secret. If ENCRYPTION_KEY was changed after the secret was saved, the data
 * cannot be read: that is logged for the site owner and treated as "no valid secret" so the
 * person sees a normal "code did not work" message (and can use a recovery code) instead of a
 * server error.
 */
function readSecret(enc: string, userId: string): string | null {
  try {
    return decrypt(enc);
  } catch {
    logger.error({ userId }, 'Could not decrypt a stored two factor secret. ENCRYPTION_KEY has probably changed since it was saved.');
    return null;
  }
}

/** Enables 2FA only after a valid code for the pending secret. Returns new recovery codes once. */
export async function confirmSetup(user: User, code: string) {
  if (!user.totpPendingSecretEnc) return null;
  const secret = readSecret(user.totpPendingSecretEnc, user.id);
  if (!secret) return null;
  const step = await checkTotp(secret, code);
  if (step == null) return null;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecretEnc: user.totpPendingSecretEnc,
      totpPendingSecretEnc: null,
      totpEnabledAt: new Date(),
      totpLastTimeStep: step,
    },
  });
  return generateRecoveryCodes(user.id);
}

/** Verifies a code for an enabled account, with replay protection on the time step. */
export async function verifyTotp(user: User, code: string): Promise<boolean> {
  if (!user.totpSecretEnc) return false;
  const secret = readSecret(user.totpSecretEnc, user.id);
  if (!secret) return false;
  const step = await checkTotp(secret, code, user.totpLastTimeStep);
  if (step == null) return false;
  // Conditional update so two concurrent requests cannot both use the same code.
  const updated = await prisma.user.updateMany({
    where: { id: user.id, OR: [{ totpLastTimeStep: null }, { totpLastTimeStep: { lt: step } }] },
    data: { totpLastTimeStep: step },
  });
  return updated.count === 1;
}

function formatRecoveryCode() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

const normalizeRecovery = (code: string) => code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export async function generateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, formatRecoveryCode);
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({
      data: codes.map((c) => ({ userId, codeHash: keyedHash(normalizeRecovery(c)) })),
    }),
  ]);
  return codes;
}

export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const codeHash = keyedHash(normalizeRecovery(code));
  const result = await prisma.recoveryCode.updateMany({
    where: { userId, codeHash, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

export async function remainingRecoveryCodes(userId: string) {
  return prisma.recoveryCode.count({ where: { userId, usedAt: null } });
}

/** Accepts either an authenticator code or an unused recovery code. */
export async function verifySecondFactor(user: User, input: { code?: string; recoveryCode?: string }) {
  if (input.code) return { ok: await verifyTotp(user, input.code), usedRecovery: false };
  if (input.recoveryCode) return { ok: await consumeRecoveryCode(user.id, input.recoveryCode), usedRecovery: true };
  return { ok: false, usedRecovery: false };
}

export async function disableTwoFactor(userId: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { totpSecretEnc: null, totpPendingSecretEnc: null, totpEnabledAt: null, totpLastTimeStep: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
  ]);
}
