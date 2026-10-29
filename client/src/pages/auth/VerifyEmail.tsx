import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, ButtonLink, Spinner } from '../../components/ui';
import { translateServer, useT } from '../../i18n';
import { AuthShell } from './AuthShell';

export default function VerifyEmail() {
  const t = useT();
  useDocumentTitle(t('auth.verifyTitle'));
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) {
      setState('error');
      setMessage(t('auth.linkMissing'));
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setState('ok');
        qc.invalidateQueries({ queryKey: ['me'] });
      })
      .catch((e) => {
        setState('error');
        setMessage(e instanceof ApiError ? translateServer(t, e.message) : t('errors.generic'));
      });
  }, [params, qc, t]);

  return (
    <AuthShell title={t('auth.verifyTitle')}>
      {state === 'working' && <Spinner label={t('auth.verifying')} />}
      {state === 'ok' && (
        <>
          <Alert tone="success" title={t('auth.verifiedTitle')}>{t('auth.verified')}</Alert>
          <ButtonLink to="/account" className="mt-6">{t('auth.goAccount')}</ButtonLink>
        </>
      )}
      {state === 'error' && (
        <>
          <Alert tone="error">{message}</Alert>
          <ButtonLink to="/settings/account" variant="secondary" className="mt-6">{t('auth.requestNewLink')}</ButtonLink>
        </>
      )}
    </AuthShell>
  );
}
