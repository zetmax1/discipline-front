import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { translate, formatDate, formatNumber, weekdayName } from './translate';
import { I18nProvider, useI18n } from './index';
import { jsonResponse } from '@/test/fixtures/analytics';
import { ApiError } from '@/lib/api';

describe('translate', () => {
  it('fills {params} and falls back to English for a missing key', () => {
    expect(translate('ru', 'common.retry')).toBe('Повторить');
    expect(translate('en', 'errors.validation_failed')).toMatch(/check/i);
  });

  it('picks the plural form the language needs', () => {
    expect(translate('en', 'planner.blocks', { count: 1 })).toBe('1 block');
    expect(translate('en', 'planner.blocks', { count: 5 })).toBe('5 blocks');
    expect(translate('ru', 'planner.blocks', { count: 1 })).toBe('1 блок');
    expect(translate('ru', 'planner.blocks', { count: 3 })).toBe('3 блока');
    expect(translate('ru', 'planner.blocks', { count: 5 })).toBe('5 блоков');
    expect(translate('uz', 'planner.blocks', { count: 5 })).toBe('5 ta blok');
  });
});

describe('Uzbek dates and numbers (browsers often lack Uzbek Intl data, so these are built in)', () => {
  const fri = new Date(2026, 9, 30, 23, 59);
  it('formats dates the Uzbek way', () => {
    expect(formatDate('uz', fri, { weekday: 'short', month: 'short', day: 'numeric' })).toBe('Jum, 30-okt');
    expect(formatDate('uz', fri, { month: 'long', day: 'numeric' })).toBe('30-oktabr');
    expect(formatDate('uz', fri, { weekday: 'long' })).toBe('juma');
    expect(formatDate('uz', fri, { year: 'numeric', month: 'short', day: 'numeric' })).toBe('30-okt, 2026');
    expect(weekdayName('uz', 'Monday')).toBe('dushanba');
    expect(weekdayName('uz', 'Sunday', 'short')).toBe('Yak');
  });

  it('uses a decimal comma and a space between thousands', () => {
    expect(formatNumber('uz', 1.5, { maximumFractionDigits: 1 })).toBe('1,5');
    expect(formatNumber('uz', 12345)).toBe('12\u00a0345');
    expect(formatNumber('uz', 0.5, { style: 'percent' })).toBe('50%');
  });
});

describe('formatDate', () => {
  it('formats in the language without shifting the local date at midnight', () => {
    const justBeforeMidnight = new Date(2026, 9, 29, 23, 59);
    const justAfterMidnight = new Date(2026, 9, 30, 0, 0);
    expect(formatDate('en', justBeforeMidnight, { weekday: 'short', month: 'short', day: 'numeric' })).toBe('Thu, Oct 29');
    expect(formatDate('en', justAfterMidnight, { weekday: 'short', month: 'short', day: 'numeric' })).toBe('Fri, Oct 30');
    expect(formatDate('ru', justBeforeMidnight, { month: 'long', day: 'numeric' })).toBe('29 октября');
  });

  it('keeps the calendar date across a DST change', () => {
    // 2026-03-29 is the EU spring-forward day; a local date must not move.
    expect(formatDate('en', new Date(2026, 2, 29, 0, 30), { month: 'short', day: 'numeric' })).toBe('Mar 29');
    expect(formatDate('en', new Date(2026, 2, 29, 23, 30), { month: 'short', day: 'numeric' })).toBe('Mar 29');
  });
});

function Probe() {
  const { t, locale, setLocale } = useI18n();
  return (
    <>
      <span data-testid="text">{t('common.retry')}</span>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale('ru')}>ru</button>
    </>
  );
}

function renderProbe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><I18nProvider><Probe /></I18nProvider></QueryClientProvider>);
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('<I18nProvider>', () => {
  it('stays English while F12A is off', async () => {
    localStorage.setItem('locale', 'ru');
    renderProbe();
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('defaults to Uzbek when F12A is on and remembers a switch', async () => {
    localStorage.setItem('auth_token', 'token');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ features: ['F12A'] }));
    renderProbe();
    expect(await screen.findByText('Qayta urinish')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('uz');
    await act(async () => screen.getByText('ru').click());
    expect(screen.getByTestId('text').textContent).toBe('Повторить');
    expect(localStorage.getItem('locale')).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('uses the last flags seen on this device before sign-in', () => {
    localStorage.setItem('features', JSON.stringify(['F12A']));
    renderProbe();
    expect(screen.getByTestId('locale').textContent).toBe('uz');
  });
});

describe('errorMessage', () => {
  function errorText(err: unknown, locale: 'en' | 'ru' = 'en') {
    let text = '';
    function Probe() {
      const i18n = useI18n();
      if (i18n.locale !== locale) i18n.setLocale(locale);
      text = i18n.errorMessage(err, 'planner.saveFailed');
      return null;
    }
    if (locale !== 'en') {
      localStorage.setItem('features', JSON.stringify(['F12A']));
      localStorage.setItem('locale', locale);
    }
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><I18nProvider><Probe /></I18nProvider></QueryClientProvider>);
    return text;
  }

  it('translates the API code', () => {
    expect(errorText(new ApiError(409, { error: 'block overlaps', code: 'task_overlap' }), 'ru'))
      .toBe('Этот блок пересекается с другим блоком в тот же день.');
  });

  it('falls back to the server text for an unknown code, then to the given key', () => {
    expect(errorText(new ApiError(400, { error: 'server says no' }))).toBe('server says no');
    expect(errorText(new ApiError(500, {}))).toBe('Could not save the change');
  });

  it('says the server is unreachable for network errors', () => {
    expect(errorText(new TypeError('Failed to fetch'))).toMatch(/could not reach the server/i);
  });
});
