import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '../../i18n';
import { WhatsApp } from '../ui/icons';
import { X, Send } from '../ui/icons';
import { useSite } from '../../lib/site';
import { isChatAvailable, whatsappLinkWith } from '../../lib/contact';

// Never shown in the children's learning area (no adult to child messaging) or on account,
// sign in and dashboard screens, where it would sit over form controls.
const HIDDEN = [/^\/learning/, /^\/sign-in/, /^\/register/, /^\/settings/, /^\/account/, /^\/instructor/, /^\/setup/, /^\/reset-password/, /^\/forgot-password/, /^\/payments/];

const TEASER_KEY = 'lvf-wa-teaser';
const safeSession = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } },
};

/**
 * Chat window on the site. Visitors type their message here and it opens in WhatsApp with the text
 * already filled in. When nobody is available (the manual switch or the weekly hours in Dashboard >
 * Settings) an automatic message tells them the team will reply later. This message belongs to the
 * website: a reply inside WhatsApp itself is set up with the WhatsApp Business "Away message".
 */
export function WhatsAppChat() {
  const t = useT();
  const { site } = useSite();
  const { pathname } = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const hidden = HIDDEN.some((r) => r.test(pathname));
  const link = whatsappLinkWith(site);

  // Keep "online or away" correct while the window stays open across opening hours.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // A small invitation after a few seconds, once per visit.
  useEffect(() => {
    if (hidden || safeSession.get(TEASER_KEY)) return;
    const show = window.setTimeout(() => { setTeaser(true); safeSession.set(TEASER_KEY, '1'); }, 6000);
    const hide = window.setTimeout(() => setTeaser(false), 15000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [hidden]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); fabRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!link || hidden) return null;

  const available = isChatAvailable(site.contact, now);
  const greeting = site.contact.whatsappGreeting || t('whatsapp.greeting');
  const away = site.contact.whatsappAway || t('whatsapp.away');
  const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now);

  const toggle = () => { setOpen((o) => !o); setSeen(true); setTeaser(false); setSent(false); };
  const send = (e: FormEvent) => {
    e.preventDefault();
    const target = whatsappLinkWith(site, text);
    if (!target) return;
    window.open(target, '_blank', 'noopener,noreferrer');
    setSent(true);
    setText('');
  };

  return (
    <>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('whatsapp.title')}
          className="lvw-panel safe-right fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-40 flex max-h-[min(34rem,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl bg-white text-[#111b21] shadow-lift ring-1 ring-black/10"
        >
          <div className="flex items-center gap-3 bg-whatsapp-700 px-4 py-3 text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]"><WhatsApp size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{t('whatsapp.title')}</p>
              <p className="flex items-center gap-1.5 text-xs text-white/85" aria-live="polite">
                <span className={`h-2 w-2 rounded-full ${available ? 'bg-[#25D366]' : 'bg-amber-300'}`} aria-hidden />
                {available ? t('whatsapp.online') : t('whatsapp.awayStatus')}
              </p>
            </div>
            <button type="button" onClick={toggle} aria-label={t('whatsapp.close')} className="rounded-full p-2 text-white/90 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X size={18} /></button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-[#ECE5DD] p-4">
            <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
              <p className="text-sm leading-snug">{greeting}</p>
              <p className="mt-1 text-right text-[11px] text-[#667781]">{clock}</p>
            </div>
            {!available && (
              <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667781]">{t('whatsapp.auto')}</p>
                <p className="mt-0.5 text-sm leading-snug">{away}</p>
                <p className="mt-1 text-right text-[11px] text-[#667781]">{clock}</p>
              </div>
            )}
            {available && <p className="px-1 text-xs text-[#54656f]">{t('whatsapp.replyTime')}</p>}
            {sent && <p role="status" className="rounded-lg bg-[#D9FDD3] px-3 py-2 text-sm">{t('whatsapp.sent')}</p>}
          </div>

          <form onSubmit={send} className="border-t border-black/5 bg-[#F0F2F5] p-3">
            <div className="flex items-center gap-2">
              <label htmlFor={`${panelId}-msg`} className="sr-only">{t('whatsapp.placeholder')}</label>
              <input
                id={`${panelId}-msg`}
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                autoComplete="off"
                placeholder={t('whatsapp.placeholder')}
                className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-white px-4 text-sm text-[#111b21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
              <button type="submit" aria-label={t('whatsapp.send')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white transition-colors hover:bg-whatsapp-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"><Send size={18} /></button>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#54656f]">{t('whatsapp.note')}</p>
          </form>
        </div>
      )}

      {teaser && !open && (
        <button type="button" onClick={toggle} className="lvw-teaser safe-right fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] z-30 max-w-[15rem] rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-left text-sm font-semibold text-[#111b21] shadow-lift ring-1 ring-black/10">
          {t('whatsapp.teaser')}
        </button>
      )}

      <button
        ref={fabRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? t('whatsapp.close') : t('whatsapp.label')}
        className={`lvw-fab safe-bottom safe-right fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition-colors duration-200 hover:bg-whatsapp focus-visible:outline-offset-4 ${open ? '' : 'lvw-fab-idle'}`}
      >
        {!open && <span className="lvw-ring pointer-events-none absolute inset-0 rounded-full bg-[#25D366]" aria-hidden />}
        <span className="relative">{open ? <X size={26} /> : <WhatsApp size={30} />}</span>
        {!open && !seen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold ring-2 ring-white" aria-hidden>1</span>
        )}
      </button>
    </>
  );
}
