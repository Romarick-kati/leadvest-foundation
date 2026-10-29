import { clientIp } from './http.js';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

/** Records a sensitive action. Never pass passwords, codes, tokens or unneeded personal data. */
export async function audit(
  req: Request,
  action: string,
  target?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req.auth?.user.id ?? null,
        action,
        targetType: target?.type,
        targetId: target?.id,
        metadata: metadata as Prisma.InputJsonValue,
        ipAddress: clientIp(req),
      },
    });
  } catch (err) {
    logger.error({ err, action }, 'audit log write failed');
  }
}

export async function securityEvent(req: Request, userId: string, type: string) {
  await prisma.securityEvent.create({
    data: { userId, type, ipAddress: clientIp(req), userAgent: req.get('user-agent')?.slice(0, 300) },
  });
}
