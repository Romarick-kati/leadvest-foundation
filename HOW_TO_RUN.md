# Lead Vest Foundation: how to run it, sign in as admin, and set up policies

## 1. Run it on your own computer
You need Node.js 22+ (nodejs.org, LTS) and PostgreSQL 16 (postgresql.org/download).

1. Create the database (SQL Shell / psql, logged in as `postgres`):
   ```
   CREATE USER lvf WITH PASSWORD 'mypassword123' CREATEDB;
   CREATE DATABASE lvf_dev OWNER lvf;
   ```
2. In the project folder: `npm install`
3. Copy `server/.env.example` to `server/.env` and set:
   ```
   DATABASE_URL=postgresql://lvf:mypassword123@localhost:5432/lvf_dev
   SESSION_SECRET=<random value>
   ENCRYPTION_KEY=<a different random value>
   REQUIRE_ADMIN_2FA=false      # local testing only; keep true in production
   ```
   Make a random value with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
4. `npm run db:migrate --workspace server` then (optional sample content) `npm run db:seed --workspace server`
5. `npm run dev`, then open http://localhost:5173

## 2. Where the PostgreSQL connection string comes from
Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- Local: `postgresql://lvf:mypassword123@localhost:5432/lvf_dev` (the user, password and database you created above).
- Online (needed for Netlify): sign up at neon.tech, create a project, click **Connect**, turn **Connection pooling off**, copy the string. It ends with `?sslmode=require`. Paste it as `DATABASE_URL`.

## 3. Admin dashboard access (your own login)
No password is stored in this project's files, on purpose: the zip and the GitHub repository must never contain one. You set your admin login in Netlify's environment variables instead, and the build creates it for you.

In Netlify > Site configuration > Environment variables add:
| Key | Value |
| --- | --- |
| `ADMIN_EMAIL` | `ndiromarickkati45@gmail.com` |
| `ADMIN_NAME` | your name, for example `Marick Ndiro` |
| `ADMIN_PASSWORD` | the password you want (10+ characters, letters and numbers). Type it only in Netlify. |

Then deploy (or **Deploys > Trigger deploy**). The build prints "Administrator created", or "Existing account upgraded to administrator" if you had already signed up with that email, so the same email always opens the admin side.

Then sign in at `/sign-in` with that email and password. Admins land on `/admin` (the dashboard).
- **First login:** the dashboard asks you to turn on two-factor sign in (scan a QR code with Google Authenticator, Microsoft Authenticator or Authy, then save the 10 recovery codes). This is a safety rule for admin accounts. While you are only testing you can add `REQUIRE_ADMIN_2FA` = `false` in Netlify and redeploy, but switch it back to `true` before real users arrive.
- **Google with the same email:** for security, an admin account must sign in with its password first. Then go to **Settings > Security > Link Google account**. After that, "Continue with Google" with that email also opens the admin dashboard.
- After the first successful login, **delete `ADMIN_PASSWORD` from Netlify**, and change your password in Settings > Account. Because the password was shared in a chat, choose a new, longer one.
- Local computer: `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` in `server/.env`, then `npm run create-admin --workspace server`.
- Backup way, no password in settings: set only `SETUP_TOKEN`, deploy, open `/setup` and create the admin there.

## 4. Policies (Privacy, Terms, Child safety, Consent, Cookies)
The site already contains drafts describing what it really does. They show a "Draft for review" notice until approved.
1. Dashboard > **Settings**: fill Organisation (name, registration details), Contact, Branding, then the **Policies** toggles.
2. Dashboard > **Pages**: create a page with the web address `privacy` (or `terms`, `child-safety`, `consent`, `cookies`) to publish your approved wording. It replaces the draft.
3. Fill the `[[ ... ]]` gaps with real facts the foundation must supply: legal name and address, how long data is kept, the privacy contact, the data protection law that applies. Have a lawyer review it, then switch the matching "approved" toggle on.

