/**
 * Creates the first administrator safely. Running it again changes nothing for an existing
 * administrator except, when no password is supplied, issuing a fresh setup link.
 *
 *   npm run create-admin -- --email person@example.org --name "Full Name"
 *
 * Or from environment variables (useful on hosts that run a release command):
 *
 *   ADMIN_EMAIL=person@example.org ADMIN_NAME="Full Name" npm run create-admin
 *   ADMIN_PASSWORD=...  optional; when set the account can sign in straight away
 *
 * There is no default password. A supplied password is stored only as an Argon2id hash and
 * is never printed. Without one, the script prints a single use setup link that expires in
 * one hour. Either way the administrator must turn on two factor authentication before the
 * dashboard opens (when REQUIRE_ADMIN_2FA is true). Remove ADMIN_PASSWORD from the host's
 * environment once the account exists.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { ZodError } from 'zod';
import { prisma } from '../lib/prisma.js';
import { bootstrapAdmin } from '../modules/adminBootstrap.js';

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
const email = values.email ?? process.env.ADMIN_EMAIL;
const name = values.name ?? process.env.ADMIN_NAME;

if (!email || !name) {
  console.error('Usage: npm run create-admin -- --email person@example.org --name "Full Name"');
  console.error('   or: set ADMIN_EMAIL and ADMIN_NAME (and optionally ADMIN_PASSWORD), then npm run create-admin');
  process.exit(1);
}

try {
  const result = await bootstrapAdmin({ email, name, password: process.env.ADMIN_PASSWORD }, { promoteExisting: true });
  if (result.outcome === 'conflict') {
    console.error('An account with that email exists but cannot be upgraded automatically (only normal sign-up accounts can). Change its role from an existing admin account instead.');
    process.exitCode = 1;
  } else {
    console.log(
      result.outcome === 'created' ? 'Administrator created.' : result.outcome === 'promoted' ? 'Existing account upgraded to administrator.' : 'Administrator already exists. Nothing was changed.',
    );
    if (result.setupLink) {
      console.log('\nOpen this link within one hour to choose the administrator password:\n');
      console.log(`  ${result.setupLink}\n`);
      console.log('Treat this link like a password. It works once.\n');
    } else if (result.outcome === 'created' || result.outcome === 'promoted') {
      console.log('The password from ADMIN_PASSWORD was saved as a hash. Remove ADMIN_PASSWORD from the environment now.');
    }
  }
} catch (err) {
  if (err instanceof ZodError) {
    // Field names only: the values (including any password) are never printed.
    console.error('Please check: ' + err.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', '));
    process.exitCode = 1;
  } else throw err;
} finally {
  await prisma.$disconnect();
}
