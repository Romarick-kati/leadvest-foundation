import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from '../ui/icons';
import { apiUrl } from '../../lib/api';
import { useT } from '../../i18n';

type Health = 'ok' | 'no_api' | 'no_database';

async function checkHealth(): Promise<Health> {
  try {
    const res = await fetch(apiUrl('/health'), { headers: { Accept: 'application/json' } });
    if (!res.headers.get('content-type')?.includes('application/json')) return 'no_api';
    const body = (await res.json()) as { database?: string };
    return body.database === 'ok' ? 'ok' : 'no_database';
  } catch {
    return 'no_api';
  }
}

/**
 * Says plainly when the site is running without its server or database (for example a fresh
 * Netlify deploy before the database is added), instead of letting forms fail silently.
 */
export function ServiceNotice() {
  // Checked once the page has loaded, so the check never competes with the page itself.
  const t = useT();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const { data } = useQuery({ queryKey: ['health'], queryFn: checkHealth, staleTime: 5 * 60_000, retry: false, enabled: ready });
  if (!data || data === 'ok') return null;
  return (
    <div role="status" className="border-b border-sun bg-sun-100 text-heading">
      <div className="container-page flex items-start gap-3 py-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          <strong>{t('status.previewTitle')}</strong> {data === 'no_api' ? t('status.noApi') : t('status.noDatabase')}
        </p>
      </div>
    </div>
  );
}
