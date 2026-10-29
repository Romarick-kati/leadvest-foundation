import type { User, UserPreferences } from '@prisma/client';
import { hash, verify } from '@node-rs/argon2';
import { accessState } from '../services/access.js';

// Argon2id with library defaults (memory hard). Parameters are encoded in the hash.
export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (hashValue: string, password: string) => verify(hashValue, password).catch(() => false);

// Used to keep sign in timing similar whether or not an account exists.
let dummyHash: string | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= await hashPassword('not-a-real-password-0');
  await verifyPassword(dummyHash, password);
}

/** The only shape in which a user is returned to its own owner. Never includes secrets. */
export function selfView(user: User, prefs?: UserPreferences | null) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt) || !user.email,
    twoFactorEnabled: Boolean(user.totpEnabledAt),
    googleLinked: Boolean(user.googleSub),
    createdAt: user.createdAt,
    access: accessState(user),
    preferences: prefs
      ? {
          reduceMotion: prefs.reduceMotion,
          textSize: prefs.textSize,
          underlineLinks: prefs.underlineLinks,
          accent: prefs.accent,
          theme: prefs.theme,
          language: prefs.language,
        }
      : null,
  };
}

/** Administrative listing view. Still excludes all authentication material. */
export function adminView(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    twoFactorEnabled: Boolean(user.totpEnabledAt),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    access: { lifetime: user.accessLifetime, until: user.accessUntil, active: accessState(user).active, required: accessState(user).required },
  };
}
