import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError, forbidden, unauthorized } from '../lib/http.js';

/** Requires a fully signed in user (second factor completed when enabled). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  if (!req.auth.session.mfaVerified) {
    return next(new ApiError(401, 'mfa_required', 'Enter your two factor code to finish signing in.'));
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!roles.includes(req.auth!.user.role)) return next(forbidden());
      next();
    });
  };
}

/** Administrators must have two factor authentication enabled when the policy is on. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireRole('ADMIN')(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (env.REQUIRE_ADMIN_2FA && !req.auth!.user.totpEnabledAt) {
      return next(
        new ApiError(403, 'admin_mfa_required', 'Turn on two factor authentication in Security Settings to use the dashboard.'),
      );
    }
    next();
  });
}

export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction) {
  const user = req.auth?.user;
  if (user && user.email && !user.emailVerifiedAt) {
    return next(new ApiError(403, 'email_unverified', 'Please verify your email address first.'));
  }
  next();
}
