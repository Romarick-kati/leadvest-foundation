import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from '../ui/icons';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatDateTime } from '../../lib/format';

interface Item { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string }

/** The notification bar: new programs, events and announcements for the signed in person. */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: Item[]; unread: number }>('/account/notifications'),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: (id: string) => api.post(`/account/notifications/${id}/read`), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api.post('/account/notifications/read-all'), onSuccess: refresh });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const unread = q.data?.unread ?? 0;
  const items = q.data?.items ?? [];
  const go = (n: Item) => {
    if (!n.readAt) readOne.mutate(n.id);
    setOpen(false);
    if (n.link) n.link.startsWith('/') ? navigate(n.link) : window.open(n.link, '_blank', 'noopener');
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-heading transition-colors hover:bg-canvas hover:text-blue-700">
        <Bell size={22} />
        {unread > 0 && <span aria-hidden className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.7rem] font-bold leading-none text-white dark:text-navy">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div role="region" aria-label="Notifications" className="fixed inset-x-3 top-[4.5rem] z-[80] max-h-[70vh] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-bold text-heading">Notifications</p>
            {unread > 0 && <button type="button" onClick={() => readAll.mutate()} className="text-sm font-semibold text-blue-700">Mark all as read</button>}
          </div>
          <ul className="max-h-[calc(70vh-3.5rem)] divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">You are all caught up. New programs, events and news will appear here.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => go(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas', !n.readAt && 'bg-blue-50')}>
                  <span aria-hidden className={cn('mt-2 h-2.5 w-2.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-blue-600')} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-heading">{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-ink">{n.body}</span>}
                    <span className="mt-1 block text-caption text-ink-muted">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-right"><Link to="/settings/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold">Notification settings</Link></div>
        </div>
      )}
    </div>
  );
}
