import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, h, send } from '../lib/http.js';
import { emailSchema, nameSchema, parse } from '../lib/validate.js';
import { formLimiter } from '../middleware/security.js';
import { sendEmail } from '../services/email/index.js';
import { templates } from '../services/email/templates.js';

export const enquiriesRouter = Router();

const MIN_FILL_MS = 2500;

/**
 * How long the form was open. The browser's own stopwatch (elapsedMs) is trusted first because it
 * does not depend on the visitor's clock matching the server's clock. The older startedAt value is
 * only used when it gives a believable answer: a phone whose clock is ahead of the server would
 * otherwise produce a negative time and real people would be told to "take a moment" forever.
 */
function openDuration(elapsedMs?: number, startedAt?: number): number | undefined {
  if (elapsedMs !== undefined) return elapsedMs;
  if (startedAt === undefined) return undefined;
  const diff = Date.now() - startedAt;
  return diff >= 0 && diff < 24 * 60 * 60 * 1000 ? diff : undefined;
}

export const ENQUIRY_CATEGORIES = ['general', 'programs', 'events', 'parents', 'volunteer', 'mentor', 'partner', 'support', 'media', 'feedback', 'other'] as const;

enquiriesRouter.post(
  '/',
  formLimiter,
  h(async (req, res) => {
    const body = parse(
      z.object({
        category: z.enum(ENQUIRY_CATEGORIES),
        name: nameSchema,
        email: emailSchema,
        phone: z.string().trim().max(40).optional().transform((v) => v || undefined),
        organization: z.string().trim().max(120).optional().transform((v) => v || undefined),
        subject: z.string().trim().max(150).optional().transform((v) => v || undefined),
        message: z.string().trim().min(10, 'Please write a little more so we can help.').max(5000),
        // Spam protection: a hidden field people never fill in, and the time the form was opened.
        website: z.string().max(0, 'Spam check failed.').optional(),
        startedAt: z.number().int().optional(),
        // How long the form was open, measured in the visitor's browser. Unlike startedAt this does
        // not depend on the visitor's clock matching the server's clock.
        elapsedMs: z.number().int().min(0).optional(),
        consent: z.literal(true, { error: 'Please confirm we may use these details to reply to you.' }),
      }),
      req.body,
    );
    const openForMs = openDuration(body.elapsedMs, body.startedAt);
    if (openForMs !== undefined && openForMs < MIN_FILL_MS) throw badRequest('Please take a moment before sending.');
    const { website: _w, startedAt: _s, elapsedMs: _e, consent: _c, ...data } = body;
    const enquiry = await prisma.enquiry.create({ data, select: { id: true, createdAt: true } });
    const confirmation = await sendEmail(templates.enquiryReceived(body.email, body.name));
    send(res, { id: enquiry.id, confirmationEmailDelivered: confirmation.delivered }, 201);
  }),
);
