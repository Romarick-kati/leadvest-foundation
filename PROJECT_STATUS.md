# Project status

Last updated: 23 October 2026. This file covers what is built, what was tested, what still needs the foundation, and what must happen before launch.

## Feature status

### Implemented and tested

**Public website**
- Pages: Home, About, Programs (list and detail), Events (list and detail), Parents and families, Get involved, Support our work, Contact, Questions and answers, Privacy, Child safety, Terms, Consent, Not found, and Access denied.
- Every unknown fact is a visible, highlighted placeholder. Draft policies carry a "Draft for review" banner until an administrator publishes an approved version from the dashboard.
- Contact form with category, consent checkbox and spam protection (hidden field and minimum time). No CAPTCHA service is used.
- Event registration with capacity, waitlist and deadline checks, done in a database transaction so places cannot be oversold.

**Learning area**
- Topics, lessons, friendly quizzes and a celebration on completion. Anyone can try lessons. Progress and badges are saved only for signed in learner accounts.
- Quiz answers are checked on the server and never sent to the browser.
- "Bigger words in lessons" learner setting.
- No chat, no messaging, no public profiles, no leaderboards, no advertising, no tracking.

**Accounts and security**
- Parent or guardian self registration, email verification, sign in, sign out, password reset.
- Children's accounts are created only by a guardian (username and password, no email needed), with a recorded consent. A second guardian is linked only after an administrator verifies them.
- **Real two factor authentication (TOTP):** QR code and manual key, confirmed with a live code before it turns on, 10 single use recovery codes, replay protection, regenerate and disable (both need password and a code). Required for administrators before any dashboard page opens.
- Argon2id passwords; account lockout after 10 failed attempts for 15 minutes; rate limiting on sign in, codes, email and forms; CSRF protection; httpOnly session cookies stored only as hashes; session list with "sign out other devices"; security event history; security alert emails.
- All permissions checked on the server. Instructors only see programs assigned to them. Learners cannot change their password, use two factor, opt into marketing, or reach adult areas.

**Settings center:** Profile (with avatar upload), Account (email, password, deactivate), Security, Notifications, Accessibility (text size, reduced motion, always underline links), Privacy (consents, data export, data requests), Learning (learner only), Family (guardian only: add and manage children, progress, consents, second guardian links). Settings that matter for security are stored on the server, not in the browser.

**Administration dashboard:** Overview with live figures, Programs, Events, Learning modules and lessons, Pages and policies, Media, Registrations, Enquiries, Users (invite, roles, status), Instructors and assignments, Guardian checks, Payments (read only status), Reports (CSV export with spreadsheet formula protection), Privacy requests, Site settings (organisation details, contact, social links, branding, feature switches), and Audit log. Works on phones with a slide out menu.

**Design:** White background with blue, navy, sun yellow and mint accents; no yellow text on white; text contrast at least 4.5:1. Self hosted fonts. Motion respects the device's reduced motion setting and an in site "turn animation off" switch. Keyboard accessible with visible focus, skip link and one main heading per page.

**Hosting:** runs entirely on Netlify (website, API as a Netlify Function, images in Netlify Blobs, database on Neon or Netlify DB), or with a separate API host. The build applies database migrations, can add sample content, and deploys a clearly labelled preview when no database is set. Security headers and Content Security Policy in `netlify.toml`. First administrator by command (`create-admin`) or the one time `/setup` page. Guides: NETLIFY.md and DEPLOYMENT.md.

### Partly implemented

| Feature | What exists | What is missing |
| --- | --- | --- |
| Email | Templates, SMTP transport, console transport for development, honest "not delivered" messages | No provider connected or tested. Needs an email account and domain verification. |
| Payments and donations | Provider interface, simulated provider with signed webhooks, idempotency, payment records, admin view | No real provider. Switched off until the foundation approves (see below). |
| Policies | Draft Privacy, Child safety, Terms and Consent pages with placeholders | Legal and safeguarding review and approval by the foundation. |
| Images and logo | Placeholder logo, favicon and illustrations; central registry; dashboard uploads | Official logo and approved photos. |
| Data requests | Users can export their data and submit deletion or correction requests; admins track them | Deletion is handled by an administrator manually, after review, not automatically. |

