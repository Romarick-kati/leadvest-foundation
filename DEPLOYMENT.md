# Deployment

There are two supported ways to host the site:

| | Website | API | Database | Uploads |
| --- | --- | --- | --- | --- |
| **1. All on Netlify** (simplest, see [NETLIFY.md](NETLIFY.md)) | Netlify | Netlify Function | Neon or Netlify DB | Netlify Blobs |
| **2. Netlify plus an API host** (this guide) | Netlify | Render, Railway, Fly.io or a VPS | Managed PostgreSQL | Persistent disk |

Option 1 is the quickest start. Option 2 suits heavier use: a long running server keeps rate limits in one place, has no cold starts, and has no 6 MB request limit.

Either way the browser only calls `/api` on the site's own domain, so the sign in cookie stays first party. The build (`scripts/netlify-build.mjs`) picks the mode: with `API_ORIGIN` set it proxies to your API host, with `DATABASE_URL` set it runs the API as a function, and with neither it deploys a clearly labelled preview.

The rest of this guide covers option 2.

```
Browser ──> https://www.your-domain.example (Netlify)
              ├── /            static site
              ├── /api/*   ──> https://api.your-domain.example/api/*   (Node API)
              └── /uploads/* ─> https://api.your-domain.example/uploads/*
                                         └── PostgreSQL
```

## 1. Database

Create a managed PostgreSQL 14+ database with automatic daily backups and point in time recovery if available. Note its connection string for `DATABASE_URL` (require TLS, usually `?sslmode=require`).

## 2. API host

Settings (names vary by provider):

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `npm ci && npm run build --workspace server` |
| Start command | `npm run db:deploy --workspace server && npm run start --workspace server` |
| Health check path | `/api/health` |
| Node version | 22 |

Environment variables (see `server/.env.example` for every option):

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the database connection string |
| `APP_ORIGIN` | the public site address, for example `https://www.your-domain.example` (comma separate if you also use the Netlify subdomain) |
| `PUBLIC_APP_URL` | the main public site address, used in email links |
| `SESSION_SECRET` | new random value, 32+ characters |
| `ENCRYPTION_KEY` | different random value, 32+ characters. **Back it up.** Losing or changing it disables every enrolled authenticator. |
| `TRUST_PROXY` | number of proxies in front of the API. Netlify plus the host's load balancer is usually `2`. Check that rate limiting sees real client addresses. |
| `COOKIE_SAMESITE` | `lax` |
| `REQUIRE_ADMIN_2FA` | `true` |
| `EMAIL_TRANSPORT` | `smtp` once an email provider is set up, otherwise `disabled` |
| `EMAIL_FROM`, `SMTP_*` | from the email provider |
| `PAYMENTS_MODE` | `disabled` (the API refuses `mock` in production) |
| `UPLOAD_DIR` | a path on a **persistent disk**. Most platforms wipe the local filesystem on each deploy. |

In production the cookie is named `__Host-lvf_session` and is always `Secure`, so the site must be served over HTTPS.

Uploaded files: public images are served from `UPLOAD_DIR/public`, and images an administrator marks private from `UPLOAD_DIR/private`, which is only reachable through an authenticated admin endpoint. Include the upload disk in backups.

## 3. Netlify

1. Create a site from the repository. `netlify.toml` at the root sets the build command (`node scripts/netlify-build.mjs`) and publish folder (`client/dist`).
2. In Site configuration > Environment variables, add `API_ORIGIN` = the API's https origin, for example `https://api.your-domain.example` (no path, no trailing slash). Do not set `DATABASE_URL` on Netlify in this setup; the database belongs to the API host.
3. Do not set `VITE_API_BASE_URL` unless you deliberately want the browser to call the API on another domain.
4. Add the custom domain and enable HTTPS.

`netlify.toml` also sets security headers: a strict Content Security Policy (scripts, fonts and connections from the site itself only), HSTS, no framing, no camera, microphone or location access, and long caching for hashed assets. The CSP was checked against the production build with no violations. If you add an external service (analytics, maps, video embeds), the CSP must be updated deliberately, and anything that tracks visitors needs the foundation's approval and is not allowed in the learning area.

## 4. First administrator

On the API host's shell:

```bash
npm run create-admin:prod --workspace server -- --email person@example.org --name "Full Name"
```

Open the printed link within one hour, choose a password, sign in, and set up two factor authentication. Store the recovery codes somewhere safe and offline.

If the host has no shell, set `SETUP_TOKEN` (24+ random characters) on the API host and use the one time `/setup` page instead, as described in NETLIFY.md step 4. It stops working once an administrator exists.

Do **not** run the seed script in production. It refuses to run when `NODE_ENV=production`.

## 5. Email

Pick a transactional email provider (for example Postmark, Mailgun, Amazon SES, Brevo, or the foundation's own SMTP), verify the sending domain with SPF, DKIM and DMARC, and set `EMAIL_TRANSPORT=smtp` with the `SMTP_*` values. Then test: registration verification, password reset, enquiry acknowledgement, and the security alert after a password change. The dashboard shows "Email delivery is not connected" until email is configured, and the interface never claims an email was sent when it was not.

## 6. Payments (not active)

Payments and donations are switched off. The code has a provider interface (`server/src/services/payments/`) with a development only simulated provider. Before any live payment:

1. The foundation confirms the legal entity, receiving account, provider, currency, and donation and refund terms.
2. A real provider adapter is written against `PaymentProvider` (hosted checkout only, so card details never touch this server), with webhook signature verification.
3. Refund, terms and privacy pages are approved and published.
4. End to end testing in the provider's test mode, including webhook retries and failures.

An order is only marked paid from a verified provider webhook, never from the browser reaching a success page.

## 7. After deploying

Work through the production readiness checklist in [PROJECT_STATUS.md](PROJECT_STATUS.md#production-readiness-checklist).
