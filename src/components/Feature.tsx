import type { ReactNode } from 'react';
import { useFeature } from '@/hooks/use-features';

/** Renders its children only when the server has switched on `flag` (e.g. "F12A"). */
export function Feature({ flag, children }: { flag: string; children: ReactNode }) {
  return useFeature(flag) ? <>{children}</> : null;
}
