import { useEffect } from 'react';
import { useI18n } from './index';
import { lookupPhrase } from './phrases';

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SVG']);
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'] as const;

/**
 * Translates any plain English text still on screen (headings, paragraphs, cards, buttons, labels),
 * so a language change covers the whole page. Original English is remembered and restored when the
 * language goes back to English. Text without a translation is left as it is.
 */
export function DomTranslator() {
  const { lang } = useI18n();

  useEffect(() => {
    document.documentElement.lang = lang;
    const textState = new WeakMap<Node, { orig: string; shown: string }>();
    const attrState = new WeakMap<Element, Record<string, { orig: string; shown: string }>>();

    const swap = (text: string, to: string | undefined) => {
      if (!to) return text;
      const lead = text.match(/^\s*/)?.[0] ?? '';
      const trail = text.match(/\s*$/)?.[0] ?? '';
      return lead + to + trail;
    };

    const doText = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || SKIP.has(parent.tagName.toUpperCase()) || parent.closest('[data-no-translate],[contenteditable="true"]')) return;
      const st = textState.get(node);
      let orig = node.nodeValue ?? '';
      if (st) {
        if (orig === st.shown) orig = st.orig; // untouched since we set it
        else textState.delete(node); // React wrote new text
      }
      if (!orig.trim()) return;
      const next = lang === 'en' ? orig : swap(orig, lookupPhrase(lang, orig));
      if (next !== node.nodeValue) node.nodeValue = next;
      if (next !== orig) textState.set(node, { orig, shown: next });
      else textState.delete(node);
    };

    const doAttrs = (el: Element) => {
      if (el.closest('[data-no-translate]')) return;
      const rec = attrState.get(el) ?? {};
      for (const a of ATTRS) {
        const cur = el.getAttribute(a);
        if (cur == null) continue;
        const st = rec[a];
        const orig = st && cur === st.shown ? st.orig : cur;
        const tr = lang === 'en' ? undefined : lookupPhrase(lang, orig);
        const next = tr ?? orig;
        if (next !== cur) el.setAttribute(a, next);
        if (tr) rec[a] = { orig, shown: next };
        else delete rec[a];
      }
      attrState.set(el, rec);
    };

    const run = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let n: Node | null = root;
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
        else doAttrs(n as Element);
        n = walker.nextNode();
      }
    };

    run(document.body);

    let queued = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      const batch = queued;
      queued = new Set();
      observer.disconnect();
      batch.forEach((n) => n.isConnected && run(n));
      observer.observe(document.body, opts);
    };
    const opts: MutationObserverInit = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] };
    const observer = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => queued.add(n));
        else queued.add(m.target);
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(document.body, opts);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [lang]);

  return null;
}
