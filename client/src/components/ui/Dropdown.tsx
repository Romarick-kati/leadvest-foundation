import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export interface DropdownItem {
  label: string;
  to?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

/** Menu button with keyboard support (arrows, Home, End, Escape). */
export function Dropdown({ trigger, items, align = 'right', label }: { trigger: ReactNode; items: DropdownItem[]; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    const first = wrap.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      setOpen(false);
      wrap.current?.querySelector<HTMLElement>('[aria-haspopup]')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === 'Home') els[0]?.focus();
    else if (e.key === 'End') els[els.length - 1]?.focus();
  };

  const itemClass = (danger?: boolean) =>
    cn('flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm no-underline focus:outline-none', danger ? 'text-danger hover:bg-danger-50 focus:bg-danger-50' : 'text-heading hover:bg-blue-50 focus:bg-blue-50');

  return (
    <div ref={wrap} className="relative" onKeyDown={onKeyDown}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={label} onClick={() => setOpen((o) => !o)} className="rounded-full">
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn('absolute z-50 mt-2 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-lift', align === 'right' ? 'right-0' : 'left-0')}
          >
            {items.map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} role="menuitem" tabIndex={-1} className={itemClass(item.danger)} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={itemClass(item.danger)}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ),
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
