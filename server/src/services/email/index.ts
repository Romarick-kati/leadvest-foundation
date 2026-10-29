import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { EmailMessage } from './templates.js';

export interface EmailResult {
  delivered: boolean;
  transport: string;
}

/** Messages captured in tests so flows (like password reset) can be exercised end to end. */
export const testOutbox: EmailMessage[] = [];

let transporter: Transporter | null = null;
function smtp() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export function emailConfigured() {
  if (env.EMAIL_TRANSPORT === 'resend') return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  return env.EMAIL_TRANSPORT === 'smtp' && Boolean(env.SMTP_HOST && env.EMAIL_FROM);
}

async function resendCall(path: string, body: unknown): Promise<boolean> {
  const r = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) logger.error({ status: r.status, detail: (await r.text()).slice(0, 300) }, 'Resend rejected the email');
  return r.ok;
}

/** Sends many emails at once (Resend takes up to 100 per request). Returns how many were accepted. */
export async function sendBulkEmail(messages: EmailMessage[]): Promise<number> {
  if (env.isTest) { testOutbox.push(...messages); return 0; }
  if (!messages.length || !emailConfigured()) return 0;
  let sent = 0;
  if (env.EMAIL_TRANSPORT === 'resend') {
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        if (await resendCall('/emails/batch', chunk.map((m) => ({ from: env.EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text })))) sent += chunk.length;
      } catch (err) {
        logger.error({ err }, 'bulk email failed');
      }
    }
    return sent;
  }
  for (const m of messages) if ((await sendEmail(m)).delivered) sent += 1;
  return sent;
}

/**
 * Sends an email. With EMAIL_TRANSPORT=console (development) the message is printed to the
 * server log and is NOT delivered. With disabled, nothing is sent. Callers must not tell the
 * user an email was delivered unless result.delivered is true.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (env.isTest) {
    testOutbox.push(message);
    return { delivered: false, transport: 'test' };
  }
  if (env.EMAIL_TRANSPORT === 'disabled') return { delivered: false, transport: 'disabled' };
  if (env.EMAIL_TRANSPORT === 'console' || !emailConfigured()) {
    logger.info({ to: message.to, subject: message.subject }, 'email not delivered (development console transport)');
    console.log(`\n----- DEVELOPMENT EMAIL (not delivered) -----\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n---------------------------------------------\n`);
    return { delivered: false, transport: 'console' };
  }
  if (env.EMAIL_TRANSPORT === 'resend') {
    try {
      const ok = await resendCall('/emails', { from: env.EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text });
      return { delivered: ok, transport: 'resend' };
    } catch (err) {
      logger.error({ err, subject: message.subject }, 'email delivery failed');
      return { delivered: false, transport: 'resend' };
    }
  }
  try {
    await smtp().sendMail({ from: env.EMAIL_FROM, ...message });
    return { delivered: true, transport: 'smtp' };
  } catch (err) {
    logger.error({ err, subject: message.subject }, 'email delivery failed');
    return { delivered: false, transport: 'smtp' };
  }
}
