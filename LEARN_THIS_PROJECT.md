# Understanding this project (for the person building and maintaining it)

This is written for someone who is learning. You do not need to understand every file to run the site, but this map tells you where to look.

## The three parts
1. **The website you see** (`client/`). Built with React. Pages are in `client/src/pages/`. The text on a page is in that page's file, except words that come from the dashboard (programs, events, news, policies).
2. **The server** (`server/`). Built with Node and Express. It answers the website's questions: "log this person in", "give me the programs", "start a payment". Each topic has a file in `server/src/modules/`.
3. **The database** (PostgreSQL on Neon). It stores people, programs, events, payments, lessons. Its shape is in `server/prisma/schema.prisma`. A change to the shape needs a **migration** (a small SQL file in `server/prisma/migrations/`). The Netlify build applies migrations by itself.

Netlify hosts the website and runs the server as a "function", so one deployment covers all three.

## A journey through the code: "someone pays"
1. They press the pay button on `client/src/pages/account/Subscribe.tsx`.
2. The browser asks the server: `POST /api/payments/access/checkout` (`server/src/modules/payments.routes.ts`).
3. The server works out the price itself (`server/src/config/env.ts` reads `ACCESS_FEE_XAF`), creates a Payment row, asks Fapshi or Flutterwave (`server/src/services/payments/`) for a checkout link, and sends the link back.
4. The browser goes to the provider's page. The person pays there. We never see card or mobile money details.
5. The provider sends them back to `/payment/return` and also calls our webhook. In both cases the server asks the provider "was it really paid, how much?" and only then calls `grantAccess` (`server/src/services/access.ts`).
6. The person's `accessUntil` date in the database moves forward, and `requireAccess` stops blocking them.

## Where do I change...
| I want to change | Where |
| --- | --- |
| Words on the home page | `client/src/pages/public/Home.tsx` |
| Colours, fonts | `client/tailwind.config.js` and `client/src/styles/index.css` |
| Animations | `client/src/styles/motion.css`, `motion-plus.css`, `client/src/components/motion/` |
| Programs, events, news, photos, lessons | The admin dashboard (no code) |
| Policy wording | Dashboard: Settings > Legal details (writer: `client/src/lib/policyText.ts`) |
| Price, payment providers | Netlify environment variables |
| Who can open which page | `client/src/App.tsx` (pages) and `server/src/middleware/auth.ts` (server rules) |
| What Google reads for each page | `server/src/seo/pages.ts` (static pages), `server/src/modules/seo.routes.ts` (database pages), `scripts/prerender.mjs` |
| Translations (English, French, Spanish, Portuguese) | `client/src/i18n/locales/` |

## Words you will hear
- **Environment variable**: a setting kept outside the code (passwords, keys, prices). In Netlify: Site configuration > Environment variables.
- **Deploy**: publishing a new version. It happens automatically when you push to GitHub.
- **Webhook**: the payment provider calling our server to say "this payment changed".
- **Migration**: a script that changes the database's shape safely.
- **Role**: what kind of account someone has (ADMIN, INSTRUCTOR, PARENT, YOUTH, LEARNER, MEMBER).

## Running tests
`npm test` runs both the website tests and the server tests (the server tests need a PostgreSQL database, see HOW_TO_RUN.md). When you change something, run them: they are the safety net.

## The rules we follow on purpose
- Passwords and keys are never written in files or on GitHub.
- Access is given only after the payment provider confirms the payment, the amount and the currency.
- Children under 16 never create accounts alone and have no chat.
- Private pages (admin, account, payment) are hidden from Google.
