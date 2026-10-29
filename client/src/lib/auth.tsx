import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Role, User } from './types';

interface MeResponse {
  user: User | null;
  mfaPending: boolean;
}

interface AuthContextValue {
  user: User | null;
  mfaPending: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<MeResponse>('/auth/me'), staleTime: 60_000, retry: 1 });
  const user = me.data?.user ?? null;

  const value: AuthContextValue = {
    user,
    mfaPending: me.data?.mfaPending ?? false,
    loading: me.isLoading,
    refresh: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
    setUser: (u) => qc.setQueryData<MeResponse>(['me'], { user: u, mfaPending: false }),
    signOut: async () => {
      await api.post('/auth/logout').catch(() => undefined);
      // Show the signed-out state first, then drop everything else that belonged to the account.
      qc.setQueryData<MeResponse>(['me'], { user: null, mfaPending: false });
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
    hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Where each role lands after signing in. */
export function homeFor(user: User) {
  // Someone who still has to pay goes straight to the payment page.
  if (user.access?.required && !user.access.active) return '/subscribe';
  switch (user.role) {
    case 'ADMIN':
      return '/admin';
    case 'INSTRUCTOR':
      return '/instructor';
    case 'MEMBER':
      return '/welcome';
    case 'LEARNER':
    case 'YOUTH':
      return '/learning';
    default:
      return '/account';
  }
}
