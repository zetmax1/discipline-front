import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n';
import { ThemeProvider } from './ThemeProvider';
import { ThemeSwitcher } from './ThemeSwitcher';

function renderSwitcher() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeProvider><ThemeSwitcher /></ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

describe('theme', () => {
  it('stays light with no switcher while F12A is off, whatever was saved', async () => {
    localStorage.setItem('theme', 'dark');
    renderSwitcher();
    await act(async () => {});
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('follows the saved choice and switches with F12A on', async () => {
    localStorage.setItem('features', JSON.stringify(['F12A']));
    localStorage.setItem('locale', 'en');
    localStorage.setItem('theme', 'dark');
    renderSwitcher();
    await act(async () => {});
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'light' } });
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
