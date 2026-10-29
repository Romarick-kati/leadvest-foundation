import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, Trash2 } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useForm } from '../../components/forms/useForm';
import { SimpleMarkdown } from '../../components/content/SimpleMarkdown';
import { Alert, Button, FormError, Modal, PageLoader, Panel, SampleBadge, Select, TextArea, TextField, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { articleCategories } from '../public/resources/Resources';
import { AdminPage, publishOptions, slugify } from './shared';
import { ImageKeyField } from './ImageKeyField';

const empty = { title: '', slug: '', summary: '', body: '', category: 'parenting', imageKey: '', imageAlt: '', readMinutes: '', status: 'DRAFT' };

interface Article { id: string; title: string; slug: string; summary: string; body: string; category: string; imageKey: string | null; imageAlt: string | null; readMinutes: number | null; status: string; isSample: boolean }

export default function ArticleEditor() {
  const t = useT();
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'article', id], queryFn: () => api.get<Article>(`/admin/articles/${id}`), enabled: !isNew });
  const form = useForm(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useUnsavedChanges(form.dirty);

  useEffect(() => {
    if (q.data) {
      const a = q.data;
      form.setValues({ title: a.title, slug: a.slug, summary: a.summary, body: a.body, category: a.category, imageKey: a.imageKey ?? '', imageAlt: a.imageAlt ?? '', readMinutes: a.readMinutes ? String(a.readMinutes) : '', status: a.status });
      form.setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      const body = { ...v, readMinutes: v.readMinutes ? Number(v.readMinutes) : null };
      const saved = isNew ? await api.post<{ id: string }>('/admin/articles', body) : await api.patch<{ id: string }>(`/admin/articles/${id}`, body);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      qc.invalidateQueries({ queryKey: ['article'] });
      toast(isNew ? 'Article created.' : 'Article saved.');
      form.setDirty(false);
      if (isNew) navigate(`/admin/articles/${saved.id}`, { replace: true });
    });
  };

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/articles/${id}`),
    onSuccess: () => {
      form.setDirty(false);
      qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
      qc.invalidateQueries({ queryKey: ['articles'] });
      toast('Article deleted.', 'info');
      navigate('/admin/articles', { replace: true });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t('errors.generic'), 'error'),
  });

  if (!isNew && q.isLoading) return <PageLoader />;
  if (!isNew && q.error) return <Alert tone="error">{q.error instanceof ApiError ? q.error.message : t('errors.generic')}</Alert>;
  const v = form.values;

  return (
    <AdminPage
      title={isNew ? 'New article' : v.title || 'Article'}
      actions={!isNew && q.data?.status === 'PUBLISHED' ? <a href={`/resources/${q.data.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold">View live page <ExternalLink size={14} aria-hidden /></a> : undefined}
    >
      <Link to="/admin/articles" className="-mt-4 mb-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"><ChevronLeft size={16} aria-hidden /> All articles</Link>
      {q.data?.isSample && <Alert tone="warning" className="mb-6" title="Sample content"><SampleBadge /> This article came with the development data. Saving changes clears the sample flag, so replace the text with approved writing first.</Alert>}
      <form onSubmit={save} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] pb-24 xl:pb-0">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift xl:hidden">
          <Button type="submit" className="w-full" loading={form.submitting}>{isNew ? 'Create article' : 'Save changes'}</Button>
        </div>
        <div className="min-w-0 space-y-6">
          <FormError message={form.formError} />
          <Panel title="Article">
            <div className="space-y-4">
              <TextField label="Title" required {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); if (!slugTouched) form.set('slug', slugify(e.target.value)); }} />
              <TextField label="Web address" required hint={`Shown as /resources/${v.slug || 'your-article'}`} {...form.bind('slug')} onChange={(e) => { setSlugTouched(true); form.set('slug', e.target.value); }} />
              <TextArea label="Short summary" required rows={2} hint="One or two sentences for the article list." {...form.bind('summary')} />
            </div>
          </Panel>
          <Panel
            title="Body"
            description="Use ## for headings, ### for subheadings, a dash and a space for list items, and **double asterisks** for bold."
            actions={<Button size="sm" variant="secondary" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>{preview ? 'Edit' : 'Preview'}</Button>}
          >
            {preview ? (
              <div className="min-h-48 rounded-lg border border-line p-4">{v.body.trim() ? <SimpleMarkdown source={v.body} /> : <p className="text-ink-muted">Nothing to preview yet.</p>}</div>
            ) : (
              <TextArea label="Article text" required rows={18} className="font-mono text-sm" {...form.bind('body')} />
            )}
          </Panel>
          <Panel title="Image"><ImageKeyField value={v.imageKey} onChange={(x) => form.set('imageKey', x)} alt={v.imageAlt} onAltChange={(x) => form.set('imageAlt', x)} /></Panel>
        </div>
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Select label="Status" options={publishOptions} {...form.bind('status')} hint="Only published articles appear on the Resources page." />
              <Select label="Topic" options={articleCategories.map((c) => ({ value: c, label: t(`articles.categories.${c}`) }))} {...form.bind('category')} />
              <TextField label="Reading time in minutes" optional inputMode="numeric" {...form.bind('readMinutes')} />
              <Button type="submit" className="w-full" loading={form.submitting}>{isNew ? 'Create article' : 'Save changes'}</Button>
              {form.dirty && <p className="text-center text-caption text-ink-muted">Unsaved changes</p>}
            </div>
          </Panel>
          {!isNew && (
            <Button variant="ghost" className="w-full text-danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>Delete article</Button>
          )}
        </div>
      </form>
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this article?"
        description="It is removed from the website straight away and cannot be restored. To hide it but keep the text, set its status to Archived instead."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete article</Button>
          </>
        }
      />
    </AdminPage>
  );
}
