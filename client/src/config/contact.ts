/**
 * Public contact details used until an administrator enters their own in
 * Dashboard > Settings > Contact (those always take priority once saved).
 *
 * These were supplied by the site owner and have NOT been independently verified.
 * Confirm each one before publishing. WhatsApp is switched on with the first number; change
 * `whatsapp` to a different number (digits only, country code first, no + or spaces) or set
 * it to null to hide the floating button.
 */
export const defaultContact = {
  email: 'Info@nevilleebaiconsulting.com',
  phones: ['+237650945402', '+237651046000', '+12029615067'],
  whatsapp: '237650945402' as string | null,
  whatsappMessage: null as string | null,
  /**
   * Social media links as supplied by the site owner. They currently open a Google search, not a
   * profile page. Replace each url with the real profile address, e.g. https://www.facebook.com/<page>.
   */
  social: [
    { label: 'Facebook', url: 'https://www.google.com/search?q=Neville+Ebai+official+Facebook' },
    { label: 'Instagram', url: 'https://www.google.com/search?q=Neville+Ebai+official+Instagram' },
    { label: 'LinkedIn', url: 'https://www.google.com/search?q=Neville+Ebai+official+LinkedIn' },
    { label: 'YouTube', url: 'https://www.google.com/search?q=Neville+Ebai+official+YouTube' },
    { label: 'TikTok', url: 'https://www.google.com/search?q=Neville+Ebai+official+TikTok' },
    { label: 'X', url: 'https://www.google.com/search?q=Neville+Ebai+official+X+Twitter' },
  ] as { label: string; url: string }[],
  website: 'https://nevilleebaiconsulting.com/',
  aboutPage: 'https://nevilleebaiconsulting.com/about-us/',
};

/** Readable grouping: +237 650 945 402, +1 202 961 5067. Other countries are shown as typed. */
export function formatPhone(phone: string) {
  const d = phone.replace(/[^\d+]/g, '');
  let m = d.match(/^\+237(\d{3})(\d{3})(\d{3})$/);
  if (m) return `+237 ${m[1]} ${m[2]} ${m[3]}`;
  m = d.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+1 ${m[1]} ${m[2]} ${m[3]}`;
  return phone;
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
