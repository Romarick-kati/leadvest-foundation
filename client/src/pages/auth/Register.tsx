import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Button, FormError, TextField } from '../../components/ui';
import { AuthShell } from './AuthShell';
import { GoogleButton, GoogleError, OrDivider, googleStartUrl, useGoogleEnabled } from './Google';
import { useT } from '../../i18n';

/**
 * One short form, laid out exactly like the sign in screen: Google first, then name, email and
 * password. Nobody is asked who they are here. The role (learner or parent) is chosen with one tap
 * on the next screen, so the same sign up works for every kind of visitor.
 */
export default function Register() {
  const t = useT();
  useDocumentTitle(t('auth.createTitle'));
  const google = useGoogleEnabled();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [done, setDone] = useState<{ delivered: boolean } | null>(null);
  const form = useForm({ displayName: '', email: '', password: '' });

  useEffect(() => {
    if (user && !done) navigate(homeFor(user), { replace: true });
  }, [user, done, navigate]);

  if (done) return <Navigate to="/welcome" replace state={{ delivered: done.delivered }} />;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      // Creating the account means agreeing to the terms; the screen says so right under the button.
      const res = await api.post<{ user: User; verificationEmailDelivered: boolean }>('/auth/register', { ...v, acceptTerms: true });
      setDone({ delivered: res.verificationEmailDelivered });
      setUser(res.user);
    });
  };

  return (
    <AuthShell
      title={t('auth.createTitle')}
      footer={<>{t('auth.haveAccount')} <Link to="/sign-in">{t('common.signIn')}</Link></>}
    >
      <GoogleError />
      {google && (
        <>
          <GoogleButton href={googleStartUrl('register')} label={t('auth.signUpGoogle')} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={form.formError} />
        <TextField label={t('auth.yourName')} autoComplete="name" required {...form.bind('displayName')} />
        <TextField label={t('auth.email')} type="email" autoComplete="email" required {...form.bind('email')} />
        <TextField label={t('auth.password')} type="password" autoComplete="new-password" required hint={t('auth.passwordHint')} {...form.bind('password')} />
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>{t('auth.createAccount')}</Button>
        <p className="text-caption text-ink-muted">
          {t('auth.agreePrefix')} <Link to="/terms" target="_blank">{t('auth.termsLink')}</Link> {t('auth.agreeMiddle')} <Link to="/privacy" target="_blank">{t('auth.privacyLink')}</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
