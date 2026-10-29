import { ChevronLeft, ChevronRight } from './icons';

export function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <p className="text-ink-muted">
        Page {page} of {pageCount} <span className="hidden sm:inline">({total} total)</span>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3 font-semibold text-heading hover:bg-blue-50 disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden /> Previous
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3 font-semibold text-heading hover:bg-blue-50 disabled:opacity-40"
        >
          Next <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
