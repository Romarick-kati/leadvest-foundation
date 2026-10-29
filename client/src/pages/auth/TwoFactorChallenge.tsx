import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, FormError, TextField, useToast } from '../../components/ui';
import { useT } from '../../i18n';
import { AuthShell, safeNext } from './AuthShell';

export default function TwoFactorChallenge() {
  const t = useT();
  useDocumentTitle(t('auth.twoFactorTitle'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setUser, mfaPending, loading, signOut } = useAuth();
  const toast = useToast();
  const [useRecovery, setUseRecovery] = useState(false);
  const form = useForm({ code: '', recoveryCode: '' });

  if (!loading && !mfaPending) {
    return (
      <AuthShell title={t('auth.expiredTitle')}>
        <Alert tone="info">{t('auth.expiredText')}</Alert>
        <Link to="/sign-in" className="mt-4 inline-block font-semibold">{t('auth.backToSignIn')}</Link>
      </AuthShell>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit(async (v) => {
      const res = await api.post<{ user: User; usedRecoveryCode?: boolean }>('/auth/2fa', useRecovery ? { recoveryCode: v.recoveryCode } : { code: v.code });
      setUser(res.user);
      if (res.usedRecoveryCode) toast(t('auth.usedRecovery'), 'info');
      navigate(safeNext(params.get('next'), homeFor(res.user)), { replace: true });
    });
  };

  return (
    <AuthShell
      title={t('auth.twoFactorTitle')}
      subtitle={useRecovery ? t('auth.recoverySubtitle') : t('auth.twoFactorSubtitle')}
      footer={<button type="button" className="font-semibold text-blue-600" onClick={async () => { await signOut(); navigate('/sign-in'); }}>{t('auth.cancelSignIn')}</button>}
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-mint-50 text-mint-700"><ShieldCheck size={28} aria-hidden /></div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={form.formError} />
        {useRecovery ? (
          <TextField key="rc" label={t('auth.recoveryCode')} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="abcde-12345" required autoFocus {...form.bind('recoveryCode')} />
        ) : (
          <TextField key="code" label={t('auth.authCode')} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} placeholder="123456" required autoFocus className="text-center text-2xl tracking-[0.4em]" {...form.bind('code')} />
        )}
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>{t('auth.verifyContinue')}</Button>
        <button type="button" className="w-full text-center text-sm font-semibold text-blue-600" onClick={() => setUseRecovery((r) => !r)}>
          {useRecovery ? t('auth.useApp') : t('auth.cannotUseApp')}
        </button>
      </form>
    </AuthShell>
  );
}
