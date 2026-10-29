import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { brand } from '../../config/brand';
import { useSite } from '../../lib/site';
import { assetUrl } from '../../lib/api';
import { cn } from '../../lib/cn';

type Tone = 'navy' | 'white';

/**
 * Logo used everywhere (header, footer, mobile menu, dashboard, auth screens).
 * Built from the official artwork in three animated parts: the symbol (pops in, star twinkles,
 * light sweeps across), the divider (grows) and the wordmark (reveals). All motion is plain CSS
 * (see styles/index.css) and switches off for visitors who prefer reduced motion.
 * If an administrator uploads a different logo in Settings > Branding, that image is used instead.
 *
 * size   height of the symbol in px. With `fluid` it grows slightly on very large screens.
 * tone   "white" is for dark backgrounds. In the normal tone the dark theme switches by itself.
 */
export function Logo({
  to = '/',
  size = 40,
  showName = true,
  tone = 'navy',
  fluid = false,
  animate = true,
  className,
}: {
  to?: string | null;
  size?: number;
  showName?: boolean;
  tone?: Tone;
  fluid?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const { site } = useSite();
  const custom = assetUrl(site.branding.logoUrl);
  const customMark = assetUrl(site.branding.logoMarkUrl);
  const name = site.organization.name || brand.name;
  const alt = site.branding.logoAlt || name;
  const L = brand.logo;
  const style = { '--logo-h': `${size}px` } as CSSProperties;

  // Pair of images: dark-on-light and light-on-dark. In "white" tone only the light one shows.
  const pair = (dark: string, light: string, cls: string) =>
    tone === 'white' ? (
      <img src={light} alt="" draggable={false} className={cls} />
    ) : (
      <>
        <img src={dark} alt="" draggable={false} className={cn(cls, 'lv-on-light')} />
        <img src={light} alt="" draggable={false} className={cn(cls, 'lv-on-dark')} />
      </>
    );

  let content;
  if (custom && showName) {
    content = <img src={custom} alt={alt} style={{ height: size }} className="w-auto max-w-full object-contain" />;
  } else if (!showName) {
    content = (
      <span className={cn('lv-logo', animate && 'lv-animate', fluid && 'lv-fluid')} style={style}>
        <span className="lv-mark">
          {customMark ? <img src={customMark} alt="" /> : pair(L.mark, L.markLight, 'lv-img')}
          <span className="lv-star" aria-hidden="true" />
        </span>
        <span className="sr-only">{name}</span>
      </span>
    );
  } else {
    content = (
      <span className={cn('lv-logo', animate && 'lv-animate', fluid && 'lv-fluid')} style={style}>
        <span className="lv-mark">
          {customMark ? <img src={customMark} alt="" className="lv-img" /> : pair(L.mark, L.markLight, 'lv-img')}
          <span className="lv-star" aria-hidden="true" />
          <span className="lv-shine" aria-hidden="true" style={{ maskImage: `url(${L.mark})`, WebkitMaskImage: `url(${L.mark})` }} />
        </span>
        <span className={cn('lv-divider', tone === 'white' ? 'bg-white/80' : 'lv-divider-auto')} aria-hidden="true" />
        <span className="lv-word">{pair(L.wordmark, L.wordmarkLight, 'lv-img')}</span>
        <span className="sr-only">{name}</span>
      </span>
    );
  }

  if (to === null) return <span className={className}>{content}</span>;
  return (
    <Link to={to} className={cn('lv-link inline-flex shrink-0 items-center rounded no-underline', className)} aria-label={`${name} home`}>
      {content}
    </Link>
  );
}
