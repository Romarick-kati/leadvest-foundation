import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Users } from '../../components/ui/icons';
import { api, ApiError } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Button, Checkbox, FormError } from '../../components/ui';
import { cn } from '../../lib/cn';
import { AuthShell } from './AuthShell';
import { useT } from '../../i18n';

type Choice = 'YOUTH' | 'PARENT';

/**
 * The one question, asked after signing up or the first Google sign in: how will you use the
 * platform. One tap on a card. Learners only tick that they are 16 or older.
 */
export default function Welcome() {
  const t = useT();
  useDocumentTitle(t('welcome.title'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const delivered = (location.state as { delivered?: boolean } | null)?.delivered;
  const [choice, setChoice] = useState<Choice | null>(user?.role === 'YOUTH' || user?.role === 'PARENT' ? user.role : null);
  const [confirmAge, setConfirmAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cards: { key: Choice; title: string; text: string; icon: React.ReactNode }[] = [
    { key: 'YOUTH', title: t('welcome.learnTitle'), text: t('welcome.learnText'), icon: <BookOpen size={26} aria-hidden /> },
    { key: 'PARENT', title: t('welcome.parentTitle'), text: t('welcome.parentText'), icon: <Users size={26} aria-hidden /> },
  ];

  const submit = async () => {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/account/choose-role', { role: choice, confirmAge: choice === 'YOUTH' ? confirmAge : undefined });
      setUser(res.user);
      navigate(homeFor(res.user), { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('welcome.title')} subtitle={t('welcome.subtitle')}>
      {delivered === true && <Alert tone="info" className="mb-5">{t('welcome.verifyNote')}</Alert>}
      {delivered === false && <Alert tone="warning" className="mb-5">{t('welcome.noEmail')}</Alert>}
      <FormError message={error} />
      <div role="radiogroup" aria-label={t('welcome.title')} className="grid gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={choice === c.key}
            onClick={() => setChoice(c.key)}
            className={cn(
              'flex items-start gap-4 rounded-xl border-2 p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
              choice === c.key ? 'border-teal bg-mint-50 shadow-soft' : 'border-line-strong bg-surface hover:border-teal',
            )}
          >
            <span className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal text-white">{c.icon}</span>
            <span>
              <span className="block text-lg font-bold text-heading">{c.title}</span>
              <span className="mt-1 block text-sm text-ink-muted">{c.text}</span>
            </span>
          </button>
        ))}
      </div>
      {choice === 'YOUTH' && (
        <div className="mt-5">
          <Checkbox label={t('welcome.confirmAge')} checked={confirmAge} onChange={(e) => setConfirmAge(e.target.checked)} />
        </div>
      )}
      <Button type="button" size="lg" className="mt-6 w-full" loading={busy} disabled={!choice || (choice === 'YOUTH' && !confirmAge)} onClick={submit}>
        {t('welcome.cont')}
      </Button>
    </AuthShell>
  );
}
