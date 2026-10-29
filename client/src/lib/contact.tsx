import { ExternalLink, Facebook, Instagram, LinkedIn, TikTok, WhatsApp, XSocial, YouTube, type IconComponent } from '../components/ui/icons';
import type { SiteSettings } from './types';

/** Recognised social networks, matched by the profile address an administrator enters. */
const NETWORKS: { match: RegExp; name: string; icon: IconComponent; color: string }[] = [
  { match: /(^|\.)facebook\.com$|(^|\.)fb\.com$/, name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { match: /(^|\.)instagram\.com$/, name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { match: /(^|\.)linkedin\.com$/, name: 'LinkedIn', icon: LinkedIn, color: '#0A8FE8' },
  { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/, name: 'YouTube', icon: YouTube, color: '#FF3B30' },
  { match: /(^|\.)tiktok\.com$/, name: 'TikTok', icon: TikTok, color: '#25F4EE' },
  { match: /(^|\.)x\.com$|(^|\.)twitter\.com$/, name: 'X', icon: XSocial, color: '#FFFFFF' },
  { match: /(^|\.)wa\.me$|(^|\.)whatsapp\.com$/, name: 'WhatsApp', icon: WhatsApp, color: '#25D366' },
];

export interface SocialLink {
  url: string;
  name: string;
  icon: IconComponent;
  color: string;
}

/** Social links from Dashboard > Settings, with the right brand icon. Nothing is invented. */
export function socialLinks(site: SiteSettings): SocialLink[] {
  return site.contact.social.flatMap((s) => {
    try {
      const host = new URL(s.url).hostname.replace(/^www\./, '');
      // Match by address first, then by the label (some links are search or short addresses).
      const network = NETWORKS.find((n) => n.match.test(host)) ?? NETWORKS.find((n) => n.name.toLowerCase() === s.label.trim().toLowerCase());
      return [{ url: s.url, name: s.label || network?.name || host, icon: network?.icon ?? ExternalLink, color: network?.color ?? '#F7C948' }];
    } catch {
      return [];
    }
  });
}

const DEFAULT_GREETING = 'Hello, I would like to learn more about your programs.';

/**
 * WhatsApp chat link in the official https://wa.me/<number> format. The number comes from
 * Dashboard > Settings, or VITE_WHATSAPP_NUMBER at build time. Returns null until one is set.
 */
export function whatsappLink(site: SiteSettings): string | null {
  const configured = site.contact.whatsapp || (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || '';
  const number = configured.replace(/\D/g, '');
  if (number.length < 8 || number.length > 15) return null;
  const text = site.contact.whatsappMessage || DEFAULT_GREETING;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** True when at least one official social profile has been configured. */
export const hasSocial = (site: SiteSettings) => socialLinks(site).length > 0;

export function SocialIcons({ site, tone = 'light', size = 18 }: { site: SiteSettings; tone?: 'light' | 'dark'; size?: number }) {
  const links = socialLinks(site);
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Social media">
      {links.map(({ url, name, icon: Icon }) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} (opens in a new tab)`}
            className={
              tone === 'dark'
                ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white no-underline transition-colors hover:bg-white hover:text-navy'
                : 'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-heading no-underline transition-colors hover:border-blue-600 hover:text-blue-700'
            }
          >
            <Icon size={size} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Round brand-coloured tiles with the network's logo, for the footer. */
export function SocialTiles({ links, size = 20 }: { links: { url: string; name: string; icon: IconComponent; color: string }[]; size?: number }) {
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label="Social media">
      {links.map(({ url, name, icon: Icon, color }) => (
        <li key={name + url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${name} (opens in a new tab)`}
            title={name}
            style={{ color, backgroundColor: `${color}1f`, borderColor: `${color}55` }}
            className="flex h-12 w-12 items-center justify-center rounded-xl border no-underline transition-[transform,background-color] duration-200 hover:-translate-y-1 hover:scale-110 hover:!bg-white/20 focus-visible:outline-offset-4"
          >
            <Icon size={size} />
          </a>
        </li>
      ))}
    </ul>
  );
}
