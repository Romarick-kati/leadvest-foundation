import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, FormError, TextField } from '../../components/ui';
import { AuthShell } from './AuthShell';
import { translateServer, useT } from '../../i18n';

export default function ForgotPassword() {
  const t = useT();
  useDocumentTitle(t('auth.resetTitle'));
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({ email: '' });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      const res = await api.post<{ message: string }>('/auth/forgot-password', v);
      setMessage(res.message);
    });
  };
  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')} footer={<Link to="/sign-in">{t('auth.backToSignIn')}</Link>}>
      {message ? (
        <Alert tone="success" title={t('auth.checkEmail')}>{translateServer(t, message)} {t('auth.linkOnce')}</Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormError message={form.formError} />
          <TextField label={t('auth.email')} type="email" autoComplete="email" required autoFocus {...form.bind('email')} />
          <Button type="submit" size="lg" className="w-full" loading={form.submitting}>{t('auth.sendReset')}</Button>
          <p className="text-caption text-ink-muted">{t('auth.childReset')}</p>
        </form>
      )}
    </AuthShell>
  );
}
