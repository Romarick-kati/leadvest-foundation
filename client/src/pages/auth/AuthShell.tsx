import type { ReactNode } from 'react';
import { ShieldCheck } from '../../components/ui/icons';
import { SmartImage } from '../../components/brand/SmartImage';
import { Ambient } from '../../components/motion/Ambient';
import { SparkleField } from '../../components/motion/HeroExtras';
import { BookOpen, Compass, Sparkles } from '../../components/ui/icons';
import { useT } from '../../i18n';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const t = useT();
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-canvas to-surface">
      <Ambient />
      <SparkleField />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_20rem_at_100%_0%,rgba(37,99,235,0.08),transparent)]" />
      <div className="container-page grid items-center gap-12 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="relative hidden min-w-0 lg:block">
          <SmartImage image="auth.side" ratio={1} rounded="rounded-2xl" className="shadow-card" sizes="45vw" />
          {[
            { icon: <BookOpen size={16} />, text: 'Learn', cls: 'left-4 top-5 animate-float' },
            { icon: <Sparkles size={16} />, text: 'Grow', cls: 'right-4 top-16 animate-float-delayed' },
            { icon: <Compass size={16} />, text: 'Lead', cls: 'left-10 top-[42%] animate-float-slow' },
          ].map((c) => (
            <span key={c.text} aria-hidden className={`absolute inline-flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-sm font-bold text-heading shadow-lift backdrop-blur ${c.cls}`}>
              <span className="text-blue-600">{c.icon}</span> {c.text}
            </span>
          ))}
          <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl bg-surface/95 px-4 py-3 shadow-lift backdrop-blur">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-white">
              <ShieldCheck size={18} />
            </span>
            <span className="text-sm font-semibold text-heading">{t('auth.sideNote')}</span>
          </div>
        </div>
        <div className="mx-auto w-full min-w-0 max-w-md lg:max-w-none">
          <div className="auth-card rounded-2xl border border-line bg-surface p-5 shadow-lift min-[400px]:p-6 sm:p-8">
            <h1 className="text-h2">{title}</h1>
            {subtitle && <div className="mt-2 text-ink-muted">{subtitle}</div>}
            <div className="auth-stagger mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
      </div>
    </section>
  );
}

/** Only allow redirects to paths on this site after sign in. */
export function safeNext(next: string | null, fallback: string) {
  // Only same site paths. Browsers treat /\ like //, so backslashes are refused too.
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) return next;
  return fallback;
}
