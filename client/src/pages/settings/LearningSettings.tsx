// The rounded learning font loads only on learning pages.
import '@fontsource-variable/nunito';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { Button, FormError, Panel, TableSkeleton, Toggle, useToast } from '../../components/ui';
import { cn } from '../../lib/cn';
import { SettingsHeader } from './SettingsLayout';

interface LearnerProfile { learningLevel: 'starter' | 'explorer' | 'leader'; readAloud: boolean; largerText: boolean }

const levels = [
  { value: 'starter', label: 'Starter', text: 'Just beginning' },
  { value: 'explorer', label: 'Explorer', text: 'Ready for more' },
  { value: 'leader', label: 'Leader', text: 'Up for a challenge' },
] as const;

export default function LearningSettings() {
  useDocumentTitle('Learning preferences');
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['learner-profile'], queryFn: () => api.get<LearnerProfile>('/account/learning') });
  const [draft, setDraft] = useState<LearnerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (q.data && !draft) setDraft({ learningLevel: q.data.learningLevel, readAloud: q.data.readAloud, largerText: q.data.largerText }); }, [q.data, draft]);
  const dirty = Boolean(q.data && draft && (Object.keys(draft) as (keyof LearnerProfile)[]).some((k) => draft[k] !== q.data![k]));
  useUnsavedChanges(dirty);

  if (!draft) return <TableSkeleton rows={3} />;
  return (
    <div className="font-play">
      <SettingsHeader title="Learning preferences" description="Choose what feels right for you." />
      <div className="space-y-6">
        <Panel title="My level">
          <div role="radiogroup" aria-label="Learning level" className="grid gap-3 sm:grid-cols-3">
            {levels.map((l) => (
              <button key={l.value} type="button" role="radio" aria-checked={draft.learningLevel === l.value} onClick={() => setDraft({ ...draft, learningLevel: l.value })} className={cn('rounded-2xl border-2 p-4 text-left', draft.learningLevel === l.value ? 'border-blue-600 bg-blue-50' : 'border-line hover:border-blue')}>
                <span className="block text-lg font-extrabold text-heading">{l.label}</span>
                <span className="text-ink-muted">{l.text}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Display">
          <Toggle label="Bigger words in lessons" checked={draft.largerText} onChange={(v) => setDraft({ ...draft, largerText: v })} />
        </Panel>
        <FormError message={error} />
        <Button
          size="lg"
          disabled={!dirty}
          loading={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              const saved = await api.patch<LearnerProfile>('/account/learning', draft);
              qc.setQueryData(['learner-profile'], saved);
              toast('Saved!');
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Could not save.');
            } finally {
              setSaving(false);
            }
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
