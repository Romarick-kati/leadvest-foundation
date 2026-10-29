import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical } from '../../components/ui/icons';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Button, PageLoader, StatusBadge } from '../../components/ui';

interface PaymentStatus {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  isSimulation: boolean;
}

/**
 * Development only checkout. Clearly labelled as a simulation. Choosing an outcome makes the
 * server send itself a signed provider webhook; the browser itself never marks anything paid.
 */
export default function SimulatedPayment() {
  useDocumentTitle('Simulated payment');
  const { paymentId } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['payment', paymentId], queryFn: () => api.get<PaymentStatus>(`/payments/${paymentId}`) });
  const simulate = useMutation({
    mutationFn: (outcome: 'PAID' | 'FAILED' | 'CANCELLED') => api.post(`/payments/${paymentId}/simulate`, { outcome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment', paymentId] });
      qc.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <div className="container-page py-16"><Alert tone="error">Payment not found.</Alert></div>;
  const p = q.data;
  return (
    <div className="container-page max-w-xl py-14">
      <div className="rounded-xl border-4 border-dashed border-sun bg-sun-100 p-6 sm:p-8">
        <p className="flex items-center gap-2 text-label uppercase tracking-wide text-heading"><FlaskConical size={18} aria-hidden /> Simulation only</p>
        <h1 className="mt-2 text-h2">Test payment</h1>
        <p className="mt-3 text-ink">This is a development simulation. <strong>No money is taken and no real payment provider is involved.</strong> Live payments are switched off until the foundation approves a provider and its configuration.</p>
        <dl className="mt-6 space-y-2 rounded-lg bg-surface p-4">
          <div className="flex justify-between"><dt className="text-ink-muted">Amount</dt><dd className="font-semibold text-heading">{formatMoney(p.amountCents, p.currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">Status</dt><dd><StatusBadge status={p.status} /></dd></div>
        </dl>
        {p.status === 'PENDING' ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => simulate.mutate('PAID')} loading={simulate.isPending}>Simulate successful payment</Button>
            <Button variant="secondary" onClick={() => simulate.mutate('FAILED')}>Simulate failure</Button>
            <Button variant="ghost" onClick={() => simulate.mutate('CANCELLED')}>Simulate cancel</Button>
          </div>
        ) : (
          <Link to="/account" className="mt-6 inline-block font-semibold">Back to my account</Link>
        )}
        {simulate.error && <Alert tone="error" className="mt-4">{(simulate.error as Error).message}</Alert>}
      </div>
    </div>
  );
}
