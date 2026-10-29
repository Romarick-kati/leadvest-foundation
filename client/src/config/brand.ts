/**
 * Single place for brand assets. The official Lead Vest Foundation logo is installed.
 * Files live in public/images/branding/. The "-light" files have the dark navy parts turned
 * white, for dark backgrounds (footer, dashboard sidebar, dark theme).
 * An administrator can still override the logo from Dashboard > Settings > Branding.
 */
export const brand = {
  name: 'Lead Vest Foundation',
  shortName: 'LVF',
  logo: {
    mark: '/images/branding/logo-mark.webp',
    markLight: '/images/branding/logo-mark-light.webp',
    wordmark: '/images/branding/logo-wordmark.webp',
    wordmarkLight: '/images/branding/logo-wordmark-light.webp',
    full: '/images/branding/logo-full.webp',
    fullLight: '/images/branding/logo-full-light.webp',
    favicon: '/images/branding/favicon-64.png',
    isPlaceholder: false,
  },
};
