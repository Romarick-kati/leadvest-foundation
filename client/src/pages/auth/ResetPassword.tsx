import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, ButtonLink, FormError, TextField } from '../../components/ui';
import { useT } from '../../i18n';
import { AuthShell } from './AuthShell';

export default function ResetPassword() {
  const t = useT();
  useDocumentTitle(t('auth.newPasswordTitle'));
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState<{ twoFactorStillRequired: boolean } | null>(null);
  const form = useForm({ password: '', confirm: '' });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.values.password !== form.values.confirm) {
      form.setErrors({ confirm: t('auth.passwordsDiffer') });
      return;
    }
    form.submit(async (v) => {
      setDone(await api.post<{ twoFactorStillRequired: boolean }>('/auth/reset-password', { token, password: v.password }));
    });
  };

  if (!token) {
    return (
      <AuthShell title={t('auth.linkIncompleteTitle')}>
        <Alert tone="error">{t('auth.linkIncomplete')}</Alert>
        <ButtonLink to="/forgot-password" className="mt-6">{t('auth.requestNewLink')}</ButtonLink>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title={t('auth.passwordUpdatedTitle')}>
        <Alert tone="success">{t('auth.passwordUpdated')}{done.twoFactorStillRequired && ` ${t('auth.stillNeed2fa')}`}</Alert>
        <ButtonLink to="/sign-in" className="mt-6 w-full" size="lg">{t('common.signIn')}</ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.newPasswordTitle')} footer={<Link to="/sign-in">{t('auth.backToSignIn')}</Link>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={form.formError} />
        <TextField label={t('auth.newPassword')} type="password" autoComplete="new-password" required hint={t('auth.passwordHint')} {...form.bind('password')} />
        <TextField label={t('auth.confirmPassword')} type="password" autoComplete="new-password" required {...form.bind('confirm')} />
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>{t('auth.saveNewPassword')}</Button>
      </form>
    </AuthShell>
  );
}
