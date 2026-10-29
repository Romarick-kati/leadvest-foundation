import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown } from '../ui/icons';
import { cn } from '../../lib/cn';
import { isGroup, primaryNav, type NavGroup } from './nav';
import { useT } from '../../i18n';

const topLink = 'relative inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[0.9rem] font-semibold no-underline transition-colors 2xl:px-3.5';

/**
 * One grouped panel. A disclosure button (not a menu), so Tab moves through the links as
 * normal. Opens on click, Enter or Space, and on hover with a short delay; closes on Escape,
 * clicking elsewhere, leaving with the keyboard or choosing a link.
 */
function Group({ group }: { group: NavGroup }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const { pathname, hash } = useLocation();
  const active = group.match.some((p) => pathname.startsWith(p));

  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hover = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 80 : 180);
  };

  return (
    <li
      ref={wrap}
      className="relative"
      onMouseEnter={() => window.matchMedia('(hover: hover)').matches && hover(true)}
      onMouseLeave={() => window.matchMedia('(hover: hover)').matches && hover(false)}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(topLink, active || open ? 'text-blue-700' : 'text-heading hover:bg-canvas hover:text-blue-700')}
      >
        {t(group.label)}
        <ChevronDown size={11} className={cn('transition-transform duration-200', open && 'rotate-180')} />
        <span aria-hidden className={cn('absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-blue-600 transition-transform duration-200', active ? 'scale-x-100' : 'scale-x-0')} />
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute left-1/2 top-full z-50 w-[22rem] -translate-x-1/2 pt-3 motion-safe:animate-rise-in"
        style={{ animationDuration: '0.25s' }}
      >
        <ul className="rounded-2xl border border-line bg-surface p-2 shadow-lift">
          {group.items.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="group flex items-start gap-3 rounded-xl p-3 no-underline transition-colors hover:bg-canvas focus-visible:bg-canvas">
                {Icon && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon size={16} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold text-heading">
                    {t(label)}
                    <ArrowRight size={11} className="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                  {description && <span className="mt-0.5 block text-sm text-ink-muted">{t(description)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function DesktopNav() {
  const t = useT();
  return (
    <nav aria-label={t('nav.main')} className="hidden xl:block">
      <ul className="flex items-center gap-0">
        {primaryNav.map((item) =>
          isGroup(item) ? (
            <Group key={item.label} group={item} />
          ) : (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => cn(topLink, isActive ? 'text-blue-700' : 'text-heading hover:bg-canvas hover:text-blue-700')}>
                {({ isActive }) => (
                  <>
                    {t(item.label)}
                    <span aria-hidden className={cn('absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-blue-600 transition-transform duration-200', isActive ? 'scale-x-100' : 'scale-x-0')} />
                  </>
                )}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
