/**
 * Product event names (VISION: "Event names are defined once in discipline/contracts/ and nowhere
 * else"). The API writes them to the internal `product_events` table only; they are never sent
 * to any other service. The API's Go tests check it only writes names listed here.
 */
import { z } from 'zod/v4';

export const PRODUCT_EVENTS = [
  // F1: the daily loop
  'block_created', 'block_status_changed', 'block_moved', 'block_checked_in',
  'checkin_morning_done', 'session_started', 'session_completed', 'session_abandoned',
  'distraction_logged', 'shutdown_done',
  // F13: a week (or any range) was materialized and at least one occurrence was created
  'week_planned',
] as const;

export const ProductEventName = z.enum(PRODUCT_EVENTS);

export function exportContract() {
  return { event_name: z.toJSONSchema(ProductEventName) };
}
