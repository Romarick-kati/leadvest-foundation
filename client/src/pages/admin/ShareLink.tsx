import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink } from '../../components/ui/icons';
import { Panel } from '../../components/ui';

/**
 * The public link of a saved event or program, with copy and open buttons. A link to something
 * that is still a draft would show "not found" to visitors, so that is said plainly.
 */
export function ShareLink({ path, published, onPublish, publishing }: { path: string; published: boolean; onPublish?: () => void; publishing?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.getElementById('share-link-input') as HTMLInputElement | null;
      el?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel title="Link to share">
      <div className="space-y-3">
        <input id="share-link-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Public link" className="w-full rounded-lg border border-line-strong bg-navy-50 px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-semibold text-heading hover:border-blue-600">
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? 'Copied' : 'Copy link'}
          </button>
          <a href={path} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-semibold text-heading no-underline hover:border-blue-600">
            Open page <ExternalLink size={14} aria-hidden />
          </a>
        </div>
        {!published && onPublish && (
          <button type="button" onClick={onPublish} disabled={publishing} className="inline-flex min-h-10 items-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {publishing ? 'Publishing…' : 'Publish now so the link works'}
          </button>
        )}
        <p className="text-caption text-ink-muted" role="status">{published ? 'Live now. Anyone with this link can see it.' : 'Not public yet (it is a draft). Publish it and the link works for everyone.'}</p>
      </div>
    </Panel>
  );
}

/** Compact Edit, Copy link and Open buttons for a row in a list. Drafts say so instead of offering a link that would not work. */
export function RowActions({ editTo, path, published }: { editTo: string; path: string; published: boolean }) {
  const [copied, setCopied] = useState(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  const cls = 'inline-flex min-h-9 items-center gap-1 rounded-full border border-line-strong px-3 text-sm font-semibold text-heading no-underline hover:border-blue-600';
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={stop}>
      <Link to={editTo} className={cls} onClick={stop}>Edit</Link>
      {published ? (
        <>
          <button type="button" onClick={copy} className={cls}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copied ? 'Copied' : 'Copy link'}</button>
          <a href={path} target="_blank" rel="noreferrer" className={cls} onClick={stop}>Open <ExternalLink size={12} aria-hidden /></a>
        </>
      ) : (
        <span className="text-caption text-ink-muted">Draft: no public link yet</span>
      )}
    </div>
  );
}
