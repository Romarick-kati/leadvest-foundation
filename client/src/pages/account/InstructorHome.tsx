import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert, Button, EmptyState, Panel, StatusBadge, TableSkeleton } from '../../components/ui';

interface AssignedProgram {
  id: string;
  slug: string;
  title: string;
  status: string;
  schedule: string | null;
  _count: { registrations: number };
}

interface Roster {
  program: { id: string; title: string };
  participants: { registrationId: string; status: string; learner: { id: string; displayName: string } | null }[];
}

export default function InstructorHome() {
  useDocumentTitle('My programs');
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const programs = useQuery({ queryKey: ['instructor', 'programs'], queryFn: () => api.get<AssignedProgram[]>('/instructor/programs') });
  const roster = useQuery({ queryKey: ['instructor', 'roster', selected], queryFn: () => api.get<Roster>(`/instructor/programs/${selected}/roster`), enabled: Boolean(selected) });

  return (
    <div className="container-page py-10 sm:py-14">
      <p className="eyebrow mb-2">Instructor area</p>
      <h1 className="text-h1">My programs</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">You can see the programs you are assigned to and the first names of children taking part. Contact details are held by the foundation.</p>
      {!user?.twoFactorEnabled && <Alert tone="info" className="mt-6">Please turn on two factor authentication in Security settings to protect children’s information.</Alert>}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Assigned programs">
          {programs.isLoading ? <TableSkeleton rows={3} /> : programs.data && programs.data.length > 0 ? (
            <ul className="space-y-2">
              {programs.data.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setSelected(p.id)} aria-pressed={selected === p.id} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${selected === p.id ? 'border-blue-600 bg-blue-50' : 'border-line hover:bg-navy-50'}`}>
                    <span>
                      <span className="block font-semibold text-heading">{p.title}</span>
                      <span className="text-sm text-ink-muted">{p.schedule ?? 'Schedule to be confirmed'}</span>
                    </span>
                    <StatusBadge status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No programs assigned yet">An administrator will assign you to programs.</EmptyState>}
        </Panel>
        <Panel title={roster.data ? `Participants: ${roster.data.program.title}` : 'Participants'}>
          {!selected ? <p className="text-ink-muted">Choose a program to see who is taking part.</p> : roster.isLoading ? <TableSkeleton rows={4} /> : roster.data && roster.data.participants.length > 0 ? (
            <ul className="divide-y divide-line">
              {roster.data.participants.map((p) => (
                <li key={p.registrationId} className="flex items-center justify-between py-3">
                  <span className="font-medium text-heading">{p.learner?.displayName ?? 'Family registration'}</span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No participants yet" />}
          {selected && <Button variant="ghost" size="sm" className="mt-4" onClick={() => roster.refetch()}>Refresh</Button>}
        </Panel>
      </div>
    </div>
  );
}
