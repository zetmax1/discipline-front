import { useQuery } from '@tanstack/react-query';
import { apiGet, isAuthenticated } from '@/lib/api';

interface QuoteResponse {
  quote: string;
  author: string;
}

// Static fallback messages when not logged in
const FALLBACK_MESSAGES = [
  'Start with the most important task.',
  'Small consistent actions create big results.',
  'Deep work requires protection.',
  'Focus on one thing at a time.',
  'Discipline creates freedom.',
];

export function useQuote() {
  const loggedIn = isAuthenticated();

  const { data, isLoading } = useQuery<QuoteResponse>({
    queryKey: ['quote'],
    queryFn: () => apiGet<QuoteResponse>('/quote'),
    enabled: loggedIn,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // refetch every 2 hours
  });

  const fallback = FALLBACK_MESSAGES[Math.floor(Date.now() / (3 * 60 * 60 * 1000)) % FALLBACK_MESSAGES.length];

  return {
    quote: data?.quote || fallback,
    author: data?.author || '',
    isLoading: loggedIn ? isLoading : false,
  };
}
