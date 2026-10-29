import type { SiteSettings } from './types';

/**
 * The policy pages are written from the facts entered in Dashboard > Settings > Legal details and
 * Organisation, so nobody has to edit text. Anything not entered yet shows as a highlighted gap that
 * names exactly where to fill it in. This is a well structured starting point, not legal advice:
 * a lawyer in the foundation's country should read the final pages before they are approved.
 */
export function buildPolicies(site: SiteSettings) {
  const { organization: org, contact, legal } = site;
  const gap = (what: string) => `[[Add ${what} in Dashboard > Settings > Legal details]]`;
  const name = legal.legalName ?? org.name;
  const email = contact.email ?? gap('the contact email (Settings > Contact)');
  const address = contact.address ?? gap('the postal address (Settings > Contact)');
  const reg = legal.registrationNumber ?? org.registrationDetails ?? gap('the registration number');
  const law = legal.governingLaw ?? gap('the governing law, for example "the laws of Cameroon"');
  const retention = legal.dataRetention ?? gap('how long you keep data');
  const sgName = legal.safeguardingName ?? gap('the safeguarding lead’s name');
  const sgContact = legal.safeguardingContact ?? contact.phone ?? email;
  const reviewed = legal.lastReviewed ?? gap('the date this was last reviewed');
  const refunds =
    legal.refundPolicy ??
    gap('your refund and cancellation rules');

  const privacy = `## Who we are

This website is run by **${name}** (${reg}), ${address}. We are responsible for the personal information described here. Last reviewed: ${reviewed}.

## What information we collect

We collect only what each part of the website needs:

- **Contact and enquiry forms:** your name, email address, optionally a phone number and organisation, and your message.
- **Accounts:** your name, email address and a securely hashed password (we never store or see your password). If you sign in with Google, we receive your name, email address and Google account identifier.
- **Young person accounts (16 and over):** the above, the age group you choose (16 to 17, 18 to 24 or 25 and over) and your learning progress. We do not ask for a date of birth.
- **Parent and guardian accounts:** the above, plus the learning accounts you create for your children.
- **Child learning accounts:** created by a parent or guardian. We store a first name or nickname, a username, an optional age range and learning progress. We do not ask for a child’s full name, date of birth, school, address or photo.
- **Registrations:** which program or event you registered for, and notes you choose to add.
- **Payments:** when you pay the access fee, the payment provider receives your name, email address and the amount. **We never see or store your card or mobile money details.** We keep a record that a payment was made (amount, date, provider and status).
- **Security records:** sign in times, device type and network address, to protect accounts.

## How we use it

We use this information to reply to you, provide accounts and the learning area, run registrations, take payments, keep accounts secure and meet our legal obligations. We rely on your consent, on what is needed to provide the service you asked for, and on our legitimate interest in keeping the service safe.

## What we do not do

- We do not sell personal information.
- We do not use advertising or behavioural tracking.
- We do not publish children’s names, photos or progress.

## Who handles data for us

We use a small number of services to run the website. They handle data only to provide their service to us:

- **Hosting and delivery:** Netlify.
- **Database:** Neon (PostgreSQL).
- **Sign in with Google (optional):** Google.
- **Payments:** Fapshi (mobile money, Cameroon) and Flutterwave (cards and other methods, worldwide).
- **Email:** the email service we use to send account messages, if switched on.

Some of these providers are based outside Cameroon, so your information may be processed in other countries. Only authorised foundation staff can see personal information, and only what they need for their role. Instructors see the first names of children registered in programs they are assigned to, never parents’ contact details.

## How long we keep it

${retention}

## Your choices and rights

You can view and update your details, download a copy of your data, and ask us to correct or delete it from Settings, Privacy. Parents and guardians manage these choices for their children. You can also contact us at ${email}. The applicable law is ${law}.

## Children

Children under 16 cannot create accounts themselves. A parent or guardian creates and manages the account and gives consent. See our [Child safety page](/child-safety) and [Consent information](/consent).

## Complaints

If you are unhappy with how we have handled your information, please tell us first at ${email} and we will respond as soon as we can. You also have the right to complain to the data protection authority in your country.

## Changes to this notice

We may update this notice when the website or the law changes. The date it was last reviewed is shown at the top of this page, and we will say clearly when something important changes.

## Contact

Questions about privacy: ${email}.`;

  const terms = `## About these terms

These terms apply when you use this website, run by **${name}** (${reg}). By creating an account or using the website you agree to them. Last reviewed: ${reviewed}.

## Who can use the website

- Anyone can browse the public pages and the public lessons.
- Young people aged 16 and over can create their own account.
- Children under 16 can only use the learning area with an account created by a parent or guardian, who is responsible for it.

## Your account

Keep your password safe and turn on two factor authentication where available. You are responsible for what happens on your account. Tell us at once if you think someone else has used it.

## Access fee and payments

Using your account and the learning area, saving progress, adding children and registering for programs needs a paid access period. The price and length of the period are shown on the payment page before you pay. You pay on the secure page of our payment provider (Fapshi for mobile money, Flutterwave for cards and other methods). We never see or store your card or mobile money details. Access starts when the payment provider confirms your payment. A parent’s access also covers the learning accounts of their children.

## Refunds and cancellation

${refunds}

## Acceptable use

Be respectful. Do not try to break into the website or other people’s accounts, share your account, copy the lessons to resell them, or use the website to harm, harass or deceive anyone.

## Content

Information about programs and events may change. Program pages describe what is offered and do not promise particular results, certificates or opportunities unless clearly stated. The lessons, images and design belong to ${name} or are used with permission. You may use them for your own learning, not for resale.

## Ending access

We may suspend or close an account that breaks these terms or puts others at risk. You can stop using the website at any time and ask us to delete your account.

## Limits of our responsibility

We work to keep the website available and accurate, but we cannot promise it will always be uninterrupted or error free. To the extent the law allows, we are not responsible for losses that come from using, or being unable to use, the website.

## Changes to these terms

We may update these terms. The date of the latest review is shown at the top.

## Governing law and contact

These terms are governed by ${law}. Questions: ${email}.`;

  const childSafety = `## Our commitment

The safety and wellbeing of children comes first in everything ${name} does, online and in person.

## How this website protects children

- Children under 16 cannot create their own accounts. A parent or guardian creates a learning account and gives consent. Young people aged 16 and over can register themselves, and they only get the learning area, with no chat or messaging.
- There is no chat, messaging or comments feature, so adults cannot contact children through the website.
- Children’s names, photos and progress are never shown publicly.
- We collect the minimum information needed, and only a nickname is required for a child.
- Instructors can only see children registered in programs they are assigned to.
- We do not use location tracking, advertising or behavioural analytics.
- We do not publish identifiable images of children without documented guardian permission and the foundation’s approval.

## Adults working with children

Everyone who works or volunteers with children for ${name} must agree to follow this policy, is never left alone online with a child through our systems, and must report any concern straight away. Staff accounts need two factor authentication.

## Raising a concern

If you are worried about a child’s safety, contact our safeguarding lead, **${sgName}**, on ${sgContact}. If a child is in immediate danger, contact local emergency services first.

## Reviewing this policy

This policy is reviewed regularly and after any incident. Last reviewed: ${reviewed}.`;

  const consent = `## Why we ask for consent

When a child uses a learning account or takes part in an activity, we ask a parent or guardian to agree first. Each consent is recorded with the date and the version of the information shown.

## The kinds of consent we ask for

- **Learning account:** permission for your child to use the learning area with an account you manage.
- **Program or event participation:** permission for your child to take part in a specific program or event.
- **Photography:** optional, and never assumed. We only use a child’s photo if a parent or guardian agrees in writing for that purpose.
- **Young people aged 16 and over:** confirm their own age when they join and agree to the website terms.

## Changing your mind

You can withdraw consent at any time from Settings, Family. Withdrawing consent for a learning account pauses the account straight away.

## Questions

${email}.`;

  const cookies = `## What this site stores

This website keeps cookies and browser storage to a minimum. It does not use advertising cookies, and there is no tracking or advertising in the learning area.

## Cookies

- **Sign in session (lvf_session):** set only when you sign in. It keeps you signed in as you move between pages and is removed when you sign out or the session ends. Scripts on the page cannot read it. The site cannot work for signed in users without it.

## Browser storage

- **Display preferences (lvf.visitorPrefs):** remembers your theme (light, dark or system), language, and choices such as turning animation on or off. It stays in your browser. If you are signed in, the same choices are also saved to your account.
- **Cookie choice (lvf.cookieConsent):** remembers whether you allowed analytics, so the banner does not ask again on every page. It expires after twelve months.
- **Google sign in (lvf_google_oauth):** a short lived cookie, only set if you choose to sign in with Google. It protects the sign in from forgery and is deleted within ten minutes.

## Categories

- **Strictly necessary:** the session cookie, sign in protection and the preferences above. They are always on because the site cannot work without them.
- **Analytics (optional):** off unless you allow it. It only loads after you choose "Accept all" or switch analytics on, and never in the learning area or signed in dashboards. At the time of writing no analytics service is connected.

You can change your choice at any time with the **Cookie settings** link at the bottom of every page.

## Payment pages

When you pay, you leave this website and use the secure page of our payment provider (Fapshi or Flutterwave). That page has its own cookies and privacy notice.

## Other websites

Links to social networks, WhatsApp and other websites open those services in a new tab. They have their own cookie policies.

## Managing cookies

You can delete cookies and site data from your browser settings at any time. If you delete the session cookie you will be signed out.

## Questions

${email}.`;

  const accessibility = `## Our aim

We want everyone to be able to use this website, including children, parents and carers with disabilities.

## What the site offers

- Every page can be used with a keyboard, and a skip link leads straight to the main content.
- Text and controls are designed for strong colour contrast.
- Animation can be turned off at the bottom of the site, and the site follows the reduced motion setting on your device.
- Signed in users can choose larger text and always underlined links in Settings, Accessibility.
- Pages adapt to phones, tablets and desktop screens, and text can be zoomed.

## Known limitations

This website has not yet had an independent accessibility audit, so we do not claim conformance with a particular standard.

## Tell us about a problem

If something is hard to use, please tell us which page and which device you were using, at ${email}. We use your feedback to improve the site.`;

  return { privacy, terms, childSafety, consent, cookies, accessibility };
}

/** The facts still missing, for the checklist in the dashboard. */
export function missingLegalFacts(site: SiteSettings): string[] {
  const { legal, contact, organization } = site;
  const out: string[] = [];
  if (!(legal.legalName ?? organization.name)) out.push('Legal name');
  if (!(legal.registrationNumber ?? organization.registrationDetails)) out.push('Registration number');
  if (!contact.email) out.push('Contact email (Settings > Contact)');
  if (!contact.address) out.push('Postal address (Settings > Contact)');
  if (!legal.governingLaw) out.push('Governing law');
  if (!legal.dataRetention) out.push('How long you keep data');
  if (!legal.safeguardingName) out.push('Safeguarding lead name');
  if (!legal.refundPolicy) out.push('Refund and cancellation rules');
  if (!legal.lastReviewed) out.push('Date last reviewed');
  return out;
}
