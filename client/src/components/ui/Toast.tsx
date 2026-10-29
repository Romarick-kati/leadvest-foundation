import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from './icons';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => remove(id), tone === 'error' ? 8000 : 5000);
  }, []);

  const icons = {
    success: <CheckCircle2 size={20} className="text-mint-700" aria-hidden />,
    error: <XCircle size={20} className="text-danger" aria-hidden />,
    info: <Info size={20} className="text-blue-600" aria-hidden />,
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-24 sm:items-end sm:px-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-lift"
            >
              {icons[t.tone]}
              <p className="flex-1 text-sm text-heading">{t.message}</p>
              <button type="button" onClick={() => remove(t.id)} className="text-ink-muted hover:text-heading" aria-label="Dismiss">
                <X size={16} />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