### Not implemented

- Read aloud for lessons (the setting is stored but hidden in the interface until the feature exists).
- Live payments, donations and receipts.
- Multiple languages (the site is in English only). French may be needed, depending on where the foundation operates.
- Newsletter or mailing list integration.
- Automated end to end tests in the repository (browser checks were run manually with Playwright, see below).
- Malware scanning of uploads (files are type checked by content and SVG is refused).

## Testing

All results below come from runs on 22 and 23 October 2026.

| Check | Result |
| --- | --- |
| Full fix and redesign update (23 October) | Server: **108 passed** (new: Google sign in with a fake Google key set and token endpoint, covering state and nonce checks, replay, unverified email, staff accounts never linked by email, administrators still asked for two factor, linking and unlinking; articles create, publish, edit, delete, validation and admin only access; theme and language preferences; partial edits keeping status; first administrator bootstrap that is idempotent, stores Argon2id hashes, refuses to promote a non administrator and never invents a password). Client: **27 passed** (new: every language has every English key and keeps placeholders, every translation key used in the code exists, cookie consent store). Browser (Playwright, Chromium, local production build with the real API and PostgreSQL): 16 routes at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px (160 loads), no horizontal scrolling, one main heading, no broken images, no script errors; cookie banner accept, reject, customise, persistence and footer link, no third party scripts; language switching to French, Spanish, Portuguese and back, persisted, html lang updated; dark mode toggle, persisted before paint, system preference followed; Google buttons hidden when not configured, correct links when configured, sign up blocked until terms are ticked, error messages shown, server start link refuses honestly when not configured; appearance settings saved to the account; mobile menu and Escape. Lighthouse (simulated slow 4G phone): home performance 82, accessibility 100, best practices 100, layout shift 0, largest contentful paint 3.2 s; resources page 90, 100, 100; desktop home 100. Google sign in against real Google was **not** tested: it needs the foundation's Google Cloud credentials. |
| Server tests (Vitest and Supertest against a real PostgreSQL test database) | **87 passed**. New in the motion update: the public gallery only lists public photos in the gallery folder that have alt text, and impact figures are empty by default, reject blank labels and more than six figures, and appear publicly once saved. New in the redesign: public content cache headers (shared only when no cookie is set, never on private or failed responses), WhatsApp number validation, older saved settings gaining the new contact fields, and the website feedback enquiry category. Also They cover the one time setup page, same site checks on Netlify, image serving (public and private), the Netlify Function entry, registration, sign in, lockout, CSRF, email verification, password reset, two factor enrolment, sign in, replay, recovery codes, disable and regenerate, guardian controls, learner restrictions, child data never exposed publicly, instructor scope, admin access, event capacity and waitlist, simulated payments and webhooks, enquiries, settings, and learning. |
| Client tests (Vitest and Testing Library) | **18 passed**. Route guard redirects for each role, safe redirect after sign in, Markdown rendering without HTML injection, money formatting, WhatsApp link format, and social network detection from profile addresses. |
| Motion, counters, carousel, gallery and menus (Playwright, 23 October) | 17 public routes at 320, 375, 390, 430, 768, 1024, 1440 and 1920 px, at the top and after scrolling (136 loads): no horizontal scrolling, one main heading, no content left hidden. Nothing on the first screen waits for an animation; 14 home sections reveal on scroll; with reduced motion nothing is hidden and parallax is off. Impact band hidden with no figures; with test figures the counters run and screen readers get the final values. Carousel: previous starts disabled, next and previous move one card, arrow keys work, pause and play work, no automatic slides with reduced motion. Gallery: placeholder until photos exist; the viewer opens on the chosen photo, arrow keys wrap, Escape returns focus. Desktop menus open by keyboard and hover, Escape returns focus, close on navigation. 30 dashboard loads at 5 widths; an impact figure entered in Settings appeared on the home page, then was removed. No script errors. |
| Photos and moving content (Playwright, 23 October) | 12 public routes at 8 widths (96 loads): no horizontal scrolling, one main heading, no broken images, no script errors. The photo strip moves, pauses with its button (aria-pressed) and on hover or focus, and its second copy is hidden from screen readers. With reduced motion the strip is a plain scrollable row and parallax is off. Lighthouse phone: performance 80 to 84, accessibility 100, layout shift 0, largest contentful paint 3.2 s (2.9 to 3.0 s before the photos); desktop performance 99, 0.8 s. |
| TypeScript and production builds | Client and server pass with no errors. |
| Responsive check (Playwright, Chromium) | 26 public routes (including program, event, topic and lesson pages) at 320, 375, 390, 430, 768, 1024, 1440 and 1920 px, plus every parent, instructor and administrator screen at 320, 390, 768, 1024 and 1440 px: 398 page loads, no horizontal scrolling, one main heading per page, no script errors. |
| Navigation, footer and WhatsApp (Playwright) | Mobile menu opens with aria-expanded, locks page scroll, moves focus in, keeps Tab inside, closes on Escape (focus returns to the button), closes on choosing a link and when the window reaches desktop width. Footer sections collapse on phones and open with aria-expanded; back to top works; the Neville Ebai link opens in a new tab with rel="noopener noreferrer". WhatsApp button is hidden with no number, uses https://wa.me/<number>?text=..., stays inside the screen, sits under the open menu, and is hidden in the learning area. Social icons are picked from the profile address. |
| Lighthouse (simulated slow 4G phone and desktop, local production build) | After the motion update (23 October): phone performance 86 to 92, accessibility 100, best practices 100, layout shift 0, total blocking time 120 to 290 ms, largest contentful paint 2.8 to 3.0 s; desktop performance 100, largest contentful paint 0.7 s. The home page now draws more on first load, which adds roughly 0.1 to 0.3 s on a slow phone. Before the motion update, phone: performance 93 to 96, accessibility 100, best practices 100, layout shift 0 (was 0.196 on inner pages), total blocking time 50 to 160 ms, largest contentful paint 2.3 to 2.9 s depending on the run (2.6 to 2.8 s before). Desktop: performance 100, largest contentful paint 0.6 s, layout shift 0.002. Interaction to next paint needs real visitors to measure; total blocking time is the lab stand in. |
| Browser flows (Playwright, Chromium) | Admin is blocked until two factor is set up; setup with a real code generated from the QR key; 10 recovery codes shown; next sign in asks for a code; a wrong code is refused; correct code opens the dashboard; 11 dashboard sections load; dashboard works at 360 px; a parent is sent away from the dashboard and gets 403 from the admin API; family settings show the child; the learner completes a quiz and progress is saved; a learner gets 403 when trying to set up two factor. |
| Content Security Policy | Production build served with the exact `netlify.toml` policy: no violations, fonts load. |
| Netlify Function bundle | Packaged with Netlify's own bundler (zip-it-and-ship-it) using the settings in netlify.toml: 11 to 22 MB depending on which Linux engines Prisma adds, under the 50 MB limit. The bundle was run with Netlify style requests: health, programs, sign in with a Secure httpOnly cookie, cross site request refused. |
| Netlify Blobs | Through the bundled function against Netlify's local Blobs server: image upload, read back identical, delete. |
| Netlify build script | Preview mode, stopping on missing secrets, and full mode (migrations applied to an empty database, sample content added, no accounts created) all checked. |
| Full flow on a local Netlify stand in (built site, routing rules, bundled function, Blobs) | Sample lessons visible; wrong setup key refused; first administrator created at /setup; /setup closes afterwards; sign in; dashboard locked until two factor; two factor set up with a real code; dashboard opens; image uploaded and displayed. No script errors or CSP violations. Preview mode shows its notice on every page. |

