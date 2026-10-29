import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '../../components/ui/icons';
import { useState, type ReactNode } from 'react';
import { Search } from '../../components/ui/icons';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { cn } from '../../lib/cn';

export function AdminPage({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  useDocumentTitle(`${title} · Dashboard`);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div>
      {pathname !== '/admin' && (
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/admin'))} className="mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"><ArrowLeft size={16} aria-hidden /> Back</button>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function TableCard({ toolbar, children }: { toolbar?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {toolbar && <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 sm:p-4">{toolbar}</div>}
      {children}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  return (
    <form
      role="search"
      className="relative min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-auto"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(local.trim());
      }}
    >
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
      <label className="sr-only" htmlFor="admin-search">{placeholder}</label>
      <input id="admin-search" type="search" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local.trim())} placeholder={placeholder} className="w-full rounded-full border border-line-strong py-2 pl-9 pr-3 text-sm focus:border-blue focus:shadow-focus focus:outline-none" />
    </form>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-full border border-line-strong bg-surface py-2 pl-3 pr-8 text-sm font-medium text-heading">
        <option value="">{label}: all</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function StatCard({ label, value, hint, tone = 'blue', to }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'blue' | 'mint' | 'sun' | 'navy'; to?: string }) {
  const accent = { blue: 'bg-blue', mint: 'bg-[#3BB27A]', sun: 'bg-sun', navy: 'bg-navy' }[tone];
  const content = (
    <>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', accent)} />
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-[2rem] font-extrabold leading-tight text-heading">{value}</p>
      {hint && <p className="mt-1 text-caption text-ink-muted">{hint}</p>}
    </>
  );
  const cls = 'relative block overflow-hidden rounded-lg border border-line bg-surface p-5 text-ink no-underline';
  return to ? <Link to={to} className={cn(cls, 'transition-shadow hover:shadow-lift')}>{content}</Link> : <div className={cls}>{content}</div>;
}

export const publishOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/** Converts a title into a URL friendly slug. */
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80);

/** Optional extras, folded away so the main form stays short. Opens by itself if something inside needs attention. */
export function MoreOptions({ title = 'More options (optional)', open, children }: { title?: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-lg border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 py-3 font-semibold text-heading [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}

/** Lists what is wrong when a problem is in a field the person cannot see, so a save never fails silently. */
export function ErrorSummary({ errors, shownInline }: { errors: Record<string, string>; shownInline: string[] }) {
  const items = Object.entries(errors).filter(([k, v]) => v && !shownInline.includes(k));
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
      {items.map(([k, v]) => <li key={k}>{v}</li>)}
    </ul>
  );
}
