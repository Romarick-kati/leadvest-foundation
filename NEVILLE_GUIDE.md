# Lead Vest Foundation website: guide for the owner

This guide is for the foundation's owner. You do not need to know how to code. Everything you do day to day happens in the **Dashboard** (sign in, then open the menu and choose Dashboard).

## 1. Daily tasks in the Dashboard

| I want to... | Go to | What to do |
|---|---|---|
| Add a program | Programs > New | Fill in the title and summary. Add a picture (optional). Set the status to **Published**. Save. |
| Add an event | Events > New | Same steps. Add the date and place. |
| Hide something without deleting it | Open it | Set the status to **Draft** and save. |
| Delete something for good | Open it | Click **Delete** (or open it on the public site while signed in as admin and use the Edit / Delete bar). |
| Add a picture | Inside the program or event | Choose a built-in photo, or **Upload from this device**. If you add no picture, the site makes a colourful cover for you. |
| Tell people about news | Announcements | Write a title and message and choose who sees it. It appears in their notification bell. |
| See who just joined | Users | Newest people are on top with a green **New** label. |
| Remove an account | Users > open the person | Click **Delete account**. |
| Change the foundation's details | Settings | Contact, address, registration number and policy approvals are all here. |

New programs, events and articles you publish are announced automatically in every member's notification bell.

## 2. How money comes in

1. You set a price on a program or event (Programs or Events > open it > **Price for online payment**, and keep the currency as **XAF**). Leave the price empty for free activities.
2. A person registers. If there is a price, they see **Choose how to pay**: **Mobile Money** (MTN or Orange, through Fapshi) or **Card** (through Flutterwave).
3. They pay on the payment company's secure page. When the payment is confirmed, their place is confirmed automatically.
4. The money goes to **your Fapshi or Flutterwave account**. From there you withdraw it to your Mobile Money number or bank account. The website never holds money and never sees card details.
5. You can see every payment in Dashboard > Payments.

The payment companies keep a small fee from each payment. Check the current rates on their websites.

### Before real payments work
Payments stay switched off until you set them up. Someone with access to the Netlify settings must:
1. Create accounts at **fapshi.com** and **flutterwave.com** and complete their business checks.
2. Test first with the test keys. Make a small test payment.
3. Replace the test keys with the live keys and set `PAYMENTS_MODE` to `both`.
4. Tell each payment company the website's confirmation address (see the technical guide, `HOW_TO_RUN.md`).

Until then, people who register for a paid item see "Online payment is not available yet" and you can contact them yourself.

## 3. Signing in as admin
- The site asks an administrator for a **6 digit code from an authenticator app** (Google Authenticator, Microsoft Authenticator or similar) every time you sign in. This is on purpose. It stops strangers from entering the Dashboard even if they learn your password. Keep your phone safe.
- Set it up once: Settings > Security > Two factor authentication. Save the recovery codes somewhere safe, such as a locked notebook.
- Never share your admin password or codes.

## 4. Who can do what
- **Administrator:** everything in the Dashboard.
- **Parents and guardians:** register themselves and their children, and pay.
- **Young people and adult members:** register themselves and pay.
- **Child learner accounts:** learn only. They never register or pay.

## 5. What costs money (typical)
- A **domain name** (about 10 to 20 USD a year).
- **Hosting** (Netlify) and the **database** have free plans to start. Paid plans may be needed as the site grows.
- **Email sending** (Resend) has a free plan to start.
- Payment fees, as above.

## 6. If something looks wrong
1. Refresh the page.
2. Sign out and in again.
3. If it is still wrong, send a screenshot and what you clicked to the developer, **Ndi Romarick Kati**.

Never delete the last administrator account.
