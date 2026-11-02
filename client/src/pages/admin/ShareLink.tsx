import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Copy, ExternalLink } from '../../components/ui/icons';
import { Alert, Panel } from '../../components/ui';
import { Trash2 } from '../../components/ui/icons';
import { useSite } from '../../lib/site';
import { asCurrency } from '../../lib/format';

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
export function RowActions({ editTo, path, published, onDelete, deleting }: { editTo: string; path: string; published: boolean; onDelete?: () => void; deleting?: boolean }) {
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
      {onDelete && (
        <button type="button" disabled={deleting} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-danger/40 px-3 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60" aria-label="Delete">
          <Trash2 size={14} aria-hidden /> {deleting ? 'Deleting…' : 'Delete'}
        </button>
      )}
    </div>
  );
}

/**
 * Shown at the top of the editor right after something was created: the new link, ready to copy,
 * so it never has to be hunted for. A draft says plainly that the link works after publishing.
 */
export function JustCreated({ what, path, published, onPublish, publishing }: { what: 'event' | 'program'; path: string; published: boolean; onPublish?: () => void; publishing?: boolean }) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (!(location.state as { justCreated?: boolean } | null)?.justCreated || hidden) return null;
  const url = `${window.location.origin}${path}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      (document.getElementById('created-link-input') as HTMLInputElement | null)?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mb-6 rounded-xl border border-mint bg-mint-50 p-4 sm:p-5" role="status">
      <p className="font-semibold text-heading">Your {what} is created.</p>
      <p className="mt-1 text-sm text-ink">{published ? 'It is live. Share this link with anyone:' : 'It is saved as a draft. Publish it so this link works for everyone:'}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input id="created-link-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link to the new page" className="min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={copy} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied ? 'Copied' : 'Copy link'}
        </button>
        {published ? (
          <a href={path} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold text-heading no-underline hover:border-blue-600">Open page <ExternalLink size={14} aria-hidden /></a>
        ) : onPublish ? (
          <button type="button" onClick={onPublish} disabled={publishing} className="inline-flex min-h-10 items-center justify-center rounded-full border border-blue-600 bg-white px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">{publishing ? 'Publishing…' : 'Publish now'}</button>
        ) : null}
        <button type="button" onClick={() => setHidden(true)} className="min-h-10 px-2 text-sm font-semibold text-ink-muted">Dismiss</button>
      </div>
    </div>
  );
}

/** Tells the editor, in one sentence, how people will be able to pay for the price they typed. */
export function PaymentNote({ hasPrice, currency, registrationOpen }: { hasPrice: boolean; currency: string; registrationOpen: boolean }) {
  const { site } = useSite();
  if (!hasPrice) return null;
  const mode = site.integrations?.payments;
  const providers = site.integrations?.paymentProviders ?? [];
  const momo = providers.includes('fapshi') && asCurrency(currency) === 'XAF';
  const card = providers.includes('flutterwave') || providers.includes('mock') || (providers.includes('notchpay') && asCurrency(currency) === 'XAF');
  const how = mode === 'disabled' || providers.length === 0
    ? 'Online payment is not switched on yet, so people will be told the foundation will contact them to pay.'
    : momo && card ? 'People choose between MTN MoMo and card when they register.' : momo ? 'People pay with MTN MoMo when they register.' : card ? 'People pay by card when they register.' : 'MTN MoMo only works for prices in FCFA. Choose FCFA, or switch on card payment.';
  return (
    <div className="space-y-3">
      <Alert tone="info">{how}</Alert>
      {!registrationOpen && <Alert tone="warning">People cannot register or pay until you tick “Registration open”.</Alert>}
    </div>
  );
}
