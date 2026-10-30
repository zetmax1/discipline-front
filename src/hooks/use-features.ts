import { useQuery } from '@tanstack/react-query';
import { fetchFeatures, isAuthenticated } from '@/lib/api';
import type { FeaturesResponse } from '@/contracts/features';

const CACHE_KEY = 'features';

/** The flags last seen on this device: used before sign-in and while offline. */
function cachedFeatures(): FeaturesResponse | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const list: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) && list.every(f => typeof f === 'string') ? { features: list } : undefined;
  } catch {
    return undefined;
  }
}

async function fetchAndCacheFeatures(): Promise<FeaturesResponse> {
  const res = await fetchFeatures();
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(res.features));
  } catch {
    // Storage blocked: flags still work for this visit.
  }
  return res;
}

/**
 * Whether the server has switched on feature `flag` (FEATURE_<flag>=true).
 * Signed in: the server's list (the device's last-seen list until it arrives, and while offline).
 * Signed out or demo: the last-seen list. Never seen: off.
 */
export function useFeature(flag: string): boolean {
  const { data } = useQuery({
    queryKey: ['features'],
    queryFn: fetchAndCacheFeatures,
    enabled: isAuthenticated(),
    staleTime: 5 * 60_000,
    initialData: cachedFeatures,
    initialDataUpdatedAt: 0, // refetch right away: the cache may be old
  });
  return data?.features.includes(flag) ?? false;
}
