import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { readStored } from './lib/uploads.js';
import { loadSession } from './middleware/session.js';
import { apiLimiter, csrfGuard } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './modules/auth.routes.js';
import { googleRouter } from './modules/google.routes.js';
import { accountRouter } from './modules/account.routes.js';
import { guardianRouter } from './modules/guardian.routes.js';
import { publicRouter } from './modules/public.routes.js';
import { seoRouter } from './modules/seo.routes.js';
import { learningRouter } from './modules/learning.routes.js';
import { enquiriesRouter } from './modules/enquiries.routes.js';
import { registrationsRouter } from './modules/registrations.routes.js';
import { paymentsRouter, webhookRouter } from './modules/payments.routes.js';
import { instructorRouter } from './modules/instructor.routes.js';
import { adminRouter } from './modules/admin/index.js';
import { setupRouter } from './modules/setup.routes.js';

const FUNCTION_PREFIX = '/.netlify/functions/api';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // On Netlify the function may see its own path; map it back to the public one.
  app.use((req, _res, next) => {
    if (req.url.startsWith(FUNCTION_PREFIX)) req.url = req.url.slice(FUNCTION_PREFIX.length) || '/';
    next();
  });
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      // The API serves JSON only; the frontend sets its own policy (see client netlify.toml).
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], imgSrc: ["'self'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.allowedOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req: { url?: string }) => req.url === '/api/health' } }));
  }

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  // Webhooks need the raw body and come from providers, not browsers, so they skip CSRF checks.
  app.use('/api/payments/webhooks', webhookRouter);

  // Public images. Names are random, so they can be cached for a long time.
  app.get('/uploads/:folder/:file', async (req, res, next) => {
    try {
      const file = await readStored(`${req.params.folder}/${req.params.file}`, 'public');
      if (!file) return res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.send(file.body);
    } catch (e) {
      next(e);
    }
  });

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter, csrfGuard, loadSession);

  app.use('/api/auth', googleRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/guardian', guardianRouter);
  app.use('/api/learning', learningRouter);
  app.use('/api/enquiries', enquiriesRouter);
  app.use('/api/registrations', registrationsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/instructor', instructorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/setup', setupRouter);
  app.use('/api', publicRouter);
  app.use('/api', seoRouter);

  app.use('/api', notFoundHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const uploadsPath = path.resolve(env.UPLOAD_DIR);
