import { execSync } from 'node:child_process';
import { testEnv } from './testEnv.js';

export default function setup() {
  // Apply pending migrations to the dedicated test database. Each test file truncates tables itself.
  execSync('npx prisma migrate deploy', { env: { ...process.env, ...testEnv }, stdio: 'pipe' });
}
