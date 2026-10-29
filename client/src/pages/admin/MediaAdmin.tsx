import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Lock, Trash2, Upload } from '../../components/ui/icons';
import { api, apiUrl, assetUrl } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { Alert, Badge, Button, EmptyState, Panel, Select, TableSkeleton, TextField, useToast } from '../../components/ui';
import { AdminPage } from './shared';

interface Asset { id: string; filename: string; originalName: string; mimeType: string; sizeBytes: number; altText: string; folder: string; visibility: 'PUBLIC' | 'PRIVATE'; createdAt: string }

// Images in the gallery folder with alt text appear in the public photo gallery on the About page.
const folders = ['branding', 'homepage', 'programs', 'learning', 'events', 'team', 'illustrations', 'gallery', 'general'].map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }));

export default function MediaAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState('general');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [alt, setAlt] = useState('');
  const list = useQuery({ queryKey: ['admin', 'media'], queryFn: () => api.get<Asset[]>('/admin/media') });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      fd.append('visibility', visibility);
      fd.append('altText', alt);
      return api.post('/admin/media', fd);
    },
    onSuccess: () => { setAlt(''); qc.invalidateQueries({ queryKey: ['admin', 'media'] }); toast('Image uploaded.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'media'] }),
  });

  return (
    <AdminPage title="Media" description="Upload approved images. Public images can be used on the website; private files are only visible to administrators.">
      <Alert tone="warning" className="mb-6">Do not upload identifiable photos of children unless the foundation holds documented guardian permission for that use.</Alert>
      <Panel title="Upload an image" className="mb-6">
        <div className="grid gap-4 md:grid-cols-4 md:items-end">
          <Select label="Folder" value={folder} onChange={(e) => setFolder(e.target.value)} options={folders} />
          <Select label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)} options={[{ value: 'PUBLIC', label: 'Public' }, { value: 'PRIVATE', label: 'Private' }]} />
          <TextField label="Description (alt text)" value={alt} onChange={(e) => setAlt(e.target.value)} />
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="media-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
            <Button className="w-full" icon={<Upload size={16} />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>Choose image</Button>
          </div>
        </div>
        <p className="mt-3 text-caption text-ink-muted">PNG, JPEG or WebP. Files are checked by content, renamed and stored outside the code. SVG files are refused for security.</p>
      </Panel>
      {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.data.map((a) => {
            const url = a.visibility === 'PUBLIC' ? assetUrl(`/uploads/${a.filename}`)! : apiUrl(`/admin/media/${a.id}/file`);
            return (
              <li key={a.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="aspect-[4/3] bg-navy-50">
                  <img src={url} alt={a.altText} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <p className="truncate font-semibold text-heading" title={a.originalName}>{a.originalName}</p>
                  <p className="flex flex-wrap items-center gap-2 text-ink-muted">
                    <Badge tone={a.visibility === 'PUBLIC' ? 'blue' : 'navy'}>{a.visibility === 'PRIVATE' && <Lock size={12} />} {a.visibility.toLowerCase()}</Badge>
                    {a.folder} · {Math.round(a.sizeBytes / 1024)} KB · {formatDate(a.createdAt)}
                  </p>
                  <div className="flex gap-2">
                    {a.visibility === 'PUBLIC' && <Button size="sm" variant="secondary" icon={<Copy size={14} />} onClick={async () => { await navigator.clipboard.writeText(`/uploads/${a.filename}`); toast('Image URL copied.'); }}>Copy URL</Button>}
                    <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 size={14} />} onClick={() => window.confirm('Delete this image?') && remove.mutate(a.id)}>Delete</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="No images uploaded yet" />}
    </AdminPage>
  );
}
