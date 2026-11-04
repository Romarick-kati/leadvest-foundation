import { useState } from 'react';
import { api } from '../../lib/api';
import { looksLikeImage } from '../../lib/imageResize';
import { ImageResizeDialog } from './ImageResizeDialog';
import { images } from '../../config/images';
import { GeneratedCover } from '../../components/brand/GeneratedCover';
import { Select, TextField, useToast } from '../../components/ui';

/** Shows exactly the picture visitors will see, or the cover that is made when no image is chosen. */
function Preview({ src, title }: { src: string | null; title?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl border border-line bg-blue-50">
      {src && !broken ? (
        <img src={src} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : !src && title ? (
        <GeneratedCover title={title} className="absolute inset-0" />
      ) : (
        <p className="flex h-full items-center justify-center p-4 text-center text-sm text-ink-muted">{broken ? 'This image could not be loaded. Upload it again.' : 'Upload a picture or choose one from the list.'}</p>
      )}
    </div>
  );
}

/**
 * The image is optional: with no choice a cover is made from the title. Editors can pick a built in
 * photo or upload any picture from their device (JPG, PNG, WebP, GIF, AVIF and more). Every upload is
 * converted and resized in the browser, so the file type or size never blocks it.
 */
export function ImageKeyField({ value, onChange, alt, onAltChange, folder = 'general', title }: { value: string; onChange: (v: string) => void; alt: string; onAltChange: (v: string) => void; folder?: 'programs' | 'events' | 'general'; title?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<File | null>(null);
  const keys = Object.keys(images);
  const isCustom = value !== '' && !keys.includes(value);
  const builtIn = value && !isCustom ? images[value as keyof typeof images] : null;
  const previewSrc = isCustom ? (value !== '/uploads/' ? value : null) : builtIn?.src ?? null;
  const showAddress = isCustom && (value === '/uploads/' || value.startsWith('https://'));

  const choose = (file?: File) => {
    if (!file) return;
    if (!looksLikeImage(file)) return toast('That file is not a picture. Please choose a JPG, PNG or WebP image.', 'error');
    setChosen(file);
  };

  const upload = async (blob: Blob) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'cover.jpg');
      fd.append('folder', folder);
      fd.append('visibility', 'PUBLIC');
      fd.append('altText', alt || title || '');
      const asset = await api.post<{ url: string }>('/admin/media', fd);
      onChange(asset.url);
      setChosen(null);
      toast('Picture ready. Save to publish it.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The picture could not be uploaded. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Image"
          optional
          value={isCustom ? '__custom' : value}
          onChange={(e) => onChange(e.target.value === '__custom' ? '/uploads/' : e.target.value)}
          options={[{ value: '', label: 'No image (make a cover automatically)' }, ...keys.map((k) => ({ value: k, label: images[k as keyof typeof images].label })), { value: '__custom', label: 'My own image' }]}
        />
        <div className="flex flex-col justify-end gap-2">
          <input type="file" accept="image/*,.jfif,.heic,.avif" id={`upload-${folder}`} className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
          <label htmlFor={`upload-${folder}`} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-5 font-semibold text-heading transition-colors focus-within:ring-2 focus-within:ring-blue-600 hover:border-blue-600">
            {busy ? 'Uploading…' : 'Upload a picture'}
          </label>
          {value && <button type="button" onClick={() => onChange('')} className="min-h-9 text-sm font-semibold text-danger">Remove image</button>}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-label text-heading">Preview</p>
        <Preview key={previewSrc ?? 'none'} src={previewSrc} title={value ? undefined : title} />
      </div>
      {showAddress && <TextField label="Image web address" hint="Only needed to use a picture from another website." value={value === '/uploads/' ? '' : value} onChange={(e) => onChange(e.target.value || '/uploads/')} />}
      <ImageResizeDialog file={chosen} busy={busy} onCancel={() => setChosen(null)} onUse={(blob) => void upload(blob)} />
      {value && <TextField label="Short image description" optional value={alt} onChange={(e) => onAltChange(e.target.value)} hint="For people who cannot see the picture. If you leave it empty, the title is used." />}
    </div>
  );
}
