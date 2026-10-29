import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import type { SiteSettings } from '../../lib/types';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { Alert, Badge, Button, FormError, PageLoader, Panel, TextArea, TextField, Toggle, useToast } from '../../components/ui';
import { AdminPage } from './shared';
import { missingLegalFacts } from '../../lib/policyText';

interface SettingsResponse {
  site: SiteSettings;
  system: { environment: string; emailTransport: string; emailDeliveryConfigured: boolean; paymentsMode: string; requireAdmin2fa: boolean; cookieSameSite: string };
}

export default function SettingsAdmin() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get<SettingsResponse>('/admin/settings') });
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (q.data && !site) setSite(q.data.site); }, [q.data, site]);
  const dirty = Boolean(site && q.data && JSON.stringify(site) !== JSON.stringify(q.data.site));
  useUnsavedChanges(dirty);
  if (!site || !q.data) return <PageLoader />;

  const set = <K extends keyof SiteSettings>(section: K, patch: Partial<SiteSettings[K]>) => setSite({ ...site, [section]: { ...site[section], ...patch } });
  const nullable = (v: string) => (v.trim() ? v : null);
  const sys = q.data.system;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.put<SiteSettings>('/admin/settings', site);
      qc.setQueryData(['admin', 'settings'], { ...q.data, site: saved });
      setSite(saved);
      qc.invalidateQueries({ queryKey: ['site'] });
      toast('Settings saved.');
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} ${Object.entries(e.fields).map(([k, v]) => `${k}: ${v}`).join('; ')}` : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Settings" description="Approved foundation information, branding and features. Empty fields show a clear placeholder on the website." actions={<Button onClick={save} loading={saving} disabled={!dirty}>Save settings</Button>}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <FormError message={error} />
          <Panel title="Organisation" description="Only enter information the foundation has approved for publication.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" value={site.organization.name} onChange={(e) => set('organization', { name: e.target.value })} />
              <TextField label="Short name" value={site.organization.shortName} onChange={(e) => set('organization', { shortName: e.target.value })} />
              <div className="sm:col-span-2"><TextField label="Tagline" optional value={site.organization.tagline ?? ''} onChange={(e) => set('organization', { tagline: nullable(e.target.value) })} /></div>
              <div className="sm:col-span-2"><TextArea label="Mission" optional rows={3} value={site.organization.mission ?? ''} onChange={(e) => set('organization', { mission: nullable(e.target.value) })} /></div>
              <div className="sm:col-span-2"><TextArea label="Vision" optional rows={3} value={site.organization.vision ?? ''} onChange={(e) => set('organization', { vision: nullable(e.target.value) })} /></div>
              <div className="sm:col-span-2"><TextArea label="Approach" optional rows={4} value={site.organization.approach ?? ''} onChange={(e) => set('organization', { approach: nullable(e.target.value) })} /></div>
              <TextField label="Country of operation" optional value={site.organization.country ?? ''} onChange={(e) => set('organization', { country: nullable(e.target.value) })} />
              <TextField label="Founder name" optional hint="Shown on the About page and in the footer." value={site.organization.founderName ?? ''} onChange={(e) => set('organization', { founderName: nullable(e.target.value) })} />
              <TextField label="Founder title" optional hint="For example Founder, or Founder and Director." value={site.organization.founderTitle ?? ''} onChange={(e) => set('organization', { founderTitle: nullable(e.target.value) })} />
              <TextField label="Registration details" optional hint="Legal registration, exactly as approved." value={site.organization.registrationDetails ?? ''} onChange={(e) => set('organization', { registrationDetails: nullable(e.target.value) })} />
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-h4">Values</h3><Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('organization', { values: [...site.organization.values, { title: '', description: '' }] })}>Add value</Button></div>
              <ul className="space-y-3">
                {site.organization.values.map((val, i) => (
                  <li key={i} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
                    <TextField label="Title" value={val.title} onChange={(e) => set('organization', { values: site.organization.values.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                    <TextField label="Description" value={val.description} onChange={(e) => set('organization', { values: site.organization.values.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                    <Button size="sm" variant="ghost" className="text-danger" aria-label="Remove value" onClick={() => set('organization', { values: site.organization.values.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Email" type="email" optional value={site.contact.email ?? ''} onChange={(e) => set('contact', { email: nullable(e.target.value) })} />
              <TextField label="Phone" optional value={site.contact.phone ?? ''} onChange={(e) => set('contact', { phone: nullable(e.target.value) })} />
              <TextField label="Address" optional value={site.contact.address ?? ''} onChange={(e) => set('contact', { address: nullable(e.target.value) })} />
              <TextField label="Office hours" optional value={site.contact.officeHours ?? ''} onChange={(e) => set('contact', { officeHours: nullable(e.target.value) })} />
              <TextField label="WhatsApp number" optional inputMode="numeric" hint="Digits only, starting with the country code, with no plus sign, spaces or leading zeros. The chat button appears once this is set." value={site.contact.whatsapp ?? ''} onChange={(e) => set('contact', { whatsapp: nullable(e.target.value.replace(/\D/g, '')) })} />
              <TextField label="WhatsApp greeting" optional hint="Prefilled message when someone opens the chat." value={site.contact.whatsappMessage ?? ''} onChange={(e) => set('contact', { whatsappMessage: nullable(e.target.value) })} />
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-h4">Verified social links</h3><Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('contact', { social: [...site.contact.social, { label: '', url: 'https://' }] })}>Add link</Button></div>
              <p className="mb-3 text-sm text-ink-muted">Paste the full address of each official profile. Facebook, Instagram, LinkedIn, YouTube, TikTok, X and WhatsApp get their own icon in the footer automatically. Only add profiles the foundation controls.</p>
              <ul className="space-y-3">
                {site.contact.social.map((s, i) => (
                  <li key={i} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
                    <TextField label="Label" value={s.label} onChange={(e) => set('contact', { social: site.contact.social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <TextField label="URL" type="url" value={s.url} onChange={(e) => set('contact', { social: site.contact.social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                    <Button size="sm" variant="ghost" className="text-danger" aria-label="Remove link" onClick={() => set('contact', { social: site.contact.social.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title="Impact figures" description="Shown as animated counters in an At a glance section on the homepage and About page. Only enter figures the foundation can evidence, such as counts from its own records. The section stays hidden while this list is empty.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Figures as of" optional placeholder="For example: as of June 2026" value={site.impact.asOf ?? ''} onChange={(e) => set('impact', { asOf: nullable(e.target.value) })} />
              <TextField label="Source note" optional hint="Where the figures come from, shown under the counters." value={site.impact.note ?? ''} onChange={(e) => set('impact', { note: nullable(e.target.value) })} />
            </div>
            <div className="mt-6 space-y-4">
              {site.impact.items.map((it, i) => {
                const update = (patch: Partial<typeof it>) => set('impact', { items: site.impact.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <fieldset key={i} className="grid items-end gap-3 rounded-lg border border-line p-4 sm:grid-cols-[minmax(0,5rem)_minmax(0,8rem)_minmax(0,5rem)_minmax(0,1fr)_auto]">
                    <legend className="sr-only">Figure {i + 1}</legend>
                    <TextField label="Before" optional value={it.prefix} maxLength={3} onChange={(e) => update({ prefix: e.target.value })} />
                    <TextField label="Number" type="number" min={0} value={String(it.value)} onChange={(e) => update({ value: Math.max(0, Number(e.target.value) || 0) })} />
                    <TextField label="After" optional value={it.suffix} maxLength={8} hint="e.g. + or %" onChange={(e) => update({ suffix: e.target.value })} />
                    <TextField label="Label" value={it.label} maxLength={80} onChange={(e) => update({ label: e.target.value })} />
                    <Button size="sm" variant="ghost" className="text-danger" aria-label={`Remove figure ${i + 1}`} onClick={() => set('impact', { items: site.impact.items.filter((_, j) => j !== i) })}><Trash2 size={16} /></Button>
                  </fieldset>
                );
              })}
              {site.impact.items.length < 6 && (
                <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('impact', { items: [...site.impact.items, { value: 0, prefix: '', suffix: '', label: '' }] })}>Add figure</Button>
              )}
            </div>
          </Panel>

          <Panel title="Branding" description="Upload the official logo in Media (folder: branding), then paste its URL here. Leave empty to use the built in placeholder.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full logo URL" optional placeholder="/uploads/branding/…" value={site.branding.logoUrl ?? ''} onChange={(e) => set('branding', { logoUrl: nullable(e.target.value) })} />
              <TextField label="Square logo mark URL" optional value={site.branding.logoMarkUrl ?? ''} onChange={(e) => set('branding', { logoMarkUrl: nullable(e.target.value) })} />
              <TextField label="Logo description" value={site.branding.logoAlt} onChange={(e) => set('branding', { logoAlt: e.target.value })} />
            </div>
          </Panel>

          <Panel title="Legal details" description="The Privacy, Terms, Child safety, Consent and Cookies pages are written from these answers, so you never edit their text. Ask the foundation's director (and a lawyer) for the facts, type them here, then save.">
            {missingLegalFacts(site).length > 0 ? (
              <Alert tone="warning" title={`Still needed (${missingLegalFacts(site).length})`} className="mb-5">{missingLegalFacts(site).join(' · ')}</Alert>
            ) : (
              <Alert tone="success" title="All the facts are filled in" className="mb-5">Open the policy pages to read them, then switch on the approval toggles below.</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full legal name" optional hint="As registered, for example the association's full name." value={site.legal.legalName ?? ''} onChange={(e) => set('legal', { legalName: nullable(e.target.value) })} />
              <TextField label="Registration number" optional value={site.legal.registrationNumber ?? ''} onChange={(e) => set('legal', { registrationNumber: nullable(e.target.value) })} />
              <TextField label="Governing law" optional placeholder="the laws of Cameroon" value={site.legal.governingLaw ?? ''} onChange={(e) => set('legal', { governingLaw: nullable(e.target.value) })} />
              <TextField label="Policies last reviewed" optional placeholder="For example: 1 March 2027" value={site.legal.lastReviewed ?? ''} onChange={(e) => set('legal', { lastReviewed: nullable(e.target.value) })} />
              <TextField label="Safeguarding lead (name)" optional hint="The person who handles child safety concerns." value={site.legal.safeguardingName ?? ''} onChange={(e) => set('legal', { safeguardingName: nullable(e.target.value) })} />
              <TextField label="Safeguarding lead (phone or email)" optional value={site.legal.safeguardingContact ?? ''} onChange={(e) => set('legal', { safeguardingContact: nullable(e.target.value) })} />
              <div className="sm:col-span-2"><TextArea label="How long you keep data" optional rows={3} hint="For example: Account data is kept while the account is open and for 12 months after it is closed. Payment records are kept for 10 years for accounting." value={site.legal.dataRetention ?? ''} onChange={(e) => set('legal', { dataRetention: nullable(e.target.value) })} /></div>
              <div className="sm:col-span-2"><TextArea label="Refund and cancellation rules" optional rows={4} hint="For example: The access fee is not refundable once access has started, except if you were charged twice or by mistake. Contact us within 7 days." value={site.legal.refundPolicy ?? ''} onChange={(e) => set('legal', { refundPolicy: nullable(e.target.value) })} /></div>
            </div>
          </Panel>

          <Panel title="Policies" description="Switch a policy to approved only after the foundation's director (and ideally a lawyer) has read the page and signed it off. Until then a waiting for approval notice is shown.">
            <div className="divide-y divide-line">
              <Toggle label="Privacy notice approved" checked={site.policies.privacyApproved} onChange={(v) => set('policies', { privacyApproved: v })} />
              <Toggle label="Child safety policy approved" checked={site.policies.childSafetyApproved} onChange={(v) => set('policies', { childSafetyApproved: v })} />
              <Toggle label="Website terms approved" checked={site.policies.termsApproved} onChange={(v) => set('policies', { termsApproved: v })} />
            </div>
          </Panel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Features">
            <div className="divide-y divide-line">
              <Toggle label="Learner accounts" checked={site.features.learnerAccounts} onChange={(v) => set('features', { learnerAccounts: v })} />
              <Toggle label="Event registration" checked={site.features.eventRegistration} onChange={(v) => set('features', { eventRegistration: v })} />
              <Toggle label="Program registration" checked={site.features.programRegistration} onChange={(v) => set('features', { programRegistration: v })} />
            </div>
          </Panel>
          <Panel title="Donations">
            <Toggle label="Online donations" hint="Cannot be enabled until a live payment provider is configured and approved." checked={site.donations.enabled} disabled={sys.paymentsMode === 'disabled'} onChange={(v) => set('donations', { enabled: v })} />
            <TextArea label="Message on the support page" optional rows={3} value={site.donations.message ?? ''} onChange={(e) => set('donations', { message: nullable(e.target.value) })} />
          </Panel>
          <Panel title="System status" description="Read only. Secret values are never shown.">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt>Environment</dt><dd><Badge>{sys.environment}</Badge></dd></div>
              <div className="flex justify-between gap-2"><dt>Email delivery</dt><dd>{sys.emailDeliveryConfigured ? <Badge tone="mint">Connected</Badge> : <Badge tone="sun">Not connected ({sys.emailTransport})</Badge>}</dd></div>
              <div className="flex justify-between gap-2"><dt>Payments</dt><dd><Badge tone={sys.paymentsMode === 'disabled' ? 'neutral' : 'sun'}>{sys.paymentsMode === 'mock' ? 'Simulation' : 'Off'}</Badge></dd></div>
              <div className="flex justify-between gap-2"><dt>Admin two factor required</dt><dd>{sys.requireAdmin2fa ? <Badge tone="mint">Yes</Badge> : <Badge tone="danger">No</Badge>}</dd></div>
            </dl>
            {!sys.requireAdmin2fa && <Alert tone="warning" className="mt-3">Requiring two factor for administrators is strongly recommended.</Alert>}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
