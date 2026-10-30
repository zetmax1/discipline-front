import { useQuery } from '@tanstack/react-query';
import { fetchFeatures, isAuthenticated } from '@/lib/api';

/**
 * Whether the server has switched on feature `flag` (FEATURE_<flag>=true).
 * Off while loading, on error, offline and in demo mode: a feature shows only when the server lists it.
 */
export function useFeature(flag: string): boolean {
  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: fetchFeatures,
    enabled: isAuthenticated(),
    staleTime: 5 * 60_000,
  });
  return data?.features.includes(flag) ?? false;
}
