import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { client, makeUser, resetDb, signIn, PASSWORD } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { googleEndpoints, setGoogleFetch } from '../src/modules/google.js';
import { totpFor } from './helpers.js';

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as JsonWebKey), kid: 'test-key', alg: 'RS256', use: 'sig' };

function idToken(claims: Record<string, unknown>, key = privateKey) {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = enc({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const body = enc({ iss: 'https://accounts.google.com', aud: CLIENT_ID, iat: now, exp: now + 600, email_verified: true, ...claims });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url');
  return `${head}.${body}.${sig}`;
}

/** Fakes Google: the token endpoint returns whatever ID token the test prepared. */
let nextClaims: Record<string, unknown> = {};
let nextKey = privateKey;
let lastTokenRequest: URLSearchParams | null = null;
function fakeGoogle(nonce: () => string) {
  setGoogleFetch(async (url, init) => {
    if (url === googleEndpoints.jwks) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=60' } });
    if (url === googleEndpoints.token) {
      lastTokenRequest = new URLSearchParams(String(init?.body));
      return new Response(JSON.stringify({ id_token: idToken({ nonce: nonce(), ...nextClaims }, nextKey) }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('not found', { status: 404 });
  });
}

/** Runs the browser side: start, read state and nonce from the redirect, then call back. */
async function googleFlow(c = client(), query = 'intent=login', callback?: (state: string) => string) {
  const start = await c.get(`/api/auth/google/start?${query}`);
  expect(start.status).toBe(302);
  const loc = new URL(start.headers.location);
  if (loc.origin !== 'https://accounts.google.com') return { c, start, end: start };
  const state = loc.searchParams.get('state')!;
  currentNonce = loc.searchParams.get('nonce')!;
  const end = await c.get(callback ? callback(state) : `/api/auth/google/callback?code=fake-code&state=${state}`);
  return { c, start, loc, end };
}
let currentNonce = '';

beforeEach(async () => {
  await resetDb();
  nextClaims = {};
  nextKey = privateKey;
  fakeGoogle(() => currentNonce);
});
afterEach(() => setGoogleFetch(null));

describe('Google sign in', () => {
  it('uses the real site address, not localhost, when the hosted site was never given one', async () => {
    const res = await client().get('/api/auth/google/start?intent=login').set('X-Forwarded-Host', 'lead-vest.netlify.app');
    const loc = new URL(res.headers.location);
    expect(loc.searchParams.get('redirect_uri')).toBe('https://lead-vest.netlify.app/api/auth/google/callback');
    const info = await client().get('/api/auth/providers').set('X-Forwarded-Host', 'lead-vest.netlify.app');
    expect(info.body.data.redirectUri).toBe('https://lead-vest.netlify.app/api/auth/google/callback');
  });

  it('reports whether Google sign in is configured', async () => {
    const res = await client().get('/api/auth/providers');
    expect(res.body.data.google).toBe(true);
    expect(res.body.data.redirectUri).toBe('http://localhost:5173/api/auth/google/callback');
  });

  it('sends the browser to Google with PKCE, state and nonce, and keeps the flow in a signed httpOnly cookie', async () => {
    const res = await client().get('/api/auth/google/start?intent=login&next=/account');
    const loc = new URL(res.headers.location);
    expect(loc.origin + loc.pathname).toBe(googleEndpoints.auth);
    expect(loc.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/auth/google/callback');
    expect(loc.searchParams.get('scope')).toBe('openid email profile');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('lvf_google_oauth=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('creates a verified member account on sign up, with consent recorded and the secret never sent to the browser', async () => {
    nextClaims = { sub: 'g-new', email: 'New.Parent@Example.test', name: 'New Parent' };
    const { c, end } = await googleFlow(client(), 'intent=register&next=/account');
    expect(end.headers.location).toBe('http://localhost:5173/sign-in/complete?next=%2Faccount');
    expect(lastTokenRequest!.get('client_secret')).toBe('test-client-secret');
    expect(lastTokenRequest!.get('code_verifier')).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new.parent@example.test' } });
    expect(user.role).toBe('MEMBER');
    expect(user.googleSub).toBe('g-new');
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(await prisma.consentRecord.count({ where: { giverId: user.id, type: 'website_terms' } })).toBe(1);
    const me = await c.get('/api/auth/me');
    expect(me.body.data.user.email).toBe('new.parent@example.test');
    expect(me.body.data.user.googleLinked).toBe(true);
    expect(JSON.stringify(me.body)).not.toContain('g-new');
  });

  it('also creates an account from the sign in button, so there is one simple path', async () => {
    nextClaims = { sub: 'g-unknown', email: 'nobody@example.test' };
    const { end } = await googleFlow();
    expect(end.headers.location).toBe('http://localhost:5173/sign-in/complete');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'nobody@example.test' } });
    expect(user.role).toBe('MEMBER');
  });

  it('signs in a parent whose verified Google email matches, linking the account', async () => {
    const parent = await makeUser('PARENT', { email: 'parent@example.test' });
    nextClaims = { sub: 'g-parent', email: 'parent@example.test' };
    const { c, end } = await googleFlow();
    expect(end.headers.location).toBe('http://localhost:5173/sign-in/complete');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: parent.id } })).googleSub).toBe('g-parent');
    expect((await c.get('/api/auth/me')).body.data.user.id).toBe(parent.id);
  });

  it('never gives administrator access because of a matching email address', async () => {
    await makeUser('ADMIN', { email: 'admin@example.test' });
    nextClaims = { sub: 'g-attacker', email: 'admin@example.test' };
    const { c, end } = await googleFlow();
    expect(end.headers.location).toBe('http://localhost:5173/sign-in?error=google_link_required');
    expect((await c.get('/api/auth/me')).body.data.user).toBeNull();
    expect(await prisma.user.count({ where: { googleSub: 'g-attacker' } })).toBe(0);
  });

  it('still asks a linked administrator for their two factor code', async () => {
    const admin = await makeUser('ADMIN', { email: 'boss@example.test' });
    const { c: s } = await signIn(admin.email!);
    await s.post('/api/account/2fa/setup').send({ currentPassword: PASSWORD });
    await s.post('/api/account/2fa/enable').send({ code: await totpFor(admin.id, { pending: true }) });
    await prisma.user.update({ where: { id: admin.id }, data: { googleSub: 'g-admin' } });
    nextClaims = { sub: 'g-admin', email: 'boss@example.test' };
    const { c, end } = await googleFlow();
    expect(end.headers.location).toBe('http://localhost:5173/sign-in/verify');
    const me = await c.get('/api/auth/me');
    expect(me.body.data?.user ?? null).toBeNull();
    expect((await c.get('/api/admin/overview')).status).not.toBe(200);
  });

  it('rejects unverified emails, forged signatures, wrong audiences, wrong nonces and replayed state', async () => {
    await makeUser('PARENT', { email: 'p@example.test' });
    nextClaims = { sub: 'g1', email: 'p@example.test', email_verified: false };
    expect((await googleFlow()).end.headers.location).toContain('error=google_unverified');

    nextClaims = { sub: 'g1', email: 'p@example.test' };
    nextKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    expect((await googleFlow()).end.headers.location).toContain('error=google_failed');
    nextKey = privateKey;

    nextClaims = { sub: 'g1', email: 'p@example.test', aud: 'someone-else' };
    expect((await googleFlow()).end.headers.location).toContain('error=google_failed');

    nextClaims = { sub: 'g1', email: 'p@example.test', nonce: 'wrong' };
    expect((await googleFlow()).end.headers.location).toContain('error=google_failed');

    nextClaims = { sub: 'g1', email: 'p@example.test' };
    const tampered = await googleFlow(client(), 'intent=login', (state) => `/api/auth/google/callback?code=x&state=${state}x`);
    expect(tampered.end.headers.location).toContain('error=google_expired');

    // Without the flow cookie (another browser) the callback is refused.
    const started = await client().get('/api/auth/google/start?intent=login');
    const state = new URL(started.headers.location).searchParams.get('state');
    const other = await client().get(`/api/auth/google/callback?code=x&state=${state}`);
    expect(other.headers.location).toContain('error=google_expired');
    expect(await prisma.user.count({ where: { googleSub: 'g1' } })).toBe(0);
  });

  it('only follows next paths on this site', async () => {
    const parent = await makeUser('PARENT', { email: 'n@example.test' });
    nextClaims = { sub: 'g-n', email: parent.email };
    const { end } = await googleFlow(client(), `intent=login&next=${encodeURIComponent('//evil.example/x')}`);
    expect(end.headers.location).toBe('http://localhost:5173/sign-in/complete');
  });

  it('links and unlinks Google from security settings for a signed in user', async () => {
    const instructor = await makeUser('INSTRUCTOR', { email: 'teach@example.test' });
    const { c } = await signIn(instructor.email!);
    nextClaims = { sub: 'g-teach', email: 'personal@gmail.example' };
    const { end } = await googleFlow(c, 'intent=link');
    expect(end.headers.location).toBe('http://localhost:5173/settings/security?google=linked');
    expect((await prisma.user.findUniqueOrThrow({ where: { id: instructor.id } })).googleSub).toBe('g-teach');
    // The same Google account cannot be linked to a second user.
    const other = await makeUser('PARENT');
    const { c: c2 } = await signIn(other.email!);
    const again = await googleFlow(c2, 'intent=link');
    expect(again.end.headers.location).toContain('error=google_in_use');
    const un = await c.post('/api/account/google/unlink');
    expect(un.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: instructor.id } })).googleSub).toBeNull();
  });

  it('refuses to link without a signed in session', async () => {
    const res = await client().get('/api/auth/google/start?intent=link');
    expect(res.headers.location).toBe('http://localhost:5173/sign-in?error=google_signin_first');
  });
});