Not yet tested: a deploy on Netlify's real servers (the steps above use Netlify's own bundler and Blobs server locally, but Netlify's Linux runtime and Prisma's engine for it were not run here), a real API host, real email delivery, other browsers (Safari, Firefox), screen readers, and a professional security review or penetration test.

## External accounts and credentials needed

| Service | Why | Who sets it up |
| --- | --- | --- |
| Git hosting (for example GitHub) | Source code and Netlify deploys | Foundation or developer |
| Netlify | Hosting the website | Foundation (account should belong to the foundation) |
| Database: Neon (free tier is enough to start) or Netlify DB | Data | Foundation |
| Node hosting (Render, Railway, Fly.io, or a VPS), only for the separate API host option | Running the API | Foundation |
| Persistent storage for uploads: included on Netlify (Blobs), or a host disk for the separate API option | Images | Foundation |
| Domain name and DNS access | Public address, email authentication | Foundation |
| Transactional email provider | Verification, reset and notification emails | Foundation |
| Payment provider (later) | Only after approval | Foundation |
| An authenticator app for each administrator | Two factor sign in | Each administrator |

Secrets to generate and set as environment variables (in Netlify, or on the API host): `SESSION_SECRET`, `ENCRYPTION_KEY`, `SETUP_TOKEN` (only until the first administrator exists), the database connection string, SMTP credentials, and later `PAYMENT_WEBHOOK_SECRET`. None of these ever go into the frontend or the repository.

