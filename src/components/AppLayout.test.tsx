import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { AppLayout } from './AppLayout';

function renderLayout() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner']}><AppLayout><p>page</p></AppLayout></MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

beforeEach(() => localStorage.clear());
afterEach(() => setOnline(true));

describe('<AppLayout>', () => {
  it('has no bottom navigation or offline banner while F12A is off', () => {
    renderLayout();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    act(() => setOnline(false));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a bottom navigation (phones only) with the current page marked, with F12A on', () => {
    localStorage.setItem('features', JSON.stringify(['F12A']));
    localStorage.setItem('locale', 'en');
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav.className).toMatch(/md:hidden/);
    const links = within(nav).getAllByRole('link');
    expect(links.map(l => l.textContent)).toEqual(['Home', 'Planner', 'Stats', 'Schedule', 'Words']);
    expect(within(nav).getByRole('link', { name: 'Planner' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows an offline banner while the network is down, with F12A on', () => {
    localStorage.setItem('features', JSON.stringify(['F12A']));
    localStorage.setItem('locale', 'uz');
    renderLayout();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    act(() => setOnline(false));
    expect(screen.getByRole('status')).toHaveTextContent('Internet yoʻq');
    act(() => setOnline(true));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
