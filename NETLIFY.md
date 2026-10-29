# Hosting on Netlify

Everything runs on Netlify: the website, and the server (API) as a Netlify Function. Uploaded images are stored in Netlify Blobs. The only thing Netlify does not provide by itself is the PostgreSQL database, which comes from Netlify DB or a free [Neon](https://neon.tech) account.

**Do not use drag and drop.** Dragging a folder onto Netlify uploads only the front end, so sign up, sign in and Google cannot work. Deploy the project as one site from GitHub (below) or with the Netlify CLI (`netlify deploy --build --prod`): the website and the server are then deployed together.

## Deploying the full site

You need: a free GitHub account, a free Netlify account, and a database (step 2).

Netlify's drag and drop cannot run the server part, so the full site is deployed from a GitHub repository. Netlify then builds it on its own Linux machines, which the server needs.

### 1. Put the project on GitHub

1. Unzip this file.
2. Create a new **private** repository on GitHub (for example `lead-vest-foundation`). Do not add a README or licence.
3. Upload the project. The easiest way is [GitHub Desktop](https://desktop.github.com): File > Add local repository > choose the unzipped `lead-vest-foundation` folder. It will say the folder is not a repository yet; choose **create a repository** there, make the first commit, then Publish repository and keep "Private" ticked.

   From a terminal instead:
   ```bash
   cd lead-vest-foundation
   git init -b main
   git add .
   git commit -m "Lead Vest Foundation website"
   git remote add origin https://github.com/YOUR-NAME/lead-vest-foundation.git
   git push -u origin main
   ```

   The `netlify-drop-preview` folder is not part of the project, and git ignores it.

### 2. Create the database

**Option 1, Neon (recommended, free):**

1. Sign up at https://neon.tech and create a project (pick the region nearest your visitors).
2. On the project dashboard, click **Connect**. Turn **Connection pooling off** and copy the connection string. It looks like `postgresql://user:password@ep-something.region.aws.neon.tech/neondb?sslmode=require`.
3. Keep it for step 3. It is a password: do not share it or put it in the code.

**Option 2, Netlify DB:** if your Netlify account offers Netlify DB (powered by Neon), you can add it to the site instead. It sets `NETLIFY_DATABASE_URL` automatically, and this project picks that up. You can then skip `DATABASE_URL` in step 3.

### 3. Create the Netlify site

1. In Netlify: **Add new project > Import an existing project > GitHub**, and choose the repository.
2. Netlify reads the build settings from `netlify.toml`. Leave the fields as they are.
3. Before deploying, open **Environment variables > Add variables** and add:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | the Neon connection string from step 2 |
| `SESSION_SECRET` | a random value of at least 32 characters |
| `ENCRYPTION_KEY` | a **different** random value of at least 32 characters |
| `SETUP_TOKEN` | a third random value of at least 24 characters (used once, in step 4) |
| `SEED_SAMPLE_CONTENT` | `true` if you want sample programs, events and lessons for testing (optional) |

To make random values, use a password manager's generator (48 characters, letters and numbers), or run `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` once per value.

**Keep a safe copy of `ENCRYPTION_KEY`.** It protects the two factor sign in secrets. If it is lost or changed, every administrator has to set up two factor again.

4. Click **Deploy**. The first build takes about 3 to 5 minutes. The build log ends with `Build complete (full)`.

If `DATABASE_URL` is missing, the site still deploys in preview mode. If the secrets are missing or too short, the build stops and the log says exactly which variable to fix.

**Optional, Google sign in:** add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (see "Google sign in" in README.md for where to get them). In Google Cloud the authorised redirect URI must be `https://your-site.netlify.app/api/auth/google/callback` (your custom domain instead, once you have one). Without these two values the Google buttons show a clear "not set up yet" message when clicked.

**Optional, first administrator from variables instead of step 4:** see "The first administrator" in README.md.

### 4. Create the first administrator

There is no default administrator or password. Instead:

1. Open `https://your-site.netlify.app/setup`.
2. Enter the `SETUP_TOKEN` value, your name, email and a password of your choice.
3. Sign in at `/sign-in`. You will be asked to set up two factor authentication: scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy and similar), enter the 6 digit code, and save the 10 recovery codes somewhere safe and offline.
4. The dashboard opens at `/admin`.

The setup page only works while no administrator exists, so it closes for good after this. You can then delete `SETUP_TOKEN` from the environment variables.

Invite other staff from Dashboard > Users. While email is off, the dashboard shows a one hour setup link to pass to the new person privately. Everyone creates their own account at `/register` (email or Google) and chooses learner or parent with one tap; children under 16 get theirs from a parent in Settings > Family.

### 5. Test it

- Website pages on a phone and a computer
- Learning area: open a lesson and finish the quiz
- Contact form: the message appears in Dashboard > Enquiries
- Dashboard: create a program and an event, upload an image in Media
- Sign up in a private window (email, then Google), choose "parent", and add a child in Settings > Family

### What does not work yet on a fresh site

- **Email is off** until an email provider is connected, so there are no verification, password reset or notification emails. Until then, parents cannot verify their email, which event registration requires. The dashboard shows "Email delivery is not connected" until it is set up. To connect it, add `EMAIL_TRANSPORT=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASSWORD` from your email provider (for example Brevo, Mailgun, Postmark or Amazon SES), then redeploy.
- **Payments and donations are off** until the foundation approves a provider and terms. See DEPLOYMENT.md, section 6.
- All foundation details are placeholders until you fill them in under Dashboard > Settings and Pages.

## Changing settings later

Contact details, the WhatsApp number and social links are changed in Dashboard > Settings > Contact and appear within about 30 seconds (public pages are cached briefly at Netlify's edge). No redeploy is needed for those.

Netlify only applies environment variable changes to new deploys. After changing a variable, go to **Deploys > Trigger deploy > Deploy site**.

Every push to the GitHub repository deploys automatically.

## Custom domain

Site configuration > Domain management > Add a domain. Netlify sets up HTTPS. Redeploy once afterwards, so email links use the new address.

## Before real families use the site

- Set `SEED_SAMPLE_CONTENT` to `false` (or delete it), and archive the sample programs, events and lessons in the dashboard
- Replace every placeholder, and publish approved policies
- Connect email and test it
- Turn on Neon's backups (point in time restore) and test a restore
- Work through the checklist in PROJECT_STATUS.md

## Good to know

- Uploads are limited to 4 MB per image on Netlify, which is plenty for photos saved for the web.
- The first request after a quiet period can take a second or two while the function starts.
- Request limits (for example sign in attempts) are counted per running function copy, so they are looser than on a single server. Account lockout after 10 wrong passwords is stored in the database and always applies.
- Netlify Functions have a 10 second limit per request. Nothing in this site comes close in normal use.
