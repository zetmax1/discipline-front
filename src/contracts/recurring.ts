/**
 * Contract for recurring blocks (F13): GET/POST /recurring-rules, PUT/DELETE /recurring-rules/:id,
 * and the range read GET /tasks?startDate=&endDate=, which materializes occurrences on the server.
 * An exception is a date a rule deliberately has no block on; it is never a miss.
 * `contracts/recurring.schema.json` is generated: run `npm run contract:update`.
 */
import { z } from 'zod/v4';
import { Block } from './blocks';

const minute = z.number().int().min(0).max(1440);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** ISO weekdays: Monday = 1 … Sunday = 7. */
export const IsoWeekday = z.number().int().min(1).max(7);

export const RecurringRule = z.looseObject({
  id: z.number(),
  categoryId: z.number(),
  name: z.string(),
  weekdays: z.array(IsoWeekday).min(1).max(7),
  startMin: minute,
  endMin: minute,
  validFrom: date,
  validTo: date.nullable(),
  splitFromRuleId: z.number().nullable(),
});
export type RecurringRule = z.infer<typeof RecurringRule>;

export const EXCEPTION_REASONS = ['cancelled', 'conflict', 'moved'] as const;
export const RecurringException = z.looseObject({
  ruleId: z.number(),
  date,
  reason: z.enum(EXCEPTION_REASONS),
});
export type RecurringException = z.infer<typeof RecurringException>;

export const RuleList = z.looseObject({ rules: z.array(RecurringRule) });
export const RuleResponse = z.looseObject({ rule: RecurringRule });

/** GET /tasks?startDate=&endDate=: `truncated` when the range reaches past what is planned ahead. */
export const BlockRange = z.looseObject({
  tasks: z.array(Block),
  exceptions: z.array(RecurringException),
  truncated: z.boolean(),
});
export type BlockRange = z.infer<typeof BlockRange>;

export function exportContract() {
  return {
    rule: z.toJSONSchema(RecurringRule),
    rule_list: z.toJSONSchema(RuleList),
    rule_response: z.toJSONSchema(RuleResponse),
    exception: z.toJSONSchema(RecurringException),
    block_range: z.toJSONSchema(BlockRange),
  };
}
