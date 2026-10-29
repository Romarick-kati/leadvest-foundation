import pino from 'pino';
import { env } from '../config/env.js';

// Redact anything that could carry credentials, codes or tokens.
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.code',
      '*.recoveryCode',
      '*.token',
      '*.secret',
    ],
    censor: '[redacted]',
  },
});