## Waiting for the foundation's approval or information

Content (all shown as placeholders now):
- Official logo, colours confirmation and favicon
- Mission, vision, values, approach and history
- Programs and events: real names, descriptions, ages, schedules, locations and prices
- Team, partners and any testimonials (only with written permission)
- Licences for the four supplied photos now in use, or replacements (see client/public/images/CREDITS.md), and larger originals
- Verified impact figures with a source (Dashboard > Settings > Impact figures; the band stays hidden until then)
- Gallery photos with permission and alt text (Dashboard > Media, folder "gallery")
- Contact email, phone, address, WhatsApp number (digits with country code) and the addresses of the official Facebook, Instagram, LinkedIn, YouTube, TikTok and X profiles
- How the foundation relates to Neville Ebai Consulting (currently a plain external link in the footer, with no partnership stated)
- Legal name, registration number and country of registration
- Approved photos, with documented permission for any child who can be identified
- Learning content: topics, lessons and quizzes reviewed by educators

Decisions:
- Privacy policy, child safety and safeguarding policy, terms, and consent wording (legal and safeguarding review)
- Data retention periods and who handles data requests
- Minimum age and how guardian consent is verified
- Whether a second guardian needs proof before being linked
- Whether donations and paid events are offered, and if so: legal entity, receiving account, provider, currency, refund and donation terms
- Email provider and sending address
- Languages the site must support
- Who the administrators and instructors are, and the instructor vetting process

## Production readiness checklist

Content and approvals
- [ ] All `[[placeholder]]` text replaced or removed, and no "Sample content" badges left anywhere
- [ ] Sample data not present in the production database (never run the seed in production)
- [ ] Policies reviewed, approved and published from Dashboard > Pages and policies
- [ ] Official logo and approved images installed

Configuration
- [ ] `NODE_ENV=production`, new random `SESSION_SECRET` and `ENCRYPTION_KEY`, `ENCRYPTION_KEY` backed up securely
- [ ] `APP_ORIGIN` and `PUBLIC_APP_URL` set to the real domain; `API_ORIGIN` set in Netlify
- [ ] `TRUST_PROXY` set and rate limiting confirmed to see real client addresses
- [ ] HTTPS on both the site and the API
- [ ] `UPLOAD_DIR` on persistent storage and included in backups
- [ ] Email provider connected, domain verified (SPF, DKIM, DMARC), each email tested
- [ ] `PAYMENTS_MODE=disabled` and `DONATIONS_ENABLED=false` until payments are approved

Security
- [ ] First administrator created with `create-admin`, two factor enabled, recovery codes stored offline
- [ ] Each administrator has their own account; no shared accounts
- [ ] Database backups scheduled and a restore tested
- [ ] Dependencies checked (`npm audit`) and updated
- [ ] Independent security review before handling real children's data
- [ ] Error monitoring and uptime checks set up (without sending personal data to third parties)

Final checks
- [ ] Full test suite passes against the release
- [ ] Manual test on iPhone Safari, Android Chrome and a desktop browser
- [ ] Keyboard and screen reader walkthrough of sign in, registration and a lesson
- [ ] Contact form, registration and password reset tried on the live site
