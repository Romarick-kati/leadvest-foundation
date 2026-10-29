import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, Trash2 } from '../../components/ui/icons';
import { api } from '../../lib/api';
import type { ContentBlock } from '../../lib/types';
import { useForm } from '../../components/forms/useForm';
import { Button, Checkbox, EmptyState, FormError, Modal, PageLoader, Panel, Select, TextArea, TextField, useToast } from '../../components/ui';
import { AdminPage, publishOptions, slugify } from './shared';

interface QuizQ { prompt: string; options: string[]; answerIndex: number; explanation?: string }
interface Lesson { id: string; slug: string; title: string; minutes: number; sortOrder: number; content: ContentBlock[]; quiz: QuizQ[] }
interface Mod { id: string; slug: string; title: string; description: string; theme: string; icon: string; ageGroup: string | null; isPublic: boolean; programId: string | null; status: string; sortOrder: number; lessons: Lesson[] }

export default function ModuleEditor() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'module', id], queryFn: () => api.get<Mod>(`/admin/learning/modules/${id}`) });
  const programs = useQuery({ queryKey: ['admin', 'programs', 'all'], queryFn: () => api.get<{ items: { id: string; title: string }[] }>('/admin/programs?pageSize=50') });
  const form = useForm({ title: '', slug: '', description: '', theme: 'sky', icon: 'book', ageGroup: '', isPublic: true, programId: '', status: 'DRAFT', sortOrder: '0' });
  const [editing, setEditing] = useState<Lesson | 'new' | null>(null);

  useEffect(() => {
    if (q.data) {
      const m = q.data;
      form.setValues({ title: m.title, slug: m.slug, description: m.description, theme: m.theme, icon: m.icon, ageGroup: m.ageGroup ?? '', isPublic: m.isPublic, programId: m.programId ?? '', status: m.status, sortOrder: String(m.sortOrder) });
      form.setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const removeLesson = useMutation({
    mutationFn: (lid: string) => api.delete(`/admin/learning/lessons/${lid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'module', id] }); toast('Lesson deleted.'); },
  });

  if (q.isLoading || !q.data) return <PageLoader />;
  return (
    <AdminPage title={q.data.title}>
      <Link to="/admin/learning" className="-mt-4 mb-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"><ChevronLeft size={16} aria-hidden /> All topics</Link>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Lessons" actions={<Button size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>Add lesson</Button>}>
          {q.data.lessons.length === 0 ? <EmptyState title="No lessons yet" /> : (
            <ol className="space-y-2">
              {q.data.lessons.map((l, i) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-4">
                  <div>
                    <p className="font-semibold text-heading">{i + 1}. {l.title}</p>
                    <p className="text-sm text-ink-muted">{l.content.length} blocks · {l.quiz.length} questions · {l.minutes} min</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(l)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => window.confirm(`Delete “${l.title}”? Learner progress for it will be removed.`) && removeLesson.mutate(l.id)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Topic settings">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); form.submit(async (v) => { await api.patch(`/admin/learning/modules/${id}`, { ...v, sortOrder: Number(v.sortOrder) || 0, programId: v.isPublic ? null : v.programId || null, ageGroup: v.ageGroup || null }); qc.invalidateQueries({ queryKey: ['admin'] }); qc.invalidateQueries({ queryKey: ['learning'] }); toast('Topic saved.'); }); }}>
            <FormError message={form.formError} />
            <TextField label="Title" {...form.bind('title')} />
            <TextField label="Web address" {...form.bind('slug')} />
            <TextArea label="Description" rows={3} {...form.bind('description')} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Colour" options={[{ value: 'sky', label: 'Sky blue' }, { value: 'sun', label: 'Sunshine' }, { value: 'mint', label: 'Mint' }]} {...form.bind('theme')} />
              <Select label="Icon" options={['book', 'star', 'leaf', 'compass', 'chat', 'heart'].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} {...form.bind('icon')} />
            </div>
            <TextField label="Age group" optional {...form.bind('ageGroup')} />
            <Checkbox label="Available to everyone, without an account" {...form.bindCheck('isPublic')} />
            {!form.values.isPublic && <Select label="Only for learners enrolled in" placeholder="Choose a program" options={(programs.data?.items ?? []).map((p) => ({ value: p.id, label: p.title }))} {...form.bind('programId')} />}
            <TextField label="Display order" inputMode="numeric" {...form.bind('sortOrder')} />
            <Select label="Status" options={publishOptions} {...form.bind('status')} />
            <Button type="submit" className="w-full" loading={form.submitting}>Save topic</Button>
          </form>
        </Panel>
      </div>
      {editing && <LessonModal moduleId={q.data.id} lesson={editing === 'new' ? null : editing} nextOrder={q.data.lessons.length + 1} onClose={() => setEditing(null)} />}
    </AdminPage>
  );
}

function LessonModal({ moduleId, lesson, nextOrder, onClose }: { moduleId: string; lesson: Lesson | null; nextOrder: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm({
    title: lesson?.title ?? '',
    slug: lesson?.slug ?? '',
    minutes: String(lesson?.minutes ?? 5),
    sortOrder: String(lesson?.sortOrder ?? nextOrder),
    content: (lesson?.content ?? [{ type: 'text', text: '' }]) as ContentBlock[],
    quiz: (lesson?.quiz ?? []) as QuizQ[],
  });
  const v = form.values;
  const setBlock = (i: number, b: ContentBlock) => form.set('content', v.content.map((x, j) => (j === i ? b : x)));
  const setQ = (i: number, qq: QuizQ) => form.set('quiz', v.quiz.map((x, j) => (j === i ? qq : x)));

  return (
    <Modal open onClose={onClose} title={lesson ? 'Edit lesson' : 'New lesson'} size="lg" footer={<>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button loading={form.submitting} onClick={() => form.submit(async (x) => {
        const body = { ...x, minutes: Number(x.minutes) || 5, sortOrder: Number(x.sortOrder) || 0 };
        if (lesson) await api.patch(`/admin/learning/lessons/${lesson.id}`, body);
        else await api.post(`/admin/learning/modules/${moduleId}/lessons`, body);
        qc.invalidateQueries({ queryKey: ['admin', 'module'] });
        toast('Lesson saved.');
        onClose();
      })}>Save lesson</Button>
    </>}>
      <div className="space-y-6">
        <FormError message={form.formError} />
        {Object.keys(form.errors).length > 0 && <p className="text-sm text-danger">Check: {Object.keys(form.errors).join(', ')}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); if (!lesson) form.set('slug', slugify(e.target.value)); }} />
          <TextField label="Web address" {...form.bind('slug')} />
          <TextField label="Minutes" inputMode="numeric" {...form.bind('minutes')} />
          <TextField label="Order" inputMode="numeric" {...form.bind('sortOrder')} />
        </div>
        <fieldset className="space-y-3">
          <legend className="text-h4">Content</legend>
          {v.content.map((b, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <select aria-label="Block type" value={b.type} onChange={(e) => setBlock(i, e.target.value === 'activity' ? { type: 'activity', title: 'Try it', text: b.text } : { type: e.target.value as 'text' | 'tip', text: b.text })} className="rounded border border-line-strong px-2 py-1 text-sm">
                  <option value="text">Paragraph</option>
                  <option value="tip">Tip</option>
                  <option value="activity">Activity</option>
                </select>
                <button type="button" onClick={() => form.set('content', v.content.filter((_, j) => j !== i))} className="text-danger" aria-label="Remove block"><Trash2 size={16} /></button>
              </div>
              {b.type === 'activity' && <TextField label="Activity title" value={b.title} onChange={(e) => setBlock(i, { ...b, title: e.target.value })} />}
              <TextArea label="Text" rows={3} value={b.text} onChange={(e) => setBlock(i, { ...b, text: e.target.value } as ContentBlock)} />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => form.set('content', [...v.content, { type: 'text', text: '' }])}>Add block</Button>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-h4">Quiz (optional)</legend>
          {v.quiz.map((qq, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <div className="flex justify-end"><button type="button" onClick={() => form.set('quiz', v.quiz.filter((_, j) => j !== i))} className="text-danger" aria-label="Remove question"><Trash2 size={16} /></button></div>
              <TextField label={`Question ${i + 1}`} value={qq.prompt} onChange={(e) => setQ(i, { ...qq, prompt: e.target.value })} />
              {qq.options.map((o, k) => (
                <div key={k} className="flex items-end gap-2">
                  <input type="radio" name={`answer-${i}`} checked={qq.answerIndex === k} onChange={() => setQ(i, { ...qq, answerIndex: k })} aria-label={`Option ${k + 1} is correct`} className="mb-3 h-5 w-5 accent-blue-600" />
                  <div className="flex-1"><TextField label={`Option ${k + 1}`} value={o} onChange={(e) => setQ(i, { ...qq, options: qq.options.map((x, j) => (j === k ? e.target.value : x)) })} /></div>
                </div>
              ))}
              <div className="flex gap-2">
                {qq.options.length < 5 && <Button size="sm" variant="ghost" onClick={() => setQ(i, { ...qq, options: [...qq.options, ''] })}>Add option</Button>}
                {qq.options.length > 2 && <Button size="sm" variant="ghost" onClick={() => setQ(i, { ...qq, options: qq.options.slice(0, -1), answerIndex: Math.min(qq.answerIndex, qq.options.length - 2) })}>Remove last option</Button>}
              </div>
              <TextField label="Explanation shown after answering" optional value={qq.explanation ?? ''} onChange={(e) => setQ(i, { ...qq, explanation: e.target.value })} />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => form.set('quiz', [...v.quiz, { prompt: '', options: ['', ''], answerIndex: 0 }])}>Add question</Button>
          <p className="text-caption text-ink-muted">Select the radio button next to the correct option. Answers are checked on the server and never sent to the browser in advance.</p>
        </fieldset>
      </div>
    </Modal>
  );
}
