import { beforeEach, describe, expect, it } from 'vitest';
import { client, makeUser, resetDb } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';
import { bootstrapAdmin } from '../src/modules/adminBootstrap.js';

beforeEach(resetDb);

const password = 'Bootstrap-test-pass-42';

describe('first administrator bootstrap', () => {
  it('creates an administrator with an Argon2id hash and is safe to run again', async () => {
    const first = await bootstrapAdmin({ email: 'Head@Example.test', name: 'Head Admin', password });
    expect(first.outcome).toBe('created');
    expect(first).not.toHaveProperty('setupLink', expect.any(String));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'head@example.test' } });
    expect(user.role).toBe('ADMIN');
    expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(user.passwordHash).not.toContain(password);

    const again = await bootstrapAdmin({ email: 'head@example.test', name: 'Someone Else', password: 'Different-pass-9999' });
    expect(again.outcome).toBe('exists');
    const after = await prisma.user.findUniqueOrThrow({ where: { email: 'head@example.test' } });
    expect(after.passwordHash).toBe(user.passwordHash);
    expect(after.displayName).toBe('Head Admin');
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(1);

    // The password works, and the response never contains a hash or the password.
    const res = await client().post('/api/auth/login').send({ identifier: 'head@example.test', password });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/argon2|Bootstrap-test-pass/);
  });

  it('issues a setup link instead of inventing a password when none is given', async () => {
    const r = await bootstrapAdmin({ email: 'new@example.test', name: 'New Admin' });
    expect(r.outcome).toBe('created');
    expect(r.outcome !== 'conflict' && r.setupLink).toMatch(/\/reset-password\?token=/);
  });

  it('refuses to promote an existing non administrator by email', async () => {
    await makeUser('PARENT', { email: 'parent@example.test' });
    const r = await bootstrapAdmin({ email: 'parent@example.test', name: 'X', password });
    expect(r.outcome).toBe('conflict');
    expect((await prisma.user.findUniqueOrThrow({ where: { email: 'parent@example.test' } })).role).toBe('PARENT');
  });

  it('can upgrade the owner\'s own existing sign-up account, but only when asked to by the command line', async () => {
    const u = await makeUser('MEMBER', { email: 'owner@example.test' });
    const r = await bootstrapAdmin({ email: 'owner@example.test', name: 'Owner', password }, { promoteExisting: true });
    expect(r.outcome).toBe('promoted');
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(stored.role).toBe('ADMIN');
    expect(stored.emailVerifiedAt).not.toBeNull();
    const res = await client().post('/api/auth/login').send({ identifier: 'owner@example.test', password });
    expect(res.status).toBe(200);
    const again = await bootstrapAdmin({ email: 'owner@example.test', name: 'Owner', password: 'Another-pass-99' }, { promoteExisting: true });
    expect(again.outcome).toBe('exists');
  });

  it('rejects a weak password without echoing it', async () => {
    await expect(bootstrapAdmin({ email: 'weak@example.test', name: 'Weak', password: 'short' })).rejects.toThrow();
    expect(await prisma.user.count({ where: { email: 'weak@example.test' } })).toBe(0);
  });
});
