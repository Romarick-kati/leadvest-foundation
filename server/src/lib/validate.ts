import { z } from 'zod';
import { badRequest } from './http.js';

/**
 * For partial updates: parses with the schema made optional, then keeps only the fields the
 * request actually sent, so defaults meant for creation (such as status DRAFT) never
 * overwrite stored values.
 */
export function parsePatch<T extends z.ZodRawShape>(schema: z.ZodObject<T>, input: unknown) {
  const data = parse(schema.partial(), input) as Record<string, unknown>;
  const sent = input && typeof input === 'object' ? Object.keys(input) : [];
  return Object.fromEntries(Object.entries(data).filter(([k]) => sent.includes(k))) as Partial<z.infer<z.ZodObject<T>>>;
}

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw badRequest('Please check the highlighted fields.', fields);
  }
  return result.data;
}

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(200, 'Use at most 200 characters.')
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), 'Include at least one letter and one number.');

export const emailSchema = z.string().trim().toLowerCase().max(254).email('Enter a valid email address.');
export const nameSchema = z.string().trim().min(1, 'This field is required.').max(80);
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
