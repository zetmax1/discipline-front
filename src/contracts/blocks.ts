/**
 * Contract for blocks (DB table `tasks`): GET /tasks, POST /tasks/:id/check-in, POST /tasks/:id/move.
 * `contracts/blocks.schema.json` is the exported JSON Schema; the API's Go tests validate their
 * responses against it. After changing a schema, run `npm run contract:update`.
 */
import { z } from 'zod/v4';

export const BLOCK_STATUSES = ['planned', 'in_progress', 'done', 'partial', 'skipped', 'moved'] as const;
export const BlockStatus = z.enum(BLOCK_STATUSES);
export type BlockStatus = z.infer<typeof BlockStatus>;

const minute = z.number().int().min(0).max(1440);

export const Block = z.looseObject({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  date: z.string(), // YYYY-MM-DD, the user's local date
  startMin: minute,
  endMin: minute,
  startTime: z.string(), // "HH:MM", kept for one release
  endTime: z.string(),
  status: BlockStatus,
  distractions: z.number(),
  energy: z.number(),
  actualStartMin: minute.nullable(),
  actualEndMin: minute.nullable(),
  focusRating: z.number().int().min(1).max(5).nullable(),
  note: z.string().nullable(),
  movedFromId: z.number().nullable(),
});
export type Block = z.infer<typeof Block>;

export const BlockResponse = z.looseObject({ task: Block });
export const BlockList = z.looseObject({ tasks: z.array(Block), count: z.number() });

export function exportContract() {
  return {
    block: z.toJSONSchema(Block),
    block_response: z.toJSONSchema(BlockResponse),
    block_list: z.toJSONSchema(BlockList),
  };
}
