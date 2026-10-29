import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { roleLabel } from '../../lib/format';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useForm } from '../../components/forms/useForm';
import { Avatar, Button, FormError, Panel, TextField, useToast } from '../../components/ui';
import { SettingsHeader } from './SettingsLayout';

export default function ProfileSettings() {
  useDocumentTitle('Profile settings');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const form = useForm({ displayName: user?.displayName ?? '' });
  useUnsavedChanges(form.dirty);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', await prepareAvatar(file), 'avatar.jpg');
      return api.post<User>('/account/profile/avatar', fd);
    },
    onSuccess: (u) => { setUser({ ...user!, avatarUrl: u.avatarUrl }); setPreview(null); toast('Profile picture updated.'); },
    onError: (e: Error) => { setPreview(null); toast(e.message || 'Could not upload that picture.', 'error'); },
  });
  const choose = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please choose an image file (PNG, JPEG or WebP).', 'error');
    setPreview(URL.createObjectURL(f));
    upload.mutate(f);
  };
  const removeAvatar = useMutation({
    mutationFn: () => api.delete<User>('/account/profile/avatar'),
    onSuccess: () => { setUser({ ...user!, avatarUrl: null }); toast('Profile picture removed.'); },
  });
  if (!user) return null;
  const isLearner = user.role === 'LEARNER';

  return (
    <>
      <SettingsHeader title="Profile" description="How your name appears on the website." />
      <div className="space-y-6">
        {!isLearner && (
          <Panel title="Profile picture" description="Optional. PNG, JPEG or WebP, up to 5 MB.">
            <div className="flex flex-wrap items-center gap-5">
              {preview ? <img src={preview} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" /> : <Avatar name={user.displayName} src={user.avatarUrl} size={72} />}
              <div className="flex flex-wrap gap-3">
                <input type="file" accept="image/*" className="sr-only" id="avatar-gallery" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
                <input type="file" accept="image/*" capture="user" className="sr-only" id="avatar-camera" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
                <label htmlFor="avatar-gallery" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-5 font-semibold text-heading transition-colors hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
                  {upload.isPending ? 'Uploading…' : 'Choose from gallery'}
                </label>
                <label htmlFor="avatar-camera" className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-5 font-semibold text-heading transition-colors hover:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
                  Take a photo
                </label>
                {user.avatarUrl && <Button variant="ghost" onClick={() => removeAvatar.mutate()}>Remove</Button>}
              </div>
            </div>
          </Panel>
        )}
        <Panel title="Your details">
          <form
            className="max-w-md space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              form.submit(async (v) => {
                const u = await api.patch<User>('/account/profile', v);
                setUser({ ...user, displayName: u.displayName });
                toast('Profile saved.');
              });
            }}
          >
            <FormError message={form.formError} />
            <TextField label={isLearner ? 'Nickname' : 'Display name'} required {...form.bind('displayName')} />
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-ink-muted">Account type:</dt><dd className="font-semibold text-heading">{roleLabel[user.role]}</dd></div>
              {(user.role === 'PARENT' || user.role === 'YOUTH') && <div className="flex gap-2"><dt className="text-ink-muted">Not right?</dt><dd><Link to="/welcome" className="font-semibold">Change how I use Lead Vest</Link></dd></div>}
              {user.username && <div className="flex gap-2"><dt className="text-ink-muted">Username:</dt><dd className="font-semibold text-heading">{user.username}</dd></div>}
            </dl>
            <Button type="submit" loading={form.submitting} disabled={!form.dirty}>Save changes</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

/** Shrinks a chosen photo to a square JPEG (max 640 px) so phone photos and large files upload reliably. */
async function prepareAvatar(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That picture could not be read. Please use a PNG, JPEG or WebP image.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(640, side);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
