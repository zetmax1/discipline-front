import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import Login from '@/pages/Login';

function renderLogin() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <I18nProvider>
        <MemoryRouter><Login /></MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('language switcher', () => {
  it('is hidden and the page is English while F12A is off', () => {
    renderLogin();
    expect(screen.queryByRole('combobox', { name: /language|til|язык/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('starts in Uzbek with F12A on and switches the whole page', () => {
    localStorage.setItem('features', JSON.stringify(['F12A']));
    renderLogin();
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'Til' });
    fireEvent.change(select, { target: { value: 'ru' } });
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Язык' }), { target: { value: 'en' } });
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem('locale')).toBe('en');
  });
});
