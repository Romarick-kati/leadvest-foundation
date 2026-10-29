import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { cleanupExpired } from './lib/maintenance.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`Lead Vest Foundation API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Remove expired sessions and tokens once an hour.
const cleanup = setInterval(() => void cleanupExpired().catch(() => undefined), 60 * 60 * 1000);

function shutdown() {
  clearInterval(cleanup);
  server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
