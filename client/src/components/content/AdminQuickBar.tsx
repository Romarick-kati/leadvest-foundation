import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button, useToast } from '../ui';

/** Shown only to administrators on a public program or event page: edit or delete it right here. */
export function AdminQuickBar({ kind, id }: { kind: 'program' | 'event'; id: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/${kind}s/${id}`),
    onSuccess: () => { qc.invalidateQueries(); toast(`${kind === 'program' ? 'Program' : 'Event'} deleted.`); navigate(`/${kind}s`, { replace: true }); },
    onError: (e: Error) => toast(e.message, 'error'),
  });
  if (user?.role !== 'ADMIN') return null;
  return (
    <div className="fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-2 rounded-full border border-line bg-surface p-2 pl-4 shadow-lift">
      <span className="text-sm font-semibold text-heading">Admin</span>
      <div className="flex gap-2">
        <Link to={`/admin/${kind}s/${id}`} className="inline-flex min-h-10 items-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white no-underline hover:bg-blue-700">Edit</Link>
        <Button size="sm" variant="secondary" className="text-danger" loading={remove.isPending} onClick={() => window.confirm(`Delete this ${kind} for good? Registrations are deleted with it. To hide it instead, set it to Draft in the editor.`) && remove.mutate()}>Delete</Button>
      </div>
    </div>
  );
}
