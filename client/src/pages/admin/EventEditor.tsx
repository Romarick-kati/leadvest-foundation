import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useForm } from '../../components/forms/useForm';
import { Button, Checkbox, FormError, PageLoader, Panel, Select, TextArea, TextField, useToast } from '../../components/ui';
import { refreshPublicContent, AdminPage, ErrorSummary, MoreOptions, publishOptions, slugify } from './shared';
import { currencyChoices, TIME_ZONES, asCurrency, autoSummary, isoToZonedInput, zonedInputToIso } from '../../lib/format';
import { JustCreated, PaymentNote, ShareLink } from './ShareLink';
import { ImageKeyField } from './ImageKeyField';
import { useSite } from '../../lib/site';

const empty = {
  title: '', slug: '', summary: '', description: '', startsAt: '', endsAt: '', timezone: 'Africa/Douala', locationType: 'IN_PERSON', location: '', audience: '', capacity: '',
  registrationOpen: false, registrationDeadline: '', registrationInfo: '', externalUrl: '', price: '', currency: 'XAF', imageKey: '', imageAlt: '', eventStatus: 'SCHEDULED', status: 'PUBLISHED',
};

export default function EventEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { site } = useSite();
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
      // Clock times are shown in the event's own time zone, not the time zone of whoever is editing.
      startsAt: isoToZonedInput(e.startsAt as string, (e.timezone as string) || 'Africa/Douala'),
      endsAt: isoToZonedInput(e.endsAt as string | null, (e.timezone as string) || 'Africa/Douala'),
      registrationDeadline: isoToZonedInput(e.registrationDeadline as string | null, (e.timezone as string) || 'Africa/Douala'),
      currency: asCurrency(e.currency as string | null),
      timezone: (e.timezone as string) || 'Africa/Douala',
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
        timezone,
        currency: asCurrency(currency),
        // The summary is optional: it is made from the start of the description when left empty.
        summary: v.summary.trim() || autoSummary(v.description),
        // A chosen picture always gets a description for screen readers; the title is used when none was typed.
        imageAlt: v.imageKey ? v.imageAlt || v.title : '',
        status: publish ? 'PUBLISHED' : v.status,
        startsAt: zonedInputToIso(v.startsAt, timezone),
        endsAt: zonedInputToIso(v.endsAt, timezone),
        registrationDeadline: zonedInputToIso(v.registrationDeadline, timezone),
        capacity: capacity ? Number(capacity) : null,
        priceCents: price ? Math.round(Number(price) * 100) : null,
        externalUrl: v.externalUrl || null,
      };
      const saved = isNew ? await api.post<{ id: string }>('/admin/events', body) : await api.patch<{ id: string }>(`/admin/events/${id}`, body);
      refreshPublicContent(qc);
      toast(isNew ? 'Event created. Its link is ready on the next page.' : publish ? 'Event saved and published.' : 'Event saved.');
      form.setDirty(false);
      if (isNew) navigate(`/admin/events/${saved.id}`, { replace: true, state: { justCreated: true } });
    });
  };

  if (!isNew && q.isLoading) return <PageLoader />;
  const v = form.values;
  const savedSlug = (q.data?.slug as string | undefined) ?? '';
  const savedPublished = q.data?.status === 'PUBLISHED';
  const hasErrorsInMore = ['slug', 'summary', 'endsAt', 'locationType', 'timezone', 'capacity', 'audience', 'registrationDeadline', 'registrationInfo', 'externalUrl', 'eventStatus'].some((k) => form.errors[k]);
  const remove = async () => {
    if (!window.confirm('Delete this event for good? Its registrations are deleted with it. To hide it without deleting, set it to Draft instead.')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      refreshPublicContent(qc);
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
      {savedSlug && <JustCreated what="event" path={`/events/${savedSlug}`} published={savedPublished} onPublish={() => save(null, true)} publishing={form.submitting} />}
      <form onSubmit={(ev) => save(ev)} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] pb-24 xl:pb-0">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift xl:hidden">
          <Button type="submit" className="w-full" loading={form.submitting}>{v.status === 'PUBLISHED' ? (isNew ? 'Create and publish' : 'Save and update the website') : 'Save as draft'}</Button>
        </div>
        <div className="space-y-6">
          <FormError message={form.formError} />
          <ErrorSummary errors={form.errors} shownInline={[...Object.keys(empty), 'priceCents']} />
          <Panel title="Event details">
            <div className="space-y-4">
              <TextField label="Title" required {...form.bind('title')} onChange={(e) => { form.set('title', e.target.value); if (!slugTouched) form.set('slug', slugify(e.target.value)); }} />
              <TextArea label="Description" required rows={5} hint="What the event is about, who it is for, and what to bring." {...form.bind('description')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Starts" type="datetime-local" required hint={`Time in ${TIME_ZONES.find((z) => z.value === v.timezone)?.label ?? v.timezone}. Change it in More options.`} {...form.bind('startsAt')} />
                <TextField label="Location" optional placeholder="for example Bepanda, Douala" {...form.bind('location')} />
              </div>
            </div>
          </Panel>
          <Panel title="Cost" description="Leave the price empty if the event is free.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Price" optional inputMode="decimal" placeholder="for example 5000" {...form.bind('price')} error={form.errors.price || form.errors.priceCents} />
              <Select label="Currency" options={currencyChoices(site.integrations?.paymentProviders)} {...form.bind('currency')} />
            </div>
            <div className="mt-4"><PaymentNote hasPrice={Boolean(v.price)} currency={v.currency} registrationOpen={v.registrationOpen} /></div>
          </Panel>
          <Panel title="Image"><ImageKeyField folder="events" title={v.title} value={v.imageKey} onChange={(x) => form.set('imageKey', x)} alt={v.imageAlt} onAltChange={(x) => form.set('imageAlt', x)} /></Panel>
          <MoreOptions open={hasErrorsInMore}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><TextArea label="Short summary" optional rows={2} hint="Shown in lists. If you leave it empty, it is made from the description." {...form.bind('summary')} /></div>
              <TextField label="Ends" type="datetime-local" optional {...form.bind('endsAt')} />
              <Select label="Format" options={[{ value: 'IN_PERSON', label: 'In person' }, { value: 'ONLINE', label: 'Online' }, { value: 'HYBRID', label: 'In person and online' }]} {...form.bind('locationType')} />
              <div className="sm:col-span-2"><Select label="Time zone of this event" hint="The times in this form are read in this time zone. Visitors in other countries also see the time in their own zone." options={TIME_ZONES} {...form.bind('timezone')} /></div>
              <TextField label="Capacity" optional inputMode="numeric" hint="Leave empty for no limit. Extra registrations join a waiting list." {...form.bind('capacity')} />
              <TextField label="Registration deadline" type="datetime-local" optional hint="Leave empty to keep registration open until the event ends." {...form.bind('registrationDeadline')} />
              <TextField label="Intended audience" optional placeholder="for example Families" {...form.bind('audience')} />
              <Select label="Event status" options={[{ value: 'SCHEDULED', label: 'Scheduled' }, { value: 'POSTPONED', label: 'Postponed' }, { value: 'CANCELLED', label: 'Cancelled' }, { value: 'COMPLETED', label: 'Completed' }]} {...form.bind('eventStatus')} />
              <div className="sm:col-span-2"><TextField label="Web address" hint={`Made from the title. Shown as /events/${v.slug || 'your-event'}`} {...form.bind('slug')} onChange={(e) => { setSlugTouched(true); form.set('slug', slugify(e.target.value)); }} /></div>
              <div className="sm:col-span-2"><TextArea label="Registration instructions" optional rows={3} {...form.bind('registrationInfo')} /></div>
              <div className="sm:col-span-2"><TextField label="External registration link" optional type="url" hint="Only if registration happens on another website." {...form.bind('externalUrl')} /></div>
            </div>
          </MoreOptions>
        </div>
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Publishing">
            <div className="space-y-4">
              <Select label="Visibility" options={publishOptions} {...form.bind('status')} />
              <Checkbox label="Registration open" {...form.bindCheck('registrationOpen')} />
              <Button type="submit" className="w-full" loading={form.submitting}>{v.status === 'PUBLISHED' ? (isNew ? 'Create and publish' : 'Save and update the website') : 'Save as draft'}</Button>
              {v.status !== 'PUBLISHED' && (
                <Button type="button" variant="secondary" className="w-full" disabled={form.submitting} onClick={() => save(null, true)}>Save and publish</Button>
              )}
              <p className="text-center text-caption text-ink-muted">{v.status === 'PUBLISHED' ? 'One click: your changes appear on the website within seconds.' : 'A draft is hidden from the public until you publish it.'}</p>
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
