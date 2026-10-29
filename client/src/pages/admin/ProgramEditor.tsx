import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, Plus, Trash2 } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, Checkbox, FormError, PageLoader, Panel, SampleBadge, Select, TextArea, TextField, useToast } from '../../components/ui';
import { AdminPage, ErrorSummary, MoreOptions, publishOptions, slugify } from './shared';
import { ShareLink } from './ShareLink';
import { ImageKeyField } from './ImageKeyField';

const empty = {
  title: '', slug: '', summary: '', description: '', imageKey: '', imageAlt: '', ageGroup: '', objectives: '', deliveryFormat: '', availability: '', schedule: '', duration: '',
  requirements: '', feeInfo: '', price: '', currency: 'XAF', registrationInfo: '', registrationOpen: false, status: 'DRAFT', faq: [] as { question: string; answer: string }[],
};

interface Program extends Omit<typeof empty, 'objectives' | 'price'> { id: string; objectives: string[]; priceCents: number | null; isSample: boolean; assignments: { instructor: { id: string; displayName: string } }[] }

export default function ProgramEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'program', id], queryFn: () => api.get<Program>(`/admin/programs/${id}`), enabled: !isNew });
  const form = useForm(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  useUnsavedChanges(form.dirty);

  useEffect(() => {
    if (q.data) {
      const p = q.data;
      form.setValues({
        ...empty,
        ...Object.fromEntries(Object.keys(empty).map((k) => [k, (p as unknown as Record<string, unknown>)[k] ?? ''])),
        objectives: p.objectives.join('\n'),
        price: p.priceCents != null ? String(p.priceCents / 100) : '',
        faq: (p.faq as typeof empty.faq) ?? [],
        registrationOpen: p.registrationOpen,
      } as typeof empty);
      form.setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = (e: React.FormEvent | null, publish = false) => {
    e?.preventDefault();
    form.submit(async (v) => {
      const { price, objectives, currency, slug, availability: _availability, ...rest } = v;
      const body = {
        ...rest,
        // A new program gets its web address from the title on the server unless one was typed.
        ...(isNew && !slugTouched ? {} : { slug }),
        ...(isNew ? { currency: currency || null } : {}),
        status: publish ? 'PUBLISHED' : v.status,
        objectives: objectives.split('\n').map((s) => s.trim()).filter(Boolean),
        priceCents: price ? Math.round(Number(price) * 100) : null,
        faq: v.faq.filter((f) => f.question && f.answer),
      };
      const saved = isNew ? await api.post<{ id: string }>('/admin/programs', body) : await api.patch<{ id: string }>(`/admin/programs/${id}`, body);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
      toast(isNew ? 'Program created. Its link is ready on the next page.' : publish ? 'Program saved and published.' : 'Program saved.');
      form.setDirty(false);
      if (isNew) navigate(`/admin/programs/${saved.id}`, { replace: true });
    });
  };

  if (!isNew && q.isLoading) return <PageLoader />;
  const v = form.values;
  const savedSlug = q.data?.slug ?? '';
  const savedPublished = q.data?.status === 'PUBLISHED';
  const hasErrorsInMore = ['slug', 'ageGroup', 'deliveryFormat', 'schedule', 'duration', 'feeInfo', 'price', 'priceCents', 'requirements', 'registrationInfo', 'faq', 'objectives'].some((k) => form.errors[k]);
  const remove = async () => {
    if (!window.confirm('Delete this program for good? Its registrations are deleted with it. To hide it without deleting, set it to Draft instead.')) return;
    try {
      await api.delete(`/admin/programs/${id}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['programs'] });
      form.setDirty(false);
      toast('Program deleted.');
      navigate('/admin/programs', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete it.', 'error');
    }
  };

  return (
    <AdminPage
      title={isNew ? 'New program' : v.title || 'Program'}
      actions={!isNew && savedPublished ? <a href={`/programs/${savedSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold">View live page <ExternalLink size={14} aria-hidden /></a> : undefined}
    >
      <Link to="/admin/programs" className="-mt-4 mb-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"><ChevronLeft size={16} aria-hidden /> All programs</Link>
      {q.data?.isSample && <Alert tone="warning" className="mb-6" title="Sample content"><SampleBadge /> Saving changes clears the sample flag. Replace all placeholder text with approved information first.</Alert>}
      <form onSubmit={(e) => save(e)} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] pb-24 xl:pb-0">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift xl:hidden">
          <Button type="submit" className="w-full" loading={form.submitting}>Save</Button>
        </div>
        <div className="space-y-6">
          <FormError message={form.formError} />
          <ErrorSummary errors={form.errors} shownInline={[...Object.keys(empty), 'priceCents']} />
          <Panel title="Program details">
            <div className="space-y-4">
              <TextField label="Title" required {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); if (!slugTouched) form.set('slug', slugify(e.target.value)); }} />
              <TextArea label="Short summary" required rows={2} hint="One or two sentences for listings." {...form.bind('summary')} />
              <TextArea label="Full description" required rows={7} {...form.bind('description')} />
            </div>
          </Panel>
          <Panel title="Image"><ImageKeyField folder="programs" value={v.imageKey} onChange={(x) => form.set('imageKey', x)} alt={v.imageAlt} onAltChange={(x) => form.set('imageAlt', x)} /></Panel>
          <MoreOptions title="More details (optional). Only fill in what the foundation has confirmed." open={hasErrorsInMore}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Web address" hint={`Made from the title. Shown as /programs/${v.slug || 'your-program'}`} {...form.bind('slug')} onChange={(e) => { setSlugTouched(true); form.set('slug', slugify(e.target.value)); }} />
              <TextField label="Age group" optional placeholder="for example 7 to 9" {...form.bind('ageGroup')} />
              <TextField label="Delivery format" optional placeholder="In person, Online or Blended" {...form.bind('deliveryFormat')} />
              <TextField label="Schedule" optional {...form.bind('schedule')} />
              <TextField label="Duration" optional {...form.bind('duration')} />
              <TextField label="Fee information" optional hint="Text shown to families." {...form.bind('feeInfo')} />
              <TextField label="Price for online payment" optional inputMode="decimal" hint="In FCFA. Price 5000 means 5,000 FCFA. Leave empty if it is free." {...form.bind('price')} error={form.errors.price || form.errors.priceCents} />
              <div className="sm:col-span-2"><TextArea label="Learning objectives" optional rows={3} hint="One per line." {...form.bind('objectives')} /></div>
              <div className="sm:col-span-2"><TextArea label="Requirements" optional rows={3} {...form.bind('requirements')} /></div>
              <div className="sm:col-span-2"><TextArea label="Registration instructions" optional rows={3} {...form.bind('registrationInfo')} /></div>
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-heading">Frequently asked questions</h3>
                  <Button size="sm" variant="secondary" icon={<Plus size={16} />} onClick={() => form.set('faq', [...v.faq, { question: '', answer: '' }])}>Add question</Button>
                </div>
                {v.faq.length === 0 ? <p className="text-sm text-ink-muted">No questions added.</p> : (
                  <ul className="space-y-4">
                    {v.faq.map((f, i) => (
                      <li key={i} className="space-y-3 rounded-lg border border-line p-4">
                        <TextField label={`Question ${i + 1}`} value={f.question} onChange={(e) => form.set('faq', v.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                        <TextArea label="Answer" rows={2} value={f.answer} onChange={(e) => form.set('faq', v.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                        <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 size={14} />} onClick={() => form.set('faq', v.faq.filter((_, j) => j !== i))}>Remove</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </MoreOptions>
        </div>
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Select label="Status" options={publishOptions} {...form.bind('status')} hint="Drafts and archived programs are not visible to the public." />
              <Checkbox label="Registration open" {...form.bindCheck('registrationOpen')} />
              <Button type="submit" className="w-full" loading={form.submitting}>Save</Button>
              {v.status !== 'PUBLISHED' && (
                <Button type="button" variant="secondary" className="w-full" disabled={form.submitting} onClick={() => save(null, true)}>Save and publish</Button>
              )}
              {form.dirty && <p className="text-center text-caption text-ink-muted">Unsaved changes</p>}
              {!isNew && <Button type="button" variant="ghost" className="mt-3 w-full text-danger" onClick={remove}>Delete this program</Button>}
            </div>
          </Panel>
          {!isNew && savedSlug && <ShareLink path={`/programs/${savedSlug}`} published={savedPublished} publishing={form.submitting} onPublish={() => save(null, true)} />}
          {!isNew && q.data && <InstructorAssignments programId={q.data.id} assigned={q.data.assignments.map((a) => a.instructor)} />}
        </div>
      </form>
    </AdminPage>
  );
}

function InstructorAssignments({ programId, assigned }: { programId: string; assigned: { id: string; displayName: string }[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [pick, setPick] = useState('');
  const instructors = useQuery({ queryKey: ['admin', 'instructors'], queryFn: () => api.get<{ id: string; displayName: string; status: string }[]>('/admin/instructors') });
  const add = useMutation({
    mutationFn: () => api.post(`/admin/programs/${programId}/instructors`, { instructorId: pick }),
    onSuccess: () => { setPick(''); qc.invalidateQueries({ queryKey: ['admin', 'program'] }); toast('Instructor assigned.'); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (iid: string) => api.delete(`/admin/programs/${programId}/instructors/${iid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'program'] }),
  });
  const available = (instructors.data ?? []).filter((i) => i.status === 'ACTIVE' && !assigned.some((a) => a.id === i.id));
  return (
    <Panel title="Instructors" description="Assigned instructors can see participants’ first names for this program only.">
      <ul className="mb-4 space-y-2">
        {assigned.length === 0 && <li className="text-sm text-ink-muted">None assigned.</li>}
        {assigned.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded bg-navy-50 px-3 py-2 text-sm">
            <span className="font-medium text-heading">{a.displayName}</span>
            <button type="button" className="text-danger" onClick={() => remove.mutate(a.id)} aria-label={`Remove ${a.displayName}`}><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <div className="flex gap-2">
          <select aria-label="Instructor to assign" value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded border border-line-strong px-2 py-2 text-sm">
            <option value="">Choose instructor</option>
            {available.map((i) => <option key={i.id} value={i.id}>{i.displayName}</option>)}
          </select>
          <Button size="sm" disabled={!pick} loading={add.isPending} onClick={() => add.mutate()}>Assign</Button>
        </div>
      )}
    </Panel>
  );
}
