export const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://lvf:lvf_dev_password@localhost:5432/lvf_test',
  APP_ORIGIN: 'http://localhost:5173',
  SESSION_SECRET: 'test_session_secret_0123456789_abcdefghijkl',
  ENCRYPTION_KEY: 'test_encryption_key_0123456789_abcdefghijkl',
  PAYMENTS_MODE: 'mock',
  REQUIRE_ADMIN_2FA: 'true',
  UPLOAD_DIR: 'tmp-test-uploads',
  // Fictional values; Google's endpoints are replaced with local fakes in the tests.
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
};
