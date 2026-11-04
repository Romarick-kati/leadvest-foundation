import { useEffect, useRef, useState } from 'react';
import { openPicture } from '../../lib/imageResize';
import { Button, Modal, Spinner } from '../../components/ui';

const PRESETS = [
  { label: 'Small', side: 800, note: 'Loads fastest' },
  { label: 'Medium', side: 1200, note: 'Best for most pictures' },
  { label: 'Large', side: 1600, note: 'Sharper, loads slower' },
] as const;

const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

type Result = { blob: Blob; width: number; height: number; url: string };

/**
 * Lets the administrator choose how big a picture should be before it is used. The preview is the
 * real resized file, with its size shown, and nothing is uploaded until "Use this picture" is pressed.
 */
export function ImageResizeDialog({ file, onCancel, onUse, busy }: { file: File | null; onCancel: () => void; onUse: (blob: Blob) => void; busy?: boolean }) {
  const [side, setSide] = useState(1200);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [original, setOriginal] = useState<{ width: number; height: number } | null>(null);
  const picture = useRef<Awaited<ReturnType<typeof openPicture>> | null>(null);
  const [ready, setReady] = useState(false);

  // Open the chosen picture once.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    setResult(null);
    setSide(1200);
    openPicture(file)
      .then((p) => {
        if (cancelled) return p.release();
        picture.current = p;
        setOriginal({ width: p.width, height: p.height });
        setReady(true);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'This picture could not be opened.'));
    return () => {
      cancelled = true;
      picture.current?.release();
      picture.current = null;
    };
  }, [file]);

  // Redraw shortly after the size changes, so dragging the slider stays smooth.
  useEffect(() => {
    if (!ready || !picture.current) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      picture.current!
        .draw(side)
        .then((r) => {
          if (cancelled) return;
          setResult((old) => {
            if (old) URL.revokeObjectURL(old.url);
            return { ...r, url: URL.createObjectURL(r.blob) };
          });
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'The picture could not be prepared.'));
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [side, ready]);

  useEffect(() => () => setResult((old) => { if (old) URL.revokeObjectURL(old.url); return null; }), []);

  const heavy = result ? result.blob.size > 600_000 : false;
  const maxSide = original ? Math.max(original.width, original.height) : 2000;

  return (
    <Modal
      open={Boolean(file)}
      onClose={() => !busy && onCancel()}
      title="Choose the picture size"
      description="Smaller pictures make the website load faster. Pick a size, check the preview, then use it."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button loading={busy} disabled={!result || Boolean(error)} onClick={() => result && onUse(result.blob)}>Use this picture</Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-danger/10 p-4 text-sm text-danger">{error}</p>
      ) : (
        <div className="space-y-5">
          <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-line bg-blue-50">
            {result ? <img src={result.url} alt="Preview of the resized picture" className="max-h-72 w-auto max-w-full object-contain" /> : <Spinner size={28} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
            <span className="font-semibold text-heading">{result ? `${result.width} × ${result.height} px · ${kb(result.blob.size)}` : 'Preparing…'}</span>
            {original && <span className="text-ink-muted">Original: {original.width} × {original.height} px · {kb(file?.size ?? 0)}</span>}
          </div>
          <div role="group" aria-label="Picture size" className="grid gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => {
              const active = side === p.side;
              return (
                <button key={p.label} type="button" aria-pressed={active} onClick={() => setSide(p.side)} className={`rounded-xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'border-blue-600 bg-blue-50' : 'border-line-strong hover:border-blue-600'}`}>
                  <span className="block font-bold text-heading">{p.label}</span>
                  <span className="block text-xs text-ink-muted">{p.side} px · {p.note}</span>
                </button>
              );
            })}
          </div>
          <div>
            <label htmlFor="resize-side" className="mb-1.5 flex justify-between text-label text-heading"><span>Or choose your own size</span><span>{Math.min(side, maxSide)} px</span></label>
            <input id="resize-side" type="range" min={400} max={Math.max(2000, 400)} step={50} value={side} onChange={(e) => setSide(Number(e.target.value))} className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-ink-muted"><span>Smaller</span><span>Bigger</span></div>
          </div>
          {heavy && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This file is large and may load slowly on phones. Try a smaller size.</p>}
          {original && side > maxSide && <p className="text-xs text-ink-muted">The original is smaller than this size, so it is kept as it is and not stretched.</p>}
        </div>
      )}
    </Modal>
  );
}
