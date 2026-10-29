# Lead Vest Foundation website

Public website, child friendly learning area, family and account settings, and an administration dashboard for the Lead Vest Foundation.

> **Status: development build.** All foundation details (mission, programs, contact details, registration, policies) are placeholders marked in the interface, and all data created by the seed script is fictional sample content. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for what is finished, what needs approval and the production checklist.
>
> **To host it:** [NETLIFY.md](NETLIFY.md) is a step by step guide for running everything on Netlify. [DEPLOYMENT.md](DEPLOYMENT.md) covers the alternative with a separate API host.

## What is inside

| Folder | What it is |
| --- | --- |
| `client/` | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion. Deployed to Netlify. |
| `server/` | Node.js, Express, Prisma, PostgreSQL. Deployed to any Node host. |
| `netlify/functions/` | The API as Netlify Functions (it reuses `server/`). |
| `scripts/netlify-build.mjs` | Netlify build: migrations, optional sample content, and routing. |
| `netlify.toml` | Netlify build, functions and security headers. |

The browser only ever talks to `/api` on the site's own domain. In development Vite proxies it to the API on port 4000; on Netlify it is routed to the API function (or to a separate API host). This keeps the sign in cookie first party and means no secret ever needs to be in frontend code.

## Requirements

- Node.js 22 or newer and npm 10 or newer
- PostgreSQL 14 or newer (16 tested)

## Install

```bash
npm install                      # installs client and server (npm workspaces)
cp server/.env.example server/.env
```

Edit `server/.env`:

- `DATABASE_URL`: your local PostgreSQL connection string
- `SESSION_SECRET` and `ENCRYPTION_KEY`: two different random values, at least 32 characters. Generate each with
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

The client needs no `.env` for local development.

### On Windows (PowerShell)

```powershell
# Requirements: Node.js 22+ (nodejs.org) and PostgreSQL 16 (postgresql.org/download/windows)
cd lead-vest-foundation
npm install
Copy-Item server\.env.example server\.env
notepad server\.env        # set DATABASE_URL, SESSION_SECRET and ENCRYPTION_KEY

# Make a random secret (run twice, one for each value):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Create the database (psql is in C:\Program Files\PostgreSQL\16\bin):
psql -U postgres -c "CREATE USER lvf WITH PASSWORD 'choose-a-local-password' CREATEDB;"
psql -U postgres -c "CREATE DATABASE lvf_dev OWNER lvf;"

npm run db:migrate --workspace server
npm run db:seed --workspace server       # optional fictional sample content
npm run dev                              # http://localhost:5173
```

PowerShell sets variables for one command like this: `$env:ADMIN_EMAIL='you@example.org'; $env:ADMIN_NAME='Your Name'; npm run create-admin --workspace server`.

## Database

Create a database and user (example for a local PostgreSQL, choose your own password):

```sql
CREATE USER lvf WITH PASSWORD 'choose-a-local-password' CREATEDB;
CREATE DATABASE lvf_dev OWNER lvf;
```

Then:

```bash
npm run db:migrate --workspace server   # create tables (development, creates new migrations when the schema changes)
npm run db:seed --workspace server      # optional: fictional sample content for development
```

In production use `npm run db:deploy --workspace server`, which applies existing migrations only.

### Sample accounts (development only)

The seed refuses to run when `NODE_ENV=production`. Every sample record is flagged `isSample` and shows a "Sample content" badge. All sample accounts use the password `DevOnly-password-123`.

| Sign in | Role |
| --- | --- |
| `admin@example.test` | Administrator. Must set up two factor authentication before the dashboard opens. |
| `instructor@example.test` | Instructor assigned to the first sample program |
| `instructor2@example.test` | Instructor with no assignment (used to show access limits) |
| `parent@example.test` | Parent with one learner |
| `sample_learner` | Learner (children sign in with a username, not an email) |

## Run in development

```bash
npm run dev
```

- Website: http://localhost:5173
- API: http://localhost:4000 (health check at `/api/health`)

With `EMAIL_TRANSPORT=console`, verification and reset emails are printed to the API log instead of being sent.

## The first administrator

There is no default administrator password in any environment. To create the first administrator:

```bash
npm run create-admin --workspace server -- --email person@example.org --name "Full Name"
# on a production host after building:
npm run create-admin:prod --workspace server -- --email person@example.org --name "Full Name"
```

The command prints a single use link that expires in one hour. The administrator opens it, chooses their own password, signs in, and is then required to turn on two factor authentication (an authenticator app such as Google Authenticator, Microsoft Authenticator, 1Password or Authy) before any dashboard page opens. Further administrators and instructors are invited from Dashboard > Users.

