import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Vocabulary from './Vocabulary';
import { jsonResponse } from '@/test/fixtures/analytics';

const words = [
  { id: 1, word: 'compelling', language: 'english', definition: 'Strongly or irresistibly evoking interest or attention.', example: '', partOfSpeech: 'adjective', learned: false, saved: false, date: '2026-10-29' },
  { id: 2, word: 'стремление', language: 'russian', definition: 'сильное желание достичь чего-либо', example: '', partOfSpeech: 'noun', learned: false, saved: false, date: '2026-10-29' },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth_token', 'token');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).includes('/vocabulary/today')) return jsonResponse({ words, count: 2 });
    return jsonResponse({ words: [], count: 0, total: 0, page: 1, pageSize: 30, totalPages: 0 });
  });
});
afterEach(() => vi.restoreAllMocks());

describe("Today's words", () => {
  it('show language and part of speech but no made-up CEFR level', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Vocabulary /></QueryClientProvider>);
    expect(await screen.findByText('compelling')).toBeInTheDocument();
    expect(screen.getByText('adjective')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Russian')).toBeInTheDocument();
    expect(screen.queryByText(/C1|A2\+|B2|CEFR/)).toBeNull();
  });
});
