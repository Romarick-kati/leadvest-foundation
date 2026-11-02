/** The currencies a price can be set in. Mobile Money (Fapshi) only handles FCFA; cards handle all of them. */
export const PRICE_CURRENCIES = ['XAF', 'USD', 'EUR'] as const;

/** A usable currency code. Bad or missing data falls back to FCFA instead of breaking payment. */
export function safeCurrency(code: string | null | undefined): string {
  const c = (code ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : 'XAF';
}
