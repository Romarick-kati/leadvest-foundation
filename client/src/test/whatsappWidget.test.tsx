import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, afterEach } from 'vitest';
import type { SiteSettings } from '../lib/types';

let contact: SiteSettings['contact'];
vi.mock('../lib/site', async () => {
  const actual = await vi.importActual<typeof import('../lib/site')>('../lib/site');
  return { ...actual, useSite: () => ({ site: { ...actual.fallbackSite, contact }, loading: false, error: null }) };
});
import { fallbackSite } from '../lib/site';
import { WhatsAppChat } from '../components/layout/WhatsAppChat';

const setup = (over: Partial<SiteSettings['contact']> = {}, path = '/') => {
  contact = { ...fallbackSite.contact, whatsapp: '237650945402', ...over };
  return render(<MemoryRouter initialEntries={[path]}><WhatsAppChat /></MemoryRouter>);
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('WhatsAppChat', () => {
  it('opens a chat window with the greeting', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/how can we help you today/i)).toBeTruthy();
    expect(screen.queryByText(/not available right now/i)).toBeNull();
  });

  it('shows the automatic away message when set to away', () => {
    setup({ whatsappAwayNow: true });
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(screen.getByText(/not available right now/i)).toBeTruthy();
    expect(screen.getByText(/automatic message/i)).toBeTruthy();
  });

  it('uses the administrator\'s own away message', () => {
    setup({ whatsappAwayNow: true, whatsappAway: 'Neville is travelling. We will reply on Monday.' });
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(screen.getByText(/travelling/i)).toBeTruthy();
  });

  it('opens WhatsApp with the typed message', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    setup();
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I want to join' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(open).toHaveBeenCalledWith('https://wa.me/237650945402?text=I%20want%20to%20join', '_blank', 'noopener,noreferrer');
  });

  it('is not shown in the children\'s learning area', () => {
    const learning = setup({}, '/learning/course');
    expect(learning.container.querySelector('button')).toBeNull();
  });
});