## 5. Signing up and signing in (the same for everyone)
Sign up (`/register`) and sign in (`/sign-in`) look the same and ask almost nothing:
- **Continue with Google** (one tap), or **name + email + password**. That is all.
- Right after, a one-tap screen (`/welcome`) asks **how they will use Lead Vest**:
  - **"I'm here to learn"**: for anyone 16 or older, including young adults. They tick "I'm 16 or older" and go straight to the learning area, where progress and badges are saved.
  - **"I'm a parent or guardian"**: they can add children under 16 under **Settings > Family**.
- They can change this later in **Settings > Profile > "Change how I use Lead Vest"** (a parent who already has children linked must remove them first).
- **Children under 16** cannot sign themselves up. The parent adds them under Settings > Family (nickname, username, password, age range, consent tick) and the child signs in with that username and password.
- If the access fee is switched on (section 7), a young person or parent pays once the role is chosen, before reaching their account or saving progress.
- Anyone can browse the learning area without an account. Staff accounts (instructors, admins) are created by an administrator in the dashboard.

Good to know: the age is self-declared (no date of birth is collected). A parent must have a **verified email** to add children. Google sign-up verifies the email automatically; email sign-up needs email delivery (SMTP, section 9) or an admin pressing "mark email verified" in Dashboard > Users.

**Updating an existing database:** this version adds the `YOUTH` and `MEMBER` roles. Run `npm run db:migrate --workspace server` again locally. On Netlify the build applies it automatically.

## 6. Google sign in and sign up (about 10 minutes)
The "Continue with Google" buttons work on both screens, but Google needs your own keys. Until you add them, clicking the button shows "Google sign in is not set up on this website yet".
1. Go to https://console.cloud.google.com, create a project, then **APIs & Services > OAuth consent screen**: choose External, fill in the app name and your support email, add your Privacy and Terms page links, and add the scopes `openid`, `email` and `profile`. Click **Publish app** when you are ready, otherwise only test users you list can sign in.
2. **Credentials > Create credentials > OAuth client ID > Web application.**
3. Authorised redirect URIs (add both):
   - `http://localhost:5173/api/auth/google/callback` (your computer)
   - `https://YOUR-SITE.netlify.app/api/auth/google/callback` (your Netlify address, or your own domain once you have one)
4. Copy the **Client ID** and **Client secret**. Put them in `server/.env` (local) and in Netlify > Site configuration > Environment variables as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Redeploy after adding them.
5. If you use your own domain, also set `PUBLIC_APP_URL=https://your-domain` in Netlify.

**Google error "redirect_uri_mismatch"?** Google compares the return address the site sends with the list you gave it, and they must match exactly.
1. Open `https://YOUR-SITE.netlify.app/api/auth/providers` in a browser. It shows `redirectUri`: that exact address is what Google must have.
2. Google Cloud Console > APIs & Services > Credentials > your OAuth client > **Authorised redirect URIs** > Add URI > paste it > Save. Wait 1 to 5 minutes.
3. In Netlify, delete `GOOGLE_REDIRECT_URI`, `APP_ORIGIN` and `PUBLIC_APP_URL` if they hold a `localhost` value. (This version also ignores those localhost values on the live site.)
Use `https://` with no trailing slash, and the same address you see in the browser bar (custom domain or `.netlify.app`, not both unless you add both).

## 7. Making money: the access fee (mobile money in Cameroon, cards worldwide)
How it works for your visitors: they sign up (email or Google), choose "I'm here to learn" or "I'm a parent or guardian", and **before they can continue they pay the access fee**. They are sent to the provider's own secure page, pay, come back, and the site unlocks. A parent's payment also covers their children's learning accounts. Public pages and public lessons stay free so people can see what they are paying for. Staff are never charged, and you can give anyone free access from **Admin > Users > the person > Paid access**.

