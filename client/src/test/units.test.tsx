import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { SimpleMarkdown } from '../components/content/SimpleMarkdown';
import { RequireAuth } from '../components/layout/Guards';
import { AuthProvider } from '../lib/auth';
import { safeNext } from '../pages/auth/AuthShell';
import { formatMoney } from '../lib/format';

describe('safeNext', () => {
  it('allows same site paths', () => {
    expect(safeNext('/account/settings', '/x')).toBe('/account/settings');
  });
  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', null])('refuses %s', (v) => {
    expect(safeNext(v as string | null, '/fallback')).toBe('/fallback');
  });
});

describe('SimpleMarkdown', () => {
  it('renders headings, lists and placeholders without injecting HTML', () => {
    const { container } = render(<SimpleMarkdown source={'## Title\n\n- one\n- two\n\nText [[Placeholder text]] <img src=x onerror=alert(1)>'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelector('mark')?.textContent).toBe('Placeholder text');
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('returns null when no price is set', () => {
    expect(formatMoney(null, 'XAF')).toBeNull();
    expect(formatMoney(1000, null)).toBeNull();
  });
  it('formats a whole currency amount', () => {
    expect(formatMoney(500000, 'XAF')).toMatch(/5[,.\s\u202f]?000/);
  });
});

function renderGuard(me: unknown, roles?: ('ADMIN' | 'PARENT')[]) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: me }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<RequireAuth roles={roles}><p>secret area</p></RequireAuth>} />
            <Route path="/sign-in" element={<p>sign in page</p>} />
            <Route path="/sign-in/verify" element={<p>verify page</p>} />
            <Route path="/forbidden" element={<p>forbidden page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('RequireAuth', () => {
  afterEach(() => vi.unstubAllGlobals());
  const user = (role: string) => ({ user: { id: 'u1', role, displayName: 'Test' }, mfaPending: false });

  it('sends guests to sign in', async () => {
    renderGuard({ user: null, mfaPending: false });
    expect(await screen.findByText('sign in page')).toBeInTheDocument();
  });
  it('sends half signed in users to the code step', async () => {
    renderGuard({ user: null, mfaPending: true });
    expect(await screen.findByText('verify page')).toBeInTheDocument();
  });
  it('blocks the wrong role', async () => {
    renderGuard(user('PARENT'), ['ADMIN']);
    expect(await screen.findByText('forbidden page')).toBeInTheDocument();
  });
  it('lets the right role in', async () => {
    renderGuard(user('ADMIN'), ['ADMIN']);
    expect(await screen.findByText('secret area')).toBeInTheDocument();
  });
});