**From environment variables instead.** Set `ADMIN_EMAIL` and `ADMIN_NAME` (and, if you want the account ready to sign in, `ADMIN_PASSWORD`, at least 10 characters with a letter and a number), then run `npm run create-admin --workspace server`. The Netlify build runs the same step automatically when all three are set. It is safe to run any number of times: an existing administrator is never changed, and an email address that belongs to a parent or instructor is refused rather than promoted. The password is stored only as an Argon2id hash and is never printed or logged. Delete `ADMIN_PASSWORD` from the environment once the account exists, and change the password from Settings > Account after the first sign in.

On hosts without a command line (Netlify), you can also set `SETUP_TOKEN` and use the one time `/setup` page. See NETLIFY.md, step 4.

## Google sign in

Optional. Parents can sign in or sign up with Google; staff can link Google to their account from Settings > Security. Until it is configured, clicking the Google buttons shows a clear "not set up yet" message; it is never simulated. It is never simulated.

1. Go to https://console.cloud.google.com, create a project (or pick one), then **APIs & Services > OAuth consent screen**: choose External, fill in the app name, support email and the privacy and terms page links, and add the scopes `openid`, `email` and `profile`.
2. **APIs & Services > Credentials > Create credentials > OAuth client ID**, type **Web application**.
3. Authorised redirect URIs: `http://localhost:5173/api/auth/google/callback` for development, and `https://YOUR-DOMAIN/api/auth/google/callback` for the live site.
4. Copy the client ID and secret into the server environment as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (`server/.env` locally, Netlify environment variables in production). Never put them in `client/` or commit them.

How it works: the server uses the authorisation code flow with PKCE, a random `state` and `nonce` kept in a short lived signed httpOnly cookie, and verifies the ID token signature against Google's published keys, plus issuer, audience, expiry and nonce. Only Google accounts with a verified email are accepted. A Google login links automatically only to an existing parent, learner (16+) or new-member account with the same verified email; staff and administrator accounts must sign in with their password and link Google from Security settings, so an email address alone never grants staff access. Administrators still need their two factor code after Google sign in. New Google sign ups (from either the sign up or the sign in screen) become new-member accounts and choose their role on the next screen.

## Dark mode, languages and cookies

- **Theme:** the moon or sun button in the header switches light and dark; Settings > Appearance and language also offers "System", which is the default and follows the device. The choice is saved in the browser and, when signed in, to the account. A small script (`client/public/theme-init.js`) applies it before the page paints, so there is no white flash.
- **Languages:** English, French, Spanish and Portuguese, chosen from the globe selector in the header, the mobile menu or Settings. Translated: navigation, header, footer, cookie banner, sign in, registration, password reset, two factor, settings menu and appearance page, contact page and form, articles pages, admin menu and overview, error pages, status notices and the most common server messages. Still in English in every language: page body copy written by the foundation (home, about, programs, policies and similar), sample content, most dashboard screens and some settings pages. Dates and numbers follow the chosen language. Dictionaries are in `client/src/i18n/locales/`; any missing key falls back to English, and a test checks every language has every key.
- **Cookie consent:** the banner offers Accept all, Reject non-essential and Customise. Strictly necessary storage (session, sign in protection, theme, language, the cookie choice itself) is always on. Analytics is off until allowed, and no analytics service is connected by default (see `VITE_ANALYTICS_SRC` in `client/.env.example`). The choice lasts twelve months and can be changed from "Cookie settings" in the footer. The banner is a tool, not legal advice: have the cookie policy reviewed before launch.

## Articles and resources

`/resources` lists published articles with topic filters; each article has its own page. Administrators write them in Dashboard > Articles and resources (simple Markdown with a preview, image, topic, reading time, draft, published or archived). The seed adds three clearly marked sample articles.

## Preview mode

The yellow "Preview mode" notice appears when the website cannot reach its server (`/api/health`) or the server cannot reach the database. It is shown on purpose so forms never fail silently. On the drag and drop preview it is expected, because that copy has no server. On a full deploy it means `DATABASE_URL` is missing or wrong; NETLIFY.md, step 3, explains the fix.

## Testing

```bash
npm test                 # server and client tests
npm run typecheck        # TypeScript for both
npm run build            # production builds for both
```

Server tests run against a separate database, `lvf_test` by default. Create it once (`CREATE DATABASE lvf_test OWNER lvf;`) or set `TEST_DATABASE_URL`. The test setup applies migrations and empties tables between tests; it never touches `lvf_dev`.

