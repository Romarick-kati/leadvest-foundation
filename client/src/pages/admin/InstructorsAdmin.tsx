import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, DataTable, EmptyState, StatusBadge, TableSkeleton } from '../../components/ui';
import { AdminPage, TableCard } from './shared';

interface Row { id: string; displayName: string; email: string; status: string; twoFactorEnabled: boolean; programs: { id: string; title: string }[] }

export default function InstructorsAdmin() {
  const navigate = useNavigate();
  const list = useQuery({ queryKey: ['admin', 'instructors'], queryFn: () => api.get<Row[]>('/admin/instructors') });
  return (
    <AdminPage title="Instructors and mentors" description="Instructors only see participants in programs assigned to them. Assign programs from each program’s page. Invite new instructors from Users.">
      <TableCard>
        {list.isLoading ? <TableSkeleton /> : list.data && list.data.length > 0 ? (
          <DataTable
            caption="Instructors"
            rows={list.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
            columns={[
              { key: 'n', header: 'Name', cell: (r) => <span className="font-semibold text-heading">{r.displayName}<span className="block text-caption font-normal text-ink-muted">{r.email}</span></span> },
              { key: 'p', header: 'Programs', cell: (r) => (r.programs.length ? r.programs.map((p) => <Link key={p.id} to={`/admin/programs/${p.id}`} onClick={(e) => e.stopPropagation()} className="mr-2">{p.title}</Link>) : <span className="text-ink-muted">None</span>) },
              { key: 'm', header: 'Two factor', cell: (r) => (r.twoFactorEnabled ? <Badge tone="mint">On</Badge> : <Badge tone="sun">Off</Badge>) },
              { key: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        ) : <div className="p-6"><EmptyState title="No instructors yet">Invite instructors from the Users page.</EmptyState></div>}
      </TableCard>
    </AdminPage>
  );
}
