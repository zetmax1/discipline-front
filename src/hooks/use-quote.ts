import { useQuery } from '@tanstack/react-query';
import { apiGet, isAuthenticated } from '@/lib/api';
import { useI18n, type TKey } from '@/i18n';

interface QuoteResponse {
  quote: string;
  author: string;
}

// Static fallback messages when not logged in (text in src/i18n)
const FALLBACK_MESSAGES: TKey[] = [
  'quotes.fallback.0', 'quotes.fallback.1', 'quotes.fallback.2', 'quotes.fallback.3', 'quotes.fallback.4',
];

export function useQuote() {
  const loggedIn = isAuthenticated();
  const { t } = useI18n();

  const { data, isLoading } = useQuery<QuoteResponse>({
    queryKey: ['quote'],
    queryFn: () => apiGet<QuoteResponse>('/quote'),
    enabled: loggedIn,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // refetch every 2 hours
  });

  const fallback = t(FALLBACK_MESSAGES[Math.floor(Date.now() / (3 * 60 * 60 * 1000)) % FALLBACK_MESSAGES.length]);

  return {
    quote: data?.quote || fallback,
    author: data?.author || '',
    isLoading: loggedIn ? isLoading : false,
  };
}
