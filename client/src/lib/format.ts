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

/** Currencies a price can be set in. Mobile Money handles FCFA only; cards handle all of them. */
export const CURRENCY_OPTIONS = [
  { value: 'XAF', label: 'FCFA (XAF)' },
  { value: 'USD', label: 'US dollars (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
];

/** A usable currency code. Missing or invalid data falls back to FCFA instead of showing nonsense. */
export const asCurrency = (code: string | null | undefined) => (/^[A-Za-z]{3}$/.test((code ?? '').trim()) ? code!.trim().toUpperCase() : 'XAF');

export function formatMoney(cents: number | null | undefined, currency: string | null | undefined) {
  if (cents == null) return null;
  const code = asCurrency(currency);
  // XAF and similar currencies have no minor unit; amounts are stored in the smallest unit times 100.
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

/** Time zones offered when creating an event. The first is the foundation's home zone. */
export const TIME_ZONES = [
  { value: 'Africa/Douala', label: 'Cameroon (Douala, WAT)' },
  { value: 'Africa/Lagos', label: 'Nigeria (Lagos, WAT)' },
  { value: 'Africa/Nairobi', label: 'East Africa (Nairobi, EAT)' },
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  { value: 'Europe/London', label: 'United Kingdom (London)' },
  { value: 'Europe/Paris', label: 'Central Europe (Paris)' },
  { value: 'America/New_York', label: 'US East (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Los_Angeles', label: 'US West (Los Angeles)' },
  { value: 'America/Toronto', label: 'Canada East (Toronto)' },
  { value: 'UTC', label: 'UTC' },
];

/** The visitor's own time zone, for example "Europe/Paris". Empty when the browser does not say. */
export const viewerTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

const zoneParts = (ms: number, timeZone: string) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const g = (k: string) => Number(p.find((x) => x.type === k)!.value);
  return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour'), mi: g('minute'), s: g('second') };
};

/** Turns an instant into the "2026-10-30T17:45" text a date field needs, as the clock reads in `timeZone`. */
export function isoToZonedInput(iso: string | null | undefined, timeZone: string) {
  if (!iso) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  try {
    const z = zoneParts(new Date(iso).getTime(), timeZone);
    return `${z.y}-${pad(z.mo)}-${pad(z.d)}T${pad(z.h)}:${pad(z.mi)}`;
  } catch {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
}

/** The reverse: "2026-10-30T17:45" read as a clock time in `timeZone`, returned as an ISO instant. */
export function zonedInputToIso(value: string, timeZone: string) {
  if (!value) return null;
  const [date, time = '00:00'] = value.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  try {
    const offset = (ms: number) => { const z = zoneParts(ms, timeZone); return Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s) - ms; };
    let guess = wall - offset(wall);
    guess = wall - offset(guess);
    return new Date(guess).toISOString();
  } catch {
    return new Date(value).toISOString();
  }
}

/** When registration stops: the deadline if there is one, otherwise the end of the event. */
export function registrationClosesAt(e: { registrationDeadline: string | null; endsAt: string | null; startsAt: string }) {
  if (e.registrationDeadline) return new Date(e.registrationDeadline);
  if (e.endsAt) return new Date(e.endsAt);
  return new Date(new Date(e.startsAt).getTime() + 3 * 3_600_000);
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

/** A short summary made from the start of a description, for when the person leaves the summary empty. */
export function autoSummary(text: string, max = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > 60 ? cut.slice(0, stop + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

/** Currencies an editor may choose, based on the payment methods that are switched on. Mobile Money handles FCFA only. */
export function currencyChoices(providers: string[] | undefined) {
  const card = !providers || providers.some((p) => p === 'flutterwave' || p === 'mock');
  return card ? CURRENCY_OPTIONS : CURRENCY_OPTIONS.filter((o) => o.value === 'XAF');
}
