import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { usePreferences } from '../../lib/preferences';
import { Button, FormError, Panel, TableSkeleton, Toggle, useToast } from '../../components/ui';
import { cn } from '../../lib/cn';
import { SettingsHeader, SettingsLoadError } from './SettingsLayout';
import { usePreferencesForm } from './usePreferencesForm';

export default function AccessibilitySettings() {
  useDocumentTitle('Accessibility settings');
  const toast = useToast();
  const { systemReducedMotion } = usePreferences();
  const f = usePreferencesForm(['reduceMotion', 'textSize', 'underlineLinks']);
  return (
    <>
      <SettingsHeader title="Accessibility" description="Adjust how the website looks and moves. Saved to your account, so they follow you to other devices." />
      {f.loadError ? <SettingsLoadError message={f.loadError} onRetry={f.retry} /> : f.loading || !f.draft ? <TableSkeleton rows={3} /> : (
        <div className="space-y-6">
          <Panel title="Motion">
            <Toggle label="Reduce animation" hint="Turns off decorative movement and celebrations." checked={f.draft.reduceMotion} onChange={(v) => f.set('reduceMotion', v)} />
            {systemReducedMotion && <p className="text-sm text-ink-muted">Your device is already set to reduce motion, so we keep animation to a minimum.</p>}
          </Panel>
          <Panel title="Text size">
            <div role="radiogroup" aria-label="Text size" className="grid gap-3 sm:grid-cols-3">
              {(['standard', 'large', 'larger'] as const).map((size) => (
                <button key={size} type="button" role="radio" aria-checked={f.draft!.textSize === size} onClick={() => f.set('textSize', size)} className={cn('rounded-lg border-2 px-4 py-4 text-left transition-colors', f.draft!.textSize === size ? 'border-blue-600 bg-blue-50' : 'border-line hover:border-blue')}>
                  <span className="block font-semibold text-heading" style={{ fontSize: size === 'standard' ? 16 : size === 'large' ? 18 : 20 }}>Aa</span>
                  <span className="text-sm capitalize text-ink">{size}</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Links">
            <Toggle label="Always underline links" hint="Makes links easier to spot without relying on colour." checked={f.draft.underlineLinks} onChange={(v) => f.set('underlineLinks', v)} />
          </Panel>
          <FormError message={f.error} />
          <Button disabled={!f.dirty} loading={f.saving} onClick={async () => (await f.save()) && toast('Accessibility settings saved.')}>Save changes</Button>
        </div>
      )}
    </>
  );
}
