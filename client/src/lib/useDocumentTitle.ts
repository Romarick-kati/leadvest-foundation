import { useEffect } from 'react';

const DEFAULT_DESCRIPTION = 'Lead Vest Foundation helps children and young people learn, grow and become confident leaders.';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets the page title, and keeps the description, canonical address and sharing details in step with
 * the page, so search results and shared links show the right words.
 */
export function useDocumentTitle(title: string | undefined, description?: string) {
  useEffect(() => {
    const full = title ? `${title} | Lead Vest Foundation` : 'Lead Vest Foundation';
    document.title = full;
    const text = (description ?? DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160);
    setMeta('meta[name="description"]', 'name', 'description', text);
    setMeta('meta[property="og:title"]', 'property', 'og:title', full);
    setMeta('meta[property="og:description"]', 'property', 'og:description', text);
    const url = `${window.location.origin}${window.location.pathname === '/' ? '' : window.location.pathname}`;
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description]);
}
