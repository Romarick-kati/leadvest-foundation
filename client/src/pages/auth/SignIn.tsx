import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Button, FormError, TextField } from '../../components/ui';
import { AuthShell, safeNext } from './AuthShell';
import { GoogleButton, GoogleError, OrDivider, googleStartUrl, useGoogleEnabled } from './Google';
import { useT } from '../../i18n';

export default function SignIn() {
  const t = useT();
  useDocumentTitle(t('common.signIn'));
  const google = useGoogleEnabled();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, setUser, refresh } = useAuth();
  const form = useForm({ identifier: '', password: '' });
  const next = params.get('next');

  useEffect(() => {
    if (user) navigate(safeNext(next, homeFor(user)), { replace: true });
  }, [user, next, navigate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      const res = await api.post<{ mfaRequired: boolean; user?: User }>('/auth/login', v);
      if (res.mfaRequired) {
        await refresh();
        navigate(`/sign-in/verify${next ? `?next=${encodeURIComponent(next)}` : ''}`);
      } else if (res.user) {
        setUser(res.user);
      }
    });
  };

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      footer={<>{t('auth.newHere')} <Link to="/register">{t('auth.createParentAccount')}</Link></>}
    >
      <GoogleError />
      {google && (
        <>
          <GoogleButton href={googleStartUrl('login', next)} label={t('auth.continueGoogle')} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={form.formError} />
        <TextField label={t('auth.identifier')} autoComplete="username" required autoFocus {...form.bind('identifier')} />
        <TextField label={t('auth.password')} type="password" autoComplete="current-password" required {...form.bind('password')} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold">{t('auth.forgot')}</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>{t('common.signIn')}</Button>
      </form>
    </AuthShell>
  );
}
