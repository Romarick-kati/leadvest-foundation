import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';

export interface ServerPreferences {
  reduceMotion: boolean;
  textSize: 'standard' | 'large' | 'larger';
  underlineLinks: boolean;
  accent: 'blue' | 'teal' | 'violet' | 'rose' | 'orange' | 'green';
  newsletterOptIn: boolean;
  eventAnnouncements: boolean;
  programUpdates: boolean;
  securityAlerts: boolean;
  showProfilePhoto: boolean;
  theme: 'system' | 'light' | 'dark';
  language: 'en' | 'fr' | 'es' | 'pt';
}

/** Loads preferences from the server, tracks local edits and saves the chosen keys. */
export function usePreferencesForm<K extends keyof ServerPreferences>(keys: K[]) {
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const q = useQuery({ queryKey: ['preferences'], queryFn: () => api.get<ServerPreferences>('/account/preferences') });
  const [draft, setDraft] = useState<Pick<ServerPreferences, K> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data && !draft) setDraft(Object.fromEntries(keys.map((k) => [k, q.data[k]])) as Pick<ServerPreferences, K>);
  }, [q.data, draft, keys]);

  const dirty = Boolean(q.data && draft && keys.some((k) => q.data![k] !== draft[k]));
  useUnsavedChanges(dirty);

  const save = async () => {
    if (!draft) return false;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.patch<ServerPreferences>('/account/preferences', draft);
      qc.setQueryData(['preferences'], saved);
      if (user) setUser({ ...user, preferences: { reduceMotion: saved.reduceMotion, textSize: saved.textSize, underlineLinks: saved.underlineLinks, accent: saved.accent, theme: saved.theme, language: saved.language } });
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { loading: q.isLoading, loadError: q.isError ? (q.error instanceof ApiError ? q.error.message : 'Could not load your settings.') : null, retry: () => { void q.refetch(); }, draft, set: (k: K, v: ServerPreferences[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d)), dirty, save, saving, error, reset: () => setDraft(null) };
}
