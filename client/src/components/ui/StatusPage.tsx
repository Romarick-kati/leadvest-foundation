import type { ReactNode } from 'react';
import type { IconComponent } from './icons';

/** Full width message used by the not found, no access and error screens. */
export function StatusPage({ icon: Icon, eyebrow, title, children, actions }: { icon: IconComponent; eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-canvas to-surface">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(36rem_20rem_at_50%_0%,rgba(37,99,235,0.10),transparent)]" />
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-12 text-center sm:py-16">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-blue-700 shadow-card ring-1 ring-line">
          <Icon size={26} />
        </span>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-2xl text-h1">{title}</h1>
        {children && <div className="mt-4 max-w-md text-lead text-ink-muted">{children}</div>}
        {actions && <div className="mt-8 flex w-full flex-col justify-center gap-3 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:flex-wrap">{actions}</div>}
      </div>
    </section>
  );
}
