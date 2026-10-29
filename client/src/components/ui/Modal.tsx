import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { X } from './icons';

/**
 * Accessible modal built on the native dialog element, which provides focus trapping,
 * Escape to close and an inert background.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={`w-[calc(100%-2rem)] ${widths[size]} rounded-lg border-0 bg-transparent p-0 backdrop:bg-navy/40 backdrop:backdrop-blur-[2px]`}
    >
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="max-h-[85vh] overflow-y-auto rounded-lg bg-surface shadow-lift"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 id="modal-title" className="text-h4">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-muted hover:bg-navy-50 hover:text-heading" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children && <div className="px-6 py-5">{children}</div>}
            {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
          </m.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
