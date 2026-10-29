// Plain, responsive email templates. Branding values come from site settings when
// the foundation confirms them; until then the organization name is used alone.

const NAVY = '#142B4A';
const BLUE = '#3478F6';

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title></head>
<body style="margin:0;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;color:#273449;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #E5EAF1;border-radius:12px;">
<tr><td style="padding:24px 28px;border-bottom:4px solid #FFD65A;">
<span style="font-size:18px;font-weight:bold;color:${NAVY};">Lead Vest Foundation</span></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:22px;color:${NAVY};">${escape(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;font-size:12px;color:#5B6B82;border-top:1px solid #E5EAF1;">
This is a service message about your account or a request you made. You cannot unsubscribe from essential account and security messages.
</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${escape(href)}" style="background:${BLUE};color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block;">${escape(label)}</a></p>
<p style="font-size:13px;color:#5B6B82;">If the button does not work, copy this link into your browser:<br>${escape(href)}</p>`;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** An announcement from the foundation. Optional news, so it says how to turn these emails off. */
export function announcementEmail(to: string, name: string, title: string, body: string, link: string | null, manageLink: string): EmailMessage {
  const paragraphs = body.split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('');
  return {
    to,
    subject: title,
    html: layout(title, `<p>Hello ${escape(name)},</p>${paragraphs}${link ? button(link, 'See more') : ''}<p style="font-size:13px;color:#5B6B82;">You receive this because you chose to hear about our news. <a href="${escape(manageLink)}">Change this in your notification settings</a>.</p>`),
    text: `Hello ${name},\n\n${body}\n\n${link ? `${link}\n\n` : ''}You receive this because you chose to hear about our news. Change it here: ${manageLink}`,
  };
}

export const templates = {
  verifyEmail: (to: string, name: string, link: string): EmailMessage => ({
    to,
    subject: 'Please confirm your email address',
    html: layout('Confirm your email', `<p>Hello ${escape(name)},</p><p>Thanks for creating an account. Please confirm this is your email address.</p>${button(link, 'Confirm email')}<p>This link expires in 24 hours.</p>`),
    text: `Hello ${name},\n\nPlease confirm your email address: ${link}\n\nThis link expires in 24 hours.`,
  }),
  passwordReset: (to: string, name: string, link: string): EmailMessage => ({
    to,
    subject: 'Reset your password',
    html: layout('Reset your password', `<p>Hello ${escape(name)},</p><p>We received a request to reset your password. If this was you, choose a new password below.</p>${button(link, 'Choose a new password')}<p>This link expires in 1 hour. If you did not ask for this, you can ignore this email.</p>`),
    text: `Hello ${name},\n\nReset your password: ${link}\n\nThis link expires in 1 hour. If you did not ask for this, ignore this email.`,
  }),
  accountSetup: (to: string, name: string, link: string): EmailMessage => ({
    to,
    subject: 'Set up your Lead Vest Foundation account',
    html: layout('Set up your account', `<p>Hello ${escape(name)},</p><p>An administrator created an account for you. Choose your password to get started.</p>${button(link, 'Set my password')}<p>This link expires in 1 hour.</p>`),
    text: `Hello ${name},\n\nSet your password: ${link}\n\nThis link expires in 1 hour.`,
  }),
  securityAlert: (to: string, name: string, what: string): EmailMessage => ({
    to,
    subject: 'Security change on your account',
    html: layout('Security change', `<p>Hello ${escape(name)},</p><p>${escape(what)}</p><p>If this was not you, reset your password straight away and contact the foundation.</p>`),
    text: `Hello ${name},\n\n${what}\n\nIf this was not you, reset your password straight away and contact the foundation.`,
  }),
  enquiryReceived: (to: string, name: string): EmailMessage => ({
    to,
    subject: 'We received your message',
    html: layout('Thank you for getting in touch', `<p>Hello ${escape(name)},</p><p>We have received your message and someone from the foundation will reply as soon as possible.</p>`),
    text: `Hello ${name},\n\nWe have received your message and someone from the foundation will reply as soon as possible.`,
  }),
  registrationConfirmation: (to: string, name: string, item: string, status: string): EmailMessage => {
    // Plain wording for the person reading: accepted, waiting list, or not accepted.
    const word = ({ CONFIRMED: 'accepted', WAITLISTED: 'on the waiting list', CANCELLED: 'not accepted', PENDING: 'waiting for review' } as Record<string, string>)[status] ?? status.toLowerCase();
    return {
      to,
      subject: `Registration update: ${item}`,
      html: layout('Registration update', `<p>Hello ${escape(name)},</p><p>Your registration for <strong>${escape(item)}</strong> is now <strong>${escape(word)}</strong>.</p>`),
      text: `Hello ${name},\n\nYour registration for ${item} is now ${word}.`,
    };
  },
};
