/** Locale used for dates, numbers and money. Set by the translation layer (i18n). */
let locale: string | undefined;
export function setFormatLocale(tag: string) {
  locale = tag;
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }, timeZone?: string) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date, timeZone?: string) {
  return formatDate(iso, { dateStyle: 'medium', timeStyle: 'short' }, timeZone);
}

export function formatMoney(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents == null || !currency) return null;
  // XAF and similar currencies have no minor unit; amounts are stored in the smallest unit times 100.
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export const titleCase = (s: string) => s.toLowerCase().replace(/(^|_|\s)(\w)/g, (_m, sep, c) => (sep === '_' ? ' ' : sep) + c.toUpperCase());

export function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export const roleLabel: Record<string, string> = {
  PARENT: 'Parent or guardian',
  LEARNER: 'Learner',
  YOUTH: 'Young person',
  MEMBER: 'New member (role not chosen yet)',
  INSTRUCTOR: 'Instructor or mentor',
  ADMIN: 'Administrator',
};

export const formatNumber = (n: number, opts: Intl.NumberFormatOptions = {}) => new Intl.NumberFormat(locale, opts).format(n);
