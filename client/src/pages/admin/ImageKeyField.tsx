import { useState } from 'react';
import { api } from '../../lib/api';
import { resizeImage } from '../../lib/imageResize';
import { images } from '../../config/images';
import { Select, TextField, useToast } from '../../components/ui';

/**
 * The image is optional: with no choice the page uses its default illustration. Editors can pick a
 * built in photo, upload one from their device, or paste the URL of an image already in Media.
 */
export function ImageKeyField({ value, onChange, alt, onAltChange, folder = 'general' }: { value: string; onChange: (v: string) => void; alt: string; onAltChange: (v: string) => void; folder?: 'programs' | 'events' | 'general' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const keys = Object.keys(images);
  const isCustom = value !== '' && !keys.includes(value);
  const preview = isCustom ? value : value ? undefined : undefined;

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose a PNG, JPEG or WebP image.', 'error');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', await resizeImage(file), 'cover.jpg');
      fd.append('folder', folder);
      fd.append('visibility', 'PUBLIC');
      fd.append('altText', alt);
      const asset = await api.post<{ url: string }>('/admin/media', fd);
      onChange(asset.url);
      toast('Image uploaded. Save to publish it.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The image could not be uploaded.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label="Image (optional)"
        value={isCustom ? '__custom' : value}
        onChange={(e) => onChange(e.target.value === '__custom' ? '/uploads/' : e.target.value)}
        options={[{ value: '', label: 'No image (make a cover automatically)' }, ...keys.map((k) => ({ value: k, label: images[k as keyof typeof images].label })), { value: '__custom', label: 'My own image' }]}
        hint="Optional. With no image, a cover is made for you from the title. Large photos are resized automatically."
      />
      <div className="flex flex-col justify-end gap-2">
        <input type="file" accept="image/*" id={`upload-${folder}`} className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        <label htmlFor={`upload-${folder}`} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-5 font-semibold text-heading transition-colors hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
          {busy ? 'Uploading…' : 'Upload from this device'}
        </label>
        {value && <button type="button" onClick={() => onChange('')} className="text-sm font-semibold text-danger">Remove image</button>}
      </div>
      {isCustom && (
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start">
          {preview && preview !== '/uploads/' && <img src={preview} alt="" className="h-24 w-32 rounded-lg border border-line object-cover" />}
          <TextField label="Image URL" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
      <div className="sm:col-span-2">
        <TextField label="Image description (alt text)" optional value={alt} onChange={(e) => onAltChange(e.target.value)} hint="Describe what the image shows for people using screen readers. Leave empty if purely decorative." />
      </div>
    </div>
  );
}