**Two ways to pay, you choose which to switch on with `PAYMENTS_MODE`:**
| Value | Who it is for | Provider |
| --- | --- | --- |
| `fapshi` | People in Cameroon with MTN MoMo or Orange Money | Fapshi |
| `flutterwave` | Cards (Visa, Mastercard) from anywhere in the world, plus mobile money and bank transfer | Flutterwave |
| `both` | Offer the two on the payment page (recommended) | Fapshi and Flutterwave |
| `disabled` | Nobody pays (the whole site is free) | none |

The price: `ACCESS_FEE_XAF` (in FCFA, minimum 100). For people paying by card from abroad you can set `ACCESS_FEE_USD` (for example `5`); if you leave it empty they pay the FCFA price. `ACCESS_PERIOD_DAYS` is how long one payment lasts (30 monthly, 365 yearly, 0 = one payment for good).

**Fapshi (about 30 minutes, once):**
1. Create and activate your Fapshi account at dashboard.fapshi.com (they ask for your ID and business details; activation can take up to 48 hours, and you need it even for testing).
2. Dashboard > **Developers > New Service** (collection). Open it: you will see **Sandbox** and **Live** keys (`apiuser` and `apikey`).
3. Test with the sandbox keys first (they start with `FAK_TEST_`). In Netlify add `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET` (a secret you invent, 24+ characters).
4. In Fapshi set the webhook to `https://YOUR-SITE/api/payments/webhooks/fapshi` with the same secret.
5. Sandbox test numbers: success `670000000` (MTN) or `690000000` (Orange); failure `670000001` or `690000001`.

**Flutterwave (cards worldwide):**
1. Create a Flutterwave business account at flutterwave.com and choose Cameroon. They verify your business (registration documents and ID), which can take a few days. Flutterwave is licensed to operate in Cameroon. Cards from other countries are handled by Flutterwave; you are paid out to your bank or mobile money account.
2. Dashboard > **Settings > API**: copy your **Secret key**. Test keys contain `FLWSECK_TEST`. (You do not need the public key or encryption key.)
3. In Netlify add `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_SECRET_HASH` (a secret you invent).
4. Dashboard > **Settings > Webhooks**: URL `https://YOUR-SITE/api/payments/webhooks/flutterwave`, Secret hash = the same value you put in Netlify. Save.
5. Test with Flutterwave's test cards (see their "Testing" page) in test mode.

**Then, for both:**
- Set `PAYMENTS_MODE` (`both` is best), `ACCESS_FEE_XAF`, optionally `ACCESS_FEE_USD`, `ACCESS_PERIOD_DAYS`. Redeploy.
- Test in a private window: sign up, choose a role, pay. You should land on "Payment received" and be let in. Check Admin > Payments.
- **Go live:** replace the test keys with live keys, redeploy, and make one real payment yourself. The build log warns you while test keys are in use because test payments unlock access without real money.
- Your money is in the provider dashboards, not on the website. Both charge a fee per payment: price accordingly.
- The site only gives access after asking the provider's server "was this paid, how much, and in which currency?". A fake webhook, a changed browser address or paying less cannot unlock anything.
- Add your price, refund and cancellation rules in **Settings > Legal details** (they appear in the Terms), and have a lawyer read the Terms and Privacy pages before charging real people.

