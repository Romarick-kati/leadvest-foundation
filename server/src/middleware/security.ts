import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError, clientIp } from '../lib/http.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie sessions: state changing requests must carry the custom
 * X-Requested-With header (which a cross site form cannot send without passing CORS),
 * and any Origin header present must be on the allow list.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.allowedOrigins.includes(origin) && !sameHost(req, origin)) {
    return next(new ApiError(403, 'bad_origin', 'Request origin is not allowed.'));
  }
  if (req.get('x-requested-with') !== 'lvf-web') {
    return next(new ApiError(403, 'csrf', 'Missing request header.'));
  }
  next();
}

/** True when TRUST_SAME_HOST_ORIGIN is on and the Origin is the site the request was sent to. */
function sameHost(req: Request, origin: string) {
  if (!env.TRUST_SAME_HOST_ORIGIN) return false;
  try {
    // A browser cannot set either header on a cross site request (no CORS approval for them).
    const hosts = [req.get('x-forwarded-host'), req.get('host')].filter(Boolean);
    const url = new URL(origin);
    return url.protocol === 'https:' && hosts.includes(url.host);
  } catch {
    return false;
  }
}

// Requests are counted per visitor address (IPv6 grouped by network, as the library recommends).
const byClient = (req: Request) => ipKeyGenerator(clientIp(req) ?? 'unknown');

const json429 = (message: string) => ({
  error: { code: 'rate_limited', message },
});

const limiter = (windowMs: number, limit: number, message: string, keyGenerator?: (req: Request) => string) =>
  rateLimit({
    windowMs,
    limit: env.isTest ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: json429(message),
    keyGenerator: keyGenerator ?? byClient,
    // Addresses come from clientIp(), which already applies CLIENT_IP_HEADER and trust proxy.
    validate: { trustProxy: false, xForwardedForHeader: false },
  });

// Note: the default in memory store is per process. Use a shared store (for example
// Redis) when running more than one API instance.
export const apiLimiter = limiter(60 * 1000, 300, 'Too many requests. Please slow down.');
export const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many sign in attempts. Please wait a few minutes and try again.');
export const mfaLimiter = limiter(15 * 60 * 1000, 10, 'Too many code attempts. Please wait a few minutes and try again.');
export const formLimiter = limiter(60 * 60 * 1000, 10, 'You have sent several messages recently. Please try again later.');
export const emailLimiter = limiter(60 * 60 * 1000, 5, 'Too many email requests. Please try again later.');
