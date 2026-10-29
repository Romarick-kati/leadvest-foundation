import { useLocation } from 'react-router-dom';
import { useT } from '../../i18n';
import { WhatsApp } from '../ui/icons';
import { useSite } from '../../lib/site';
import { whatsappLink } from '../../lib/contact';

// Never shown in the children's learning area (no adult to child messaging) or on account,
// sign in and dashboard screens, where it would sit over form controls.
const HIDDEN = [/^\/learning/, /^\/sign-in/, /^\/register/, /^\/settings/, /^\/account/, /^\/instructor/, /^\/setup/, /^\/reset-password/, /^\/forgot-password/, /^\/payments/];

/** Floating chat button. Hidden until a WhatsApp number is configured. */
export function WhatsAppButton() {
  const t = useT();
  const { site } = useSite();
  const { pathname } = useLocation();
  const href = whatsappLink(site);
  if (!href || HIDDEN.some((r) => r.test(pathname))) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsapp.label')}
      className="group safe-bottom safe-right fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white no-underline shadow-lift transition-[transform,background-color] duration-200 hover:bg-whatsapp-700 motion-safe:hover:-translate-y-0.5 focus-visible:outline-offset-4"
    >
      <WhatsApp size={28} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-navy px-3 py-1.5 text-sm font-semibold text-white opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
        {t('whatsapp.tooltip')}
      </span>
    </a>
  );
}
