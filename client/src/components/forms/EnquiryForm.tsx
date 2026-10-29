import { useRef, useState } from 'react';
import { m } from 'framer-motion';
import { CheckCircle2 } from '../ui/icons';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button, Checkbox, FormError, Select, TextArea, TextField } from '../ui';
import { useForm } from './useForm';
import { useT } from '../../i18n';

export const enquiryCategories = [
  { value: 'general', label: 'General question' },
  { value: 'programs', label: 'Programs and activities' },
  { value: 'events', label: 'Events' },
  { value: 'parents', label: 'Parents and families' },
  { value: 'volunteer', label: 'Volunteering' },
  { value: 'mentor', label: 'Mentoring' },
  { value: 'partner', label: 'Partnerships' },
  { value: 'support', label: 'Supporting the foundation' },
  { value: 'media', label: 'Media' },
  { value: 'feedback', label: 'Website feedback' },
  { value: 'other', label: 'Something else' },
];

/**
 * Shared enquiry form. Collects only what is needed to reply. Spam protection uses a hidden
 * honeypot field and a minimum fill time, checked on the server, plus rate limiting.
 */
export function EnquiryForm({ category = 'general', lockCategory, showOrganization, messageLabel, submitLabel }: {
  category?: string;
  lockCategory?: boolean;
  showOrganization?: boolean;
  messageLabel?: string;
  submitLabel?: string;
}) {
  const t = useT();
  const startedAt = useRef(Date.now());
  // A stopwatch that keeps counting correctly even if the device clock is adjusted.
  const openedAt = useRef(performance.now());
  const [sent, setSent] = useState(false);
  const form = useForm({ category, name: '', email: '', phone: '', organization: '', subject: '', message: '', website: '', consent: false });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      await api.post('/enquiries', { ...v, startedAt: startedAt.current, elapsedMs: Math.max(0, Math.round(performance.now() - openedAt.current)) });
      setSent(true);
    });
  };

  if (sent) {
    return (
      <m.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} role="status" className="rounded-lg border border-mint bg-mint-50 p-8 text-center">
        <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }} className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mint text-heading">
          <CheckCircle2 size={30} aria-hidden />
        </m.div>
        <h3 className="text-h3">{t('contact.sentTitle')}</h3>
        <p className="mt-2 text-ink">{t('contact.sentText')}</p>
        <Button variant="secondary" className="mt-6" onClick={() => { setSent(false); form.setValues({ ...form.values, message: '', subject: '' }); startedAt.current = Date.now(); openedAt.current = performance.now(); }}>
          {t('contact.sendAnother')}
        </Button>
      </m.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={form.formError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={t('contact.name')} autoComplete="name" required {...form.bind('name')} />
        <TextField label={t('contact.email')} type="email" autoComplete="email" required {...form.bind('email')} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {!lockCategory && <Select label={t('contact.topic')} options={enquiryCategories.map((c) => ({ ...c, label: t(`contact.categories.${c.value}`) }))} required {...form.bind('category')} />}
        <TextField label={t('contact.phone')} type="tel" autoComplete="tel" optional hint={t('contact.phoneHint')} {...form.bind('phone')} />
        {showOrganization && <TextField label={t('contact.organisation')} optional autoComplete="organization" {...form.bind('organization')} />}
      </div>
      <TextField label={t('contact.subject')} optional {...form.bind('subject')} />
      <TextArea label={messageLabel ?? t('contact.message')} required rows={6} {...form.bind('message')} />
      {/* Honeypot: hidden from people, often filled in by bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website-field">Leave this field empty</label>
        <input id="website-field" tabIndex={-1} autoComplete="off" {...form.bind('website')} />
      </div>
      <Checkbox
        label={
          <>
            {t('contact.consentPrefix')} <Link to="/privacy" className="underline">{t('contact.privacyLink')}</Link>.
          </>
        }
        {...form.bindCheck('consent')}
      />
      <Button type="submit" size="lg" loading={form.submitting}>
        {submitLabel ?? t('contact.send')}
      </Button>
    </form>
  );
}
