import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ApiError } from '../lib/http.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: { code: 'upload_error', message: 'The file could not be uploaded. Check its size and type.' } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]) : [];
      if (target.includes('slug')) {
        return res.status(409).json({ error: { code: 'conflict', message: 'That web address is already used. Please choose another.', fields: { slug: 'That web address is already used. Please choose another.' } } });
      }
      return res.status(409).json({ error: { code: 'conflict', message: 'That value is already in use.' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
    }
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    return res.status(400).json({ error: { code: 'bad_json', message: 'The request body is not valid JSON.' } });
  }
  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } });
}
