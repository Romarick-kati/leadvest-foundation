import crypto from 'node:crypto';

/**
 * Google sign in using OpenID Connect (authorisation code flow with PKCE). The ID token is
 * verified on the server: RS256 signature against Google's published keys, issuer, audience,
 * expiry and nonce. Nothing from the browser is trusted without that check.
 */
export const googleEndpoints = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  jwks: 'https://www.googleapis.com/oauth2/v3/certs',
};
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const CLOCK_SKEW_S = 60;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
let fetchImpl: FetchLike = (url, init) => fetch(url, init);
/** Tests replace Google's endpoints with local fakes. */
export function setGoogleFetch(f: FetchLike | null) {
  fetchImpl = f ?? ((url, init) => fetch(url, init));
  jwksCache = null;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export const pkceChallenge = (verifier: string) => crypto.createHash('sha256').update(verifier).digest('base64url');

export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string; verifier: string }) {
  const url = new URL(googleEndpoints.auth);
  url.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: p.state,
    nonce: p.nonce,
    code_challenge: pkceChallenge(p.verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

/** Exchanges the authorisation code for tokens. Returns the raw ID token. */
export async function exchangeCode(p: { code: string; clientId: string; clientSecret: string; redirectUri: string; verifier: string }) {
  const res = await fetchImpl(googleEndpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      code: p.code,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      redirect_uri: p.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: p.verifier,
    }).toString(),
  });
  if (!res.ok) throw new Error(`token_exchange_${res.status}`);
  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) throw new Error('no_id_token');
  return body.id_token;
}

let jwksCache: { keys: (JsonWebKey & { kid?: string })[]; expires: number } | null = null;

async function signingKey(kid: string) {
  const fresh = jwksCache && jwksCache.expires > Date.now();
  let key = fresh ? jwksCache!.keys.find((k) => k.kid === kid) : undefined;
  if (!key) {
    // Keys rotate: refetch when the cache is old or the key id is unknown.
    const res = await fetchImpl(googleEndpoints.jwks, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('jwks_unavailable');
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
    const body = (await res.json()) as { keys: (JsonWebKey & { kid?: string })[] };
    jwksCache = { keys: body.keys ?? [], expires: Date.now() + Math.min(maxAge, 86400) * 1000 };
    key = jwksCache.keys.find((k) => k.kid === kid);
  }
  if (!key) throw new Error('unknown_key');
  return crypto.createPublicKey({ key, format: 'jwk' });
}

const decodePart = <T>(part: string): T => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;

export async function verifyIdToken(idToken: string, opts: { clientId: string; nonce: string; now?: number }): Promise<GoogleIdentity> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('malformed_token');
  const [h, p, s] = parts;
  const header = decodePart<{ alg?: string; kid?: string }>(h);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('unsupported_token');
  const key = await signingKey(header.kid);
  const valid = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'));
  if (!valid) throw new Error('bad_signature');

  const claims = decodePart<{ iss?: string; aud?: string | string[]; exp?: number; iat?: number; nonce?: string; sub?: string; email?: string; email_verified?: boolean | string; name?: string }>(p);
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (!claims.iss || !ISSUERS.includes(claims.iss)) throw new Error('bad_issuer');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(opts.clientId)) throw new Error('bad_audience');
  if (!claims.exp || claims.exp + CLOCK_SKEW_S < now) throw new Error('expired');
  if (claims.iat && claims.iat - CLOCK_SKEW_S > now) throw new Error('issued_in_future');
  if (!claims.nonce || claims.nonce !== opts.nonce) throw new Error('bad_nonce');
  if (!claims.sub || !claims.email) throw new Error('missing_claims');
  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name?.trim().slice(0, 80) || null,
  };
}