## 8. Put the front end and the back end online in one go (Netlify)
Do **not** drag a folder onto Netlify: that only uploads the front end, so sign up, sign in, Google and the admin dashboard cannot work. This project deploys the website and the server (as a Netlify Function) together:
1. **GitHub:** create a free account, then a new **private** repository (no README). Install GitHub Desktop (desktop.github.com), unzip this project, then File > Add local repository > choose the `lead-vest-foundation` folder > "create a repository" > Commit > **Publish repository** (keep Private ticked). Or in a terminal inside the folder: `git init -b main`, `git add .`, `git commit -m "first version"`, `git remote add origin https://github.com/YOU/lead-vest-foundation.git`, `git push -u origin main`.
2. **Database:** neon.tech > new project > **Connect** > pooling off > copy the connection string.
3. **Netlify:** app.netlify.com > **Add new project > Import an existing project > GitHub** > pick the repository. Leave the build settings alone (`netlify.toml` has them).
4. **Environment variables:** before the first deploy add everything in `NETLIFY_ENV_CHECKLIST.txt` (database, the two secrets, the three ADMIN values, the two Google values).
5. **Deploy.** The build creates the database tables, creates your admin account and publishes the site and the server together. Watch the build log for "Administrator created".
6. Open `https://YOUR-SITE.netlify.app/sign-in`, sign in with your admin email and password, set up two-factor, and the dashboard opens at `/admin`.
7. Add your Netlify address to Google (section 6, step 3) so Google sign in works, then test sign up in a private window.
Every later `git push` (or GitHub Desktop "Push origin") redeploys automatically. After changing any variable, use Deploys > Trigger deploy.
No GitHub? Install the Netlify CLI (`npm i -g netlify-cli`), run `netlify login`, `netlify link` in the project folder, then `netlify deploy --build --prod`. It also deploys front and back together.

## 9. Email (so verification and password-reset emails are sent)
Add `EMAIL_TRANSPORT=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` from an email provider (Brevo, Mailgun, Postmark, Amazon SES). Without it, the site still works: people sign up and sign in, but no emails are sent.

## 9b. Animations on phones
If the site looks flat on a phone, the phone's battery saver or "remove animations" setting is asking websites to stop moving things, and the site respects that. Scroll to the bottom of the site and tap **Turn animation on**: this choice is remembered on that phone and wins over the phone setting. People who prefer less motion can tap **Turn animation off** there at any time.

## 9c. Search engines (Google) and speed
**How every page gets found.** The site is built so Google does not have to guess:
- Every public page has its own address, title, description, canonical address and a short summary written into the page itself, so Google sees it before any script runs. People then get the full designed page.
- Pages like About, Parents, Contact and the policies are written as real files when the site is built. Programs, events, news articles and lessons are made from your dashboard content the moment someone (or Google) asks for them, then cached for a few minutes.
- A **sitemap** at `/sitemap.xml` lists every public page and every published program, event, article and lesson, and updates itself. `/robots.txt` points to it and hides private areas (dashboard, account, payments).
- An address that does not exist returns a real "404 not found", and drafts are never shown. Nothing redirects in circles; sign in pages are simply not listed.
- Sample content (from `SEED_SAMPLE_CONTENT`) is left out of the sitemap. Before launch set `SEED_SAMPLE_CONTENT` to `false` and delete the samples in the dashboard.

**After you buy the domain:**
1. Netlify > Domain management > Add a domain, and follow the steps. Netlify gives you HTTPS automatically.
2. Set `PUBLIC_APP_URL` to `https://your-domain` and redeploy (this puts the right address into every page and the sitemap).
3. Google Search Console (search.google.com/search-console) > add your domain > verify > Sitemaps > submit `https://your-domain/sitemap.xml`.
4. Update Google sign in, Fapshi and Flutterwave addresses (sections 6 and 7).
5. Check: `https://your-domain/about` shows the page; `https://your-domain/programs/not-real` shows "not found"; right click > View page source on any page shows its title, description and text.
6. Give Google a few days to weeks to list everything. Publishing more real content and having other websites link to you helps most.

**Speed.** The logo images are small, images are cached for a week, scripts and styles for a year (new versions get new names), pages from the database are cached for a few minutes, and heavy animation is switched off on phones where it costs battery. To measure: open the site in Chrome, press F12 > Lighthouse > Analyze. Aim for 90 and above on Performance and SEO.

## 10. Before launch checklist
- Confirm the contact details and WhatsApp number in `client/src/config/contact.ts`.
- Replace the social links (currently Google searches) with real profile addresses.
- Complete and approve the policies.
- Replace the hero photo with a sharp one (1600px or wider).
