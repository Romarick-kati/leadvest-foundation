import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useForm } from '../../components/forms/useForm';
import { Alert, Button, ButtonLink, FormError, PageLoader, TextField } from '../../components/ui';
import { AuthShell } from './AuthShell';

/**
 * One time page for creating the first administrator on hosts without a command line.
 * The server only allows it with the SETUP_TOKEN set by whoever deployed the site, and only
 * while no administrator exists.
 */
export default function FirstAdminSetup() {
  useDocumentTitle('Set up the site');
  const status = useQuery({ queryKey: ['setup-status'], queryFn: () => api.get<{ available: boolean }>('/setup/status'), retry: false });
  const form = useForm({ token: '', displayName: '', email: '', password: '' });
  const [done, setDone] = useState(false);

  if (status.isLoading) return <PageLoader />;

  if (done) {
    return (
      <AuthShell title="Administrator created">
        <div className="space-y-5">
          <p className="flex gap-3 text-ink"><ShieldCheck className="shrink-0 text-mint-700" aria-hidden /> Sign in with the email and password you just chose. You will then be asked to set up two factor authentication with an authenticator app before the dashboard opens.</p>
          <p className="text-sm text-ink-muted">You can now remove SETUP_TOKEN from the hosting settings. This page will not work again while an administrator exists.</p>
          <ButtonLink to="/sign-in" size="lg" className="w-full">Go to sign in</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  if (!status.data?.available) {
    return (
      <AuthShell title="Setup is not available">
        <p className="text-ink">
          {status.error
            ? 'The website server could not be reached. Check the hosting setup guide.'
            : 'Either an administrator already exists, or no setup key has been configured on the server.'}
        </p>
        <p className="mt-6"><Link to="/sign-in">Go to sign in</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create the first administrator" subtitle="This page works once. Use the setup key you added to the hosting settings.">
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.submit(async (v) => {
            await api.post('/setup/first-admin', v);
            setDone(true);
          });
        }}
      >
        <FormError message={form.formError} />
        <TextField label="Setup key" type="password" autoComplete="off" required hint="The SETUP_TOKEN value from your hosting settings." {...form.bind('token')} />
        <TextField label="Your full name" autoComplete="name" required {...form.bind('displayName')} />
        <TextField label="Email" type="email" autoComplete="email" required {...form.bind('email')} />
        <TextField label="Choose a password" type="password" autoComplete="new-password" required hint="At least 10 characters, with a letter and a number." {...form.bind('password')} />
        <Alert tone="info">After signing in you will set up two factor authentication. Keep your phone ready.</Alert>
        <Button type="submit" size="lg" className="w-full" loading={form.submitting}>Create administrator</Button>
      </form>
    </AuthShell>
  );
}
