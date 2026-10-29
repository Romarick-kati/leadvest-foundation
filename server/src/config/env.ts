import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // Comma separated list of browser origins allowed to call the API.
  APP_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  // Public URL of the frontend, used to build links in emails.
  PUBLIC_APP_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  // lax works when the frontend proxies /api through the same site (recommended).
  // Use none only when the API is on a different site, which also requires HTTPS.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  REQUIRE_ADMIN_2FA: bool(true),
  // Header holding the visitor's address when a platform sets it (Netlify: x-nf-client-connection-ip).
  CLIENT_IP_HEADER: z.string().optional(),
  // Accept requests whose Origin matches the Host they were sent to. Safe when the API is only
  // reachable on the site's own domain (Netlify Functions), and covers deploy previews.
  TRUST_SAME_HOST_ORIGIN: bool(false),
  // Enables the one time /setup page for creating the first administrator without a shell.
  // Works only while no administrator exists. Use a long random value.
  SETUP_TOKEN: z.string().min(24, 'SETUP_TOKEN must be at least 24 characters').optional(),

  // Email. "console" prints messages to the server log for development only.
  EMAIL_TRANSPORT: z.enum(['disabled', 'console', 'smtp', 'resend']).default('console'),
  /** Resend (resend.com): create an API key and verify your sending domain, then set EMAIL_TRANSPORT=resend. */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: bool(false),

  // Payments are off until the foundation approves a provider and configuration.
  // fapshi = mobile money in Cameroon. flutterwave = cards from anywhere in the world (and mobile money). both = offer the two.
  PAYMENTS_MODE: z.enum(['disabled', 'mock', 'fapshi', 'flutterwave', 'both']).default('disabled'),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  // Fapshi (mobile money, Cameroon). Sandbox keys start with FAK_TEST_ and use the test server.
  FAPSHI_API_USER: z.string().optional(),
  FAPSHI_API_KEY: z.string().optional(),
  // The secret typed into the Fapshi dashboard for webhooks. Fapshi sends it in the x-wh-secret header.
  FAPSHI_WEBHOOK_SECRET: z.string().optional(),
  // Flutterwave (cards worldwide, plus mobile money). Test keys contain FLWSECK_TEST.
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  // The "secret hash" typed into Flutterwave's webhook settings. Flutterwave sends it in the verif-hash header.
  FLUTTERWAVE_SECRET_HASH: z.string().optional(),
  // Price for people paying by card from abroad, in US dollars (for example 5 or 4.99). 0 or empty = charge the FCFA price.
  ACCESS_FEE_USD: z.coerce.number().min(0).max(10000).default(0),
  // The access fee in XAF (FCFA). 0 means the platform is free. Minimum is 100 (Fapshi's minimum).
  ACCESS_FEE_XAF: z.coerce.number().int().min(0).max(10_000_000).default(0),
  // How long one payment lasts, in days. 0 means one payment gives access for good.
  ACCESS_PERIOD_DAYS: z.coerce.number().int().min(0).max(3650).default(30),
  DONATIONS_ENABLED: bool(false),

  // local: files on disk under UPLOAD_DIR. netlify-blobs: Netlify Blobs (used on Netlify, where
  // the function filesystem does not persist).
  STORAGE_DRIVER: z.enum(['local', 'netlify-blobs']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  // Google sign in (OpenID Connect). Both values come from Google Cloud Console > APIs and
  // Services > Credentials > OAuth client ID (type: Web application). The secret stays on the server.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Defaults to <PUBLIC_APP_URL>/api/auth/google/callback. Must match an authorised redirect URI.
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

// Netlify DB (Neon) provides NETLIFY_DATABASE_URL; use it when DATABASE_URL is not set.
if (!process.env.DATABASE_URL && process.env.NETLIFY_DATABASE_URL) process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
for (const key of ['RESEND_API_KEY', 'FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_SECRET_HASH', 'ACCESS_FEE_USD', 'FAPSHI_API_USER', 'FAPSHI_API_KEY', 'FAPSHI_WEBHOOK_SECRET', 'ACCESS_FEE_XAF', 'ACCESS_PERIOD_DAYS', 'SETUP_TOKEN', 'CLIENT_IP_HEADER', 'PUBLIC_APP_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'] as const) if (process.env[key] === '') delete process.env[key];

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Only variable names and problems are printed, never values.
  console.error('Invalid server configuration:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const raw = parsed.data;

if (raw.ACCESS_FEE_XAF > 0 && raw.ACCESS_FEE_XAF < 100) {
  console.error('ACCESS_FEE_XAF must be 0 (free) or at least 100, which is the smallest amount Fapshi accepts.');
  process.exit(1);
}
if ((raw.PAYMENTS_MODE === 'fapshi' || raw.PAYMENTS_MODE === 'both') && (!raw.FAPSHI_API_USER || !raw.FAPSHI_API_KEY)) {
  console.error('PAYMENTS_MODE=fapshi (or both) needs FAPSHI_API_USER and FAPSHI_API_KEY.');
  process.exit(1);
}
if ((raw.PAYMENTS_MODE === 'flutterwave' || raw.PAYMENTS_MODE === 'both') && !raw.FLUTTERWAVE_SECRET_KEY) {
  console.error('PAYMENTS_MODE=flutterwave (or both) needs FLUTTERWAVE_SECRET_KEY.');
  process.exit(1);
}

if (raw.NODE_ENV === 'production') {
  if (raw.PAYMENTS_MODE === 'mock') {
    console.error('PAYMENTS_MODE=mock is not allowed in production.');
    process.exit(1);
  }
  if (raw.EMAIL_TRANSPORT === 'console') {
    console.warn('EMAIL_TRANSPORT=console in production: emails will not be delivered.');
  }
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  allowedOrigins: raw.APP_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  publicAppUrl: (raw.PUBLIC_APP_URL ?? raw.APP_ORIGIN.split(',')[0]).replace(/\/$/, ''),
  googleEnabled: Boolean(raw.GOOGLE_CLIENT_ID && raw.GOOGLE_CLIENT_SECRET),
  /** Which payment providers are switched on, in the order they are offered. */
  get paymentProviders(): string[] {
    const m = this.PAYMENTS_MODE;
    return m === 'both' ? ['fapshi', 'flutterwave'] : m === 'disabled' ? [] : [m];
  },
};
