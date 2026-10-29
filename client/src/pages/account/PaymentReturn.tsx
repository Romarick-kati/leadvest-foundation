import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { homeFor, useAuth } from '../../lib/auth';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Button, Spinner } from '../../components/ui';
import { Celebration } from '../../components/motion/Celebration';
import { AuthShell } from '../auth/AuthShell';
import { useT } from '../../i18n';

interface Status { id: string; status: string; purpose: string }

/**
 * Where Fapshi sends people back to. Coming back proves nothing, so this page only asks our
 * server, which asks Fapshi, until the payment is confirmed or has clearly failed.
 */
export default function PaymentReturn() {
  const t = useT();
  useDocumentTitle(t('pay.confirming'));
  const [params] = useSearchParams();
  const id = params.get('payment');
  // Flutterwave adds these when it sends the payer back. They are only hints: our server asks Flutterwave.
  const returnStatus = params.get('status');
  const transactionId = params.get('transaction_id');
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 45_000);
    return () => window.clearTimeout(timer);
  }, []);
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const q = useQuery({
    queryKey: ['payment-return', id],
    enabled: Boolean(id),
    queryFn: () => api.get<Status>(`/payments/${id}${returnStatus || transactionId ? `?${new URLSearchParams({ ...(returnStatus ? { status: returnStatus } : {}), ...(transactionId ? { transaction_id: transactionId } : {}) }).toString()}` : ''}`),
    // Check again every few seconds while the payment is still on its way.
    refetchInterval: (query) => (query.state.data && query.state.data.status !== 'PENDING' ? false : 4000),
    refetchIntervalInBackground: true,
  });
  const status = q.data?.status;

  useEffect(() => {
    if (status === 'PAID') void refresh();
  }, [status, refresh]);

  if (!id || q.isError) {
    return (
      <AuthShell title={t('pay.failedTitle')}>
        <p className="text-ink-muted">{t('pay.failedText')}</p>
        <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/subscribe')}>{t('pay.tryAgain')}</Button>
      </AuthShell>
    );
  }
  if (status === 'PAID') {
    return (
      <AuthShell title={t('pay.successTitle')}>
        <div className="relative mb-4 flex justify-center"><Celebration /></div>
        <p className="text-ink-muted">{t('pay.successText')}</p>
        <Button className="mt-6 w-full" size="lg" onClick={() => user && navigate(homeFor({ ...user, access: user.access ? { ...user.access, active: true } : undefined }), { replace: true })}>{t('pay.continue')}</Button>
      </AuthShell>
    );
  }
  if (status === 'FAILED' || status === 'CANCELLED') {
    return (
      <AuthShell title={t('pay.failedTitle')}>
        <p className="text-ink-muted">{t('pay.failedText')}</p>
        <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/subscribe')}>{t('pay.tryAgain')}</Button>
        <p className="mt-4 text-center text-sm"><Link to="/contact">{t('pay.help')}</Link></p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t('pay.confirming')}>
      <div className="flex items-center gap-3 text-ink-muted"><Spinner size={20} /> {t('pay.confirmingText')}</div>
      {waited && (
        <div className="mt-6 space-y-3 text-sm text-ink-muted">
          <p>This is taking longer than usual. If you finished paying, your payment will appear here as soon as the payment service confirms it. You do not need to pay again. If you did not pay, you can start again.</p>
          <Button className="w-full" variant="secondary" onClick={() => navigate('/subscribe')}>{t('pay.tryAgain')}</Button>
          <p className="text-center"><Link to="/contact">{t('pay.help')}</Link></p>
        </div>
      )}
    </AuthShell>
  );
}
