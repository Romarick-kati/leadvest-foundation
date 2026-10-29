import type { Request } from 'express';
import { env } from '../config/env.js';

const isLocal = (u: string) => /^(https?:\/\/)?(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(u);

/**
 * The address people actually use to reach the site. Normally this is PUBLIC_APP_URL. If that is
 * still the local development address but the request came in on a real domain (a hosted site
 * whose address was never configured), the real domain is used, so return addresses for Google
 * and payments point at the live site instead of localhost.
 */
export function siteUrl(req: Request): string {
  if (!isLocal(env.publicAppUrl)) return env.publicAppUrl;
  const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0].trim();
  if (!host || isLocal(host)) return env.publicAppUrl;
  return `https://${host}`;
}
