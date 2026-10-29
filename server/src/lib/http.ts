import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, 'bad_request', message, fields);
export const unauthorized = (message = 'Please sign in to continue.') => new ApiError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have permission to do that.') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new ApiError(404, 'not_found', message);
export const conflict = (message: string) => new ApiError(409, 'conflict', message);

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route so rejected promises reach the error handler. */
export const h =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** The visitor's address: from the platform header when configured, otherwise Express (trust proxy aware). */
export function clientIp(req: Request): string | undefined {
  if (env.CLIENT_IP_HEADER) {
    const v = req.get(env.CLIENT_IP_HEADER)?.split(',')[0]?.trim();
    if (v) return v;
  }
  return req.ip;
}

export function send<T>(res: Response, data: T, status = 200) {
  res.status(status).json({ data });
}

export function paginate(query: Record<string, unknown>, maxPageSize = 50) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Number.parseInt(String(query.pageSize ?? '20'), 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
