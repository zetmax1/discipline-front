import type { BlockStatus } from '@/contracts/blocks';

/** Old status names (demo data saved before F1) → the block lifecycle names. */
export function normalizeStatus(status: string): BlockStatus {
  if (status === 'pending') return 'planned';
  if (status === 'completed') return 'done';
  return status as BlockStatus;
}

/** A block still waiting to be done (can be started, checked in, moved). */
export function isOpen(status: BlockStatus): boolean {
  return status === 'planned' || status === 'in_progress';
}

/** Blocks to show: a moved block is replaced by the block it was moved to. */
export function visibleBlocks<T extends { status: BlockStatus }>(blocks: T[]): T[] {
  return blocks.filter(b => b.status !== 'moved');
}

/** "HH:MM" for minutes 0–1440. */
export function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Minutes since midnight of "HH:MM" (24:00 → 1440). */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