What the tests cover is listed in [PROJECT_STATUS.md](PROJECT_STATUS.md#testing).

## Replacing the logo and images

The logo, favicon and all images are placeholders. Nothing in the code needs to change beyond the two configuration files below.

**Logo**

1. Put the official files in `client/public/images/branding/`, for example `logo-mark.svg` (square symbol), optionally `logo.svg` (full horizontal logo), `favicon.svg` and `apple-touch-icon.png` (180 x 180).
2. Edit `client/src/config/brand.ts`: update `mark`, `full` (or leave `null` to show the symbol plus the name as text), `favicon`, and set `isPlaceholder: false`.
3. Update the icon links in `client/index.html`.
4. Optionally delete the `*-placeholder.svg` files.

The header, footer, mobile menu, sign in screens and dashboard all read from `brand.ts`. An administrator can also point the site at an uploaded logo from Dashboard > Settings > Branding, without a redeploy.

**Images**

All page images are listed by key in `client/src/config/images.ts` (for example `home.hero`). While an entry's `src` is `null`, a branded illustration is shown at the right shape. To use a photo:

1. Put the original photo (JPEG or PNG, at least 1600 px wide) in `client/images-src/`.
2. Run `npm run images --workspace client`. It writes optimised WebP files in 640, 1024 and 1600 px widths to `client/public/images/photos/` and prints the `src` and `srcSet` to paste in.
3. Set `src` and `srcSet` for that key, write meaningful `alt` text, and credit the photographer in `client/public/images/CREDITS.md` if the licence asks for it. Only use photos the foundation owns or has a licence for, and never link to images on other websites.

The hero image on each page loads first; every other image loads lazily and keeps its shape while loading, so nothing jumps.

Program and event images can also be uploaded from the dashboard (Media, then choose the image on the program or event). Uploads accept PNG, JPEG and WebP only, are checked by file content, and are limited to 5 MB by default.

Never publish identifiable photos of children without documented guardian permission and the foundation's approval.

## Impact figures and the photo gallery

**Impact figures** (the counting numbers on the home and About pages) are entered in **Dashboard > Settings > Impact figures**: up to six, each with a number, an optional prefix or suffix and a label, plus an "as of" date and a source note. Only enter figures the foundation can evidence. The band is hidden until at least one figure exists.

**Gallery** (About page): upload photos in Dashboard > Media with the folder set to `gallery`, visibility public, and meaningful alt text. Photos without alt text are left out. Until then a placeholder explains that photos will be added.

## Motion

Moving parts: a seamless photo strip (`PhotoMarquee`, with a pause button, paused on hover and focus), full width photo bands with parallax (`PhotoBand`), floating photos and shapes beside page header images, and a light sweep on primary buttons.


Animations are plain CSS plus a small IntersectionObserver hook (`client/src/components/motion/Reveal.tsx`); framer-motion is only used for page transitions and the mobile menu. Content on the first screen is never hidden waiting for an animation. Visitors who ask for reduced motion (in their system settings or the "Turn animation off" button in the footer) get no scroll reveals, parallax, counters or automatic slides.

## Contact, WhatsApp and social links

Everything here is set from **Dashboard > Settings > Contact**, with no redeploy:

- **WhatsApp number:** digits only, starting with the country code (no plus sign, spaces or leading zero). The floating chat button and the footer and contact page links appear once it is set, using the official `https://wa.me/<number>` link. A greeting can be prefilled. The button is never shown in the children's learning area or on sign in and account screens. `VITE_WHATSAPP_NUMBER` in `client/.env` is an optional build time fallback.
- **Social links:** paste the full address of each official profile. Facebook, Instagram, LinkedIn, YouTube, TikTok, X and WhatsApp addresses get their own icon in the footer automatically; anything else shows a generic link icon. Nothing is shown until links are added.
- **Email, phone, address and office hours** appear in the footer and on the contact page; until then they show "to be confirmed".

The footer also links to Neville Ebai Consulting as a plain external link. No partnership or endorsement is stated; change `externalResources` in `client/src/components/layout/nav.ts` once the relationship is confirmed.

## Icons

Every interface and brand icon is Font Awesome Free (`@fortawesome/free-solid-svg-icons`, `free-regular-svg-icons`, `free-brands-svg-icons`), drawn as inline SVG from `client/src/components/ui/icons.tsx`. Each icon lives in its own small module in `ui/icon-set/`. To add one, copy an existing file there, pick the icon from fontawesome.com/icons (free set), and export it from `icons.tsx`. Do not add emoji or other icon libraries.

## Project scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and website with live reload |
| `npm test` | All tests |
| `npm run build` | Production builds |
| `npm run db:migrate --workspace server` | Apply and create migrations (development) |
| `npm run db:deploy --workspace server` | Apply migrations (production) |
| `npm run db:seed --workspace server` | Fictional sample data (development only) |
| `npm run create-admin --workspace server -- --email … --name …` | First administrator setup link |
| `node scripts/netlify-build.mjs` | The Netlify build (run by Netlify) |

## Security notes for maintainers

- Passwords are hashed with Argon2id. Two factor secrets are encrypted with AES-256-GCM using `ENCRYPTION_KEY`. Recovery codes are stored only as keyed hashes. Sessions are random tokens in an httpOnly cookie, stored only as a hash.
- Logs redact cookies, passwords, codes and tokens. Do not add logging of request bodies.
- Every permission check happens on the server. The interface hides things for convenience only.
- Never commit `.env` files. `.gitignore` already excludes them.
