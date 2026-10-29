import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, h, send } from '../lib/http.js';
import { safeEqual } from '../lib/crypto.js';
import { emailSchema, nameSchema, parse, passwordSchema } from '../lib/validate.js';
import { audit } from '../lib/audit.js';
import { authLimiter } from '../middleware/security.js';
import { hashPassword } from './users.js';

/**
 * One time creation of the first administrator for hosts without a shell (Netlify).
 * Needs SETUP_TOKEN, which only the person deploying knows, and stops working for good
 * once any administrator exists. The new administrator must still turn on two factor
 * authentication before the dashboard opens.
 */
export const setupRouter = Router();

const adminExists = async () => (await prisma.user.count({ where: { role: 'ADMIN' } })) > 0;

setupRouter.get(
  '/status',
  h(async (_req, res) => {
    send(res, { available: Boolean(env.SETUP_TOKEN) && !(await adminExists()) });
  }),
);

setupRouter.post(
  '/first-admin',
  authLimiter,
  h(async (req, res) => {
    const body = parse(
      z.object({ token: z.string().min(1, 'Enter the setup key.').max(500), displayName: nameSchema, email: emailSchema, password: passwordSchema }),
      req.body,
    );
    if (!env.SETUP_TOKEN || !safeEqual(body.token, env.SETUP_TOKEN)) {
      throw new ApiError(403, 'bad_setup_token', 'That setup key is not right.');
    }
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.$transaction(
      async (tx) => {
        if ((await tx.user.count({ where: { role: 'ADMIN' } })) > 0) return null;
        if (await tx.user.findUnique({ where: { email: body.email } })) {
          throw new ApiError(409, 'email_in_use', 'An account with this email already exists.');
        }
        return tx.user.create({
          data: {
            email: body.email,
            displayName: body.displayName,
            role: 'ADMIN',
            passwordHash,
            // The person holds the deployment's setup key, so the address is accepted as given.
            emailVerifiedAt: new Date(),
            preferences: { create: {} },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    if (!user) throw new ApiError(410, 'setup_closed', 'Setup is already complete. Sign in instead.');
    await audit(req, 'user.created_by_setup', { type: 'user', id: user.id }, { role: 'ADMIN' });
    send(res, { created: true }, 201);
  }),
);
