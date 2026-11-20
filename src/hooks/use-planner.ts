import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, fetchRange, fetchRules } from '@/lib/planner-api';
import { addDays, loadWeekCache, saveWeekCache } from '@/lib/planner';
import { Category } from '@/contracts/categories';
import { RecurringRule } from '@/contracts/recurring';
import { z } from 'zod/v4';
import { useOnline } from './use-online';

function readCache<S extends z.ZodType>(key: string, schema: S): z.infer<S> | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: only this visit has the data.
  }
}

/**
 * The week (Mon–Sun) starting at `monday`. Online, reading it makes the server plan recurring blocks
 * (never more than 8 weeks ahead); offline, react-query pauses the request (nothing is planned on
 * the device) and the last fetched copy of the week is shown.
 */
export function useWeek(monday: string) {
  // react-query assumes "online" at start-up; a cold start without network must not ask to plan.
  const online = useOnline();
  return useQuery({
    enabled: online,
    queryKey: ['planner-range', monday],
    queryFn: async () => {
      const range = await fetchRange(monday, addDays(monday, 6));
      saveWeekCache(monday, range);
      return range;
    },
    initialData: () => loadWeekCache(monday),
    initialDataUpdatedAt: 0, // the cache may be old: refetch as soon as we are online
    staleTime: 30_000,
  });
}

export function useCategories() {
  const online = useOnline();
  return useQuery({
    enabled: online,
    queryKey: ['categories'],
    queryFn: async () => {
      const list = await fetchCategories();
      writeCache('planner-categories', list);
      return list;
    },
    initialData: () => readCache('planner-categories', z.array(Category)),
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
  });
}

export function useRules() {
  const online = useOnline();
  return useQuery({
    enabled: online,
    queryKey: ['rules'],
    queryFn: async () => {
      const list = await fetchRules();
      writeCache('planner-rules', list);
      return list;
    },
    initialData: () => readCache('planner-rules', z.array(RecurringRule)),
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
  });
}

/** After a planner write: the weeks, rules and categories, plus the screens that read blocks. */
export function useInvalidatePlanner() {
  const qc = useQueryClient();
  return (what: { categories?: boolean; rules?: boolean } = {}) => {
    qc.invalidateQueries({ queryKey: ['planner-range'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    if (what.rules) qc.invalidateQueries({ queryKey: ['rules'] });
    if (what.categories) qc.invalidateQueries({ queryKey: ['categories'] });
  };
}
