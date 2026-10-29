import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, Checkbox, FormError, PageLoader, Panel, Select, TextArea, TextField, useToast } from '../../components/ui';
import { AdminPage, ErrorSummary, MoreOptions, publishOptions, slugify } from './shared';
import { ShareLink } from './ShareLink';
import { ImageKeyField } from './ImageKeyField';

const empty = {
  title: '', slug: '', summary: '', description: '', startsAt: '', endsAt: '', timezone: 'Africa/Douala', locationType: 'IN_PERSON', location: '', audience: '', capacity: '',
  registrationOpen: false, registrationDeadline: '', registrationInfo: '', externalUrl: '', price: '', currency: 'XAF', imageKey: '', imageAlt: '', eventStatus: 'SCHEDULED', status: 'DRAFT',
};

// datetime-local works in the browser's local time; values are converted to ISO for the API.
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function EventEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'event', id], queryFn: () => api.get<Record<string, unknown>>(`/admin/events/${id}`), enabled: !isNew });
  const form = useForm(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  useUnsavedChanges(form.dirty);

  useEffect(() => {
    if (!q.data) return;
    const e = q.data as Record<string, string | number | boolean | null>;
    form.setValues({
      ...empty,
      ...Object.fromEntries(Object.keys(empty).map((k) => [k, e[k] ?? (empty as Record<string, unknown>)[k]])),
      startsAt: toLocalInput(e.startsAt as string),
      endsAt: toLocalInput(e.endsAt as string | null),
      registrationDeadline: toLocalInput(e.registrationDeadline as string | null),
      capacity: e.capacity != null ? String(e.capacity) : '',
      price: e.priceCents != null ? String((e.priceCents as number) / 100) : '',
      location: (e.location as string) ?? '',
      externalUrl: (e.externalUrl as string) ?? '',
    } as typeof empty);
    form.setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const save = (ev: React.FormEvent | null, publish = false) => {
    ev?.preventDefault();
    form.submit(async (v) => {
      const { price, capacity, timezone, currency, slug, ...rest } = v;
      const body = {
        ...rest,
        // A new event gets its web address from the title on the server unless one was typed.
        ...(isNew && !slugTouched ? {} : { slug }),
        ...(isNew ? { timezone, currency: currency || null } : {}),
        status: publish ? 'PUBLISHED' : v.status,
        startsAt: fromLocalInput(v.startsAt),
        endsAt: fromLocalInput(v.endsAt),
        registrationDeadline: fromLocalInput(v.registrationDeadline),
        capacity: capacity ? Number(capacity) : null,
        priceCents: price ? Math.round(Number(price) * 100) : null,
        externalUrl: v.externalUrl || null,
      };
      const saved = isNew ? await api.post<{ id: string }>('/admin/events', body) : await api.patch<{ id: string }>(`/admin/events/${id}`, body);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast(isNew ? 'Event created. Its link is ready on the next page.' : publish ? 'Event saved and published.' : 'Event saved.');
      form.setDirty(false);
      if (isNew) navigate(`/admin/events/${saved.id}`, { replace: true });
    });
  };

  if (!isNew && q.isLoading) return <PageLoader />;
  const v = form.values;
  const savedSlug = (q.data?.slug as string | undefined) ?? '';
  const savedPublished = q.data?.status === 'PUBLISHED';
  const hasErrorsInMore = ['slug', 'audience', 'registrationDeadline', 'registrationInfo', 'price', 'priceCents', 'externalUrl', 'eventStatus'].some((k) => form.errors[k]);
  const remove = async () => {
    if (!window.confirm('Delete this event for good? Its registrations are deleted with it. To hide it without deleting, set it to Draft instead.')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      form.setDirty(false);
      toast('Event deleted.');
      navigate('/admin/events', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete it.', 'error');
    }
  };
  return (
    <AdminPage title={isNew ? 'New event' : v.title || 'Event'} actions={!isNew && savedPublished ? <a href={`/events/${savedSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold">View live page <ExternalLink size={14} aria-hidden /></a> : undefined}>
      <Link to="/admin/events" className="-mt-4 mb-4 inline-flex items-center gap-1 text-sm font-semibold no-underline"><ChevronLeft size={16} aria-hidden /> All events</Link>
      <form onSubmit={(ev) => save(ev)} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] pb-24 xl:pb-0">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift xl:hidden">
          <Button type="submit" className="w-full" loading={form.submitting}>Save</Button>
        </div>
        <div className="space-y-6">
          <FormError message={form.formError} />
          <ErrorSummary errors={form.errors} shownInline={[...Object.keys(empty), 'priceCents']} />
          <Panel title="Event details">
            <div className="space-y-4">
              <TextField label="Title" required {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); if (!slugTouched) form.set('slug', slugify(e.target.value)); }} />
              <TextArea label="Short summary" required rows={2} {...form.bind('summary')} />
              <TextArea label="Description" required rows={6} {...form.bind('description')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Starts" type="datetime-local" required {...form.bind('startsAt')} />
                <TextField label="Ends" type="datetime-local" optional {...form.bind('endsAt')} />
                <Select label="Format" options={[{ value: 'IN_PERSON', label: 'In person' }, { value: 'ONLINE', label: 'Online' }, { value: 'HYBRID', label: 'In person and online' }]} {...form.bind('locationType')} />
                <TextField label="Location" optional {...form.bind('location')} />
              </div>
            </div>
          </Panel>
          <Panel title="Image"><ImageKeyField folder="events" value={v.imageKey} onChange={(x) => form.set('imageKey', x)} alt={v.imageAlt} onAltChange={(x) => form.set('imageAlt', x)} /></Panel>
          <MoreOptions open={hasErrorsInMore}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Web address" hint={`Made from the title. Shown as /events/${v.slug || 'your-event'}`} {...form.bind('slug')} onChange={(e) => { setSlugTouched(true); form.set('slug', slugify(e.target.value)); }} />
              <TextField label="Intended audience" optional placeholder="for example Families" {...form.bind('audience')} />
              <Select label="Event status" options={[{ value: 'SCHEDULED', label: 'Scheduled' }, { value: 'POSTPONED', label: 'Postponed' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'COMPLETED', label: 'Completed' }]} {...form.bind('eventStatus')} />
              <TextField label="Registration deadline" type="datetime-local" optional {...form.bind('registrationDeadline')} />
              <div className="sm:col-span-2"><TextArea label="Registration instructions" optional rows={3} {...form.bind('registrationInfo')} /></div>
              <TextField label="Price" optional inputMode="decimal" hint="The amount people pay online, in FCFA. Leave empty if it is free." {...form.bind('price')} error={form.errors.price || form.errors.priceCents} />
              <TextField label="External registration link" optional type="url" hint="Only if registration happens on another website." {...form.bind('externalUrl')} />
              {v.price && <div className="sm:col-span-2"><Alert tone="info">Paid registration stays pending until a payment provider confirms payment. Online payment is not live yet.</Alert></div>}
            </div>
          </MoreOptions>
        </div>
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Select label="Visibility" options={publishOptions} {...form.bind('status')} />
              <Checkbox label="Registration open" {...form.bindCheck('registrationOpen')} />
              <TextField label="Capacity" optional inputMode="numeric" hint="Leave empty for no limit. Extra registrations join a waiting list." {...form.bind('capacity')} />
              <Button type="submit" className="w-full" loading={form.submitting}>Save</Button>
              {v.status !== 'PUBLISHED' && (
                <Button type="button" variant="secondary" className="w-full" disabled={form.submitting} onClick={() => save(null, true)}>Save and publish</Button>
              )}
              {form.dirty && <p className="text-center text-caption text-ink-muted">Unsaved changes</p>}
              {!isNew && <Button type="button" variant="ghost" className="mt-3 w-full text-danger" onClick={remove}>Delete this event</Button>}
            </div>
          </Panel>
          {!isNew && savedSlug && <ShareLink path={`/events/${savedSlug}`} published={savedPublished} publishing={form.submitting} onPublish={() => save(null, true)} />}
        </div>
      </form>
    </AdminPage>
  );
}
