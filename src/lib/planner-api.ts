/**
 * Planner v2 API (F13): categories, recurring rules and the week range. Reads parse with the zod
 * contracts. The server materializes recurring blocks when a range is read; the client never
 * does. Writes that should survive going offline (block edits, new blocks and rules) go through
 * the sync queue like F1's.
 */
import type { z } from 'zod/v4';
import { apiGet, apiSend, ContractError } from './api';
import { sendOrQueue } from './sync-queue';
import { sendRequest } from './daily-api';
import { BlockResponse } from '@/contracts/blocks';
import { CategoryList, CategoryResponse, type CategoryIcon, type CategoryKind } from '@/contracts/categories';
import { BlockRange, RuleList, RuleResponse } from '@/contracts/recurring';

function parse<S extends z.ZodType>(schema: S, what: string) {
  return (value: unknown): z.infer<S> => {
    const result = schema.safeParse(value);
    if (result.error) throw new ContractError(what, result.error.message);
    return result.data;
  };
}

const q = encodeURIComponent;

export const fetchCategories = () =>
  apiGet<unknown>('/categories').then(parse(CategoryList, 'categories')).then(r => r.categories);

export interface CategoryBody { name?: string; color?: string; icon?: CategoryIcon; kind?: CategoryKind }

export const createCategory = (body: CategoryBody) =>
  apiSend<unknown>('POST', '/categories', body).then(parse(CategoryResponse, 'category')).then(r => r.category);

export const updateCategory = (id: number, body: CategoryBody) =>
  apiSend<unknown>('PUT', `/categories/${id}`, body).then(parse(CategoryResponse, 'category')).then(r => r.category);

/** Without reassignTo, a category in use answers 409 category_in_use. */
export const deleteCategory = (id: number, reassignTo?: number) =>
  apiSend<void>('DELETE', `/categories/${id}${reassignTo ? `?reassignTo=${reassignTo}` : ''}`);

/** GET /tasks?startDate=&endDate= (at most 42 days): the server plans recurring blocks first. */
export const fetchRange = (startDate: string, endDate: string) =>
  apiGet<unknown>(`/tasks?startDate=${q(startDate)}&endDate=${q(endDate)}`).then(parse(BlockRange, 'week'));

export const fetchRules = () => apiGet<unknown>('/recurring-rules').then(parse(RuleList, 'rules')).then(r => r.rules);

export interface RuleBody {
  categoryId?: number; name?: string; weekdays?: number[]; startMin?: number; endMin?: number;
  validFrom?: string; validTo?: string | null;
}

/** Queued when offline; its occurrences appear once the server has answered and the week is read again. */
export const createRule = (body: RuleBody) =>
  sendOrQueue({ key: `rule:new:${crypto.randomUUID()}`, method: 'POST', path: '/recurring-rules', body },
    r => sendRequest(r).then(parse(RuleResponse, 'rule')));

export type Scope = { scope: 'all' } | { scope: 'following'; fromDate: string };
const scopeQuery = (s: Scope) => (s.scope === 'all' ? '?scope=all' : `?scope=following&fromDate=${q(s.fromDate)}`);

export const updateRule = (id: number, body: RuleBody, scope: Scope) =>
  apiSend<unknown>('PUT', `/recurring-rules/${id}${scopeQuery(scope)}`, body).then(parse(RuleResponse, 'rule'));

export const deleteRule = (id: number, scope: Scope) =>
  apiSend<void>('DELETE', `/recurring-rules/${id}${scopeQuery(scope)}`);

/** "Delete just this one": a cancelled exception, never a skipped (missed) block. */
export const cancelOccurrence = (blockId: number) => apiSend<void>('DELETE', `/tasks/${blockId}/occurrence`);

export const placeAnyway = (ruleId: number, date: string) =>
  apiSend<unknown>('POST', `/recurring-rules/${ruleId}/occurrences/${q(date)}/place-anyway`).then(parse(BlockResponse, 'block'));

export const skipConflict = (ruleId: number, date: string) =>
  apiSend<void>('POST', `/recurring-rules/${ruleId}/occurrences/${q(date)}/skip`);

export interface BlockBody {
  name?: string; categoryId?: number; date?: string; startTime?: string; endTime?: string; energy?: number;
}

/** Absolute values, so a replayed edit is harmless; a newer edit of the same block replaces a queued one. */
export const saveBlock = (id: number, body: BlockBody) =>
  sendOrQueue({ key: `block:${id}`, method: 'PUT', path: `/tasks/${id}`, body },
    r => sendRequest(r).then(parse(BlockResponse, 'block')));

export const createBlock = (body: BlockBody) =>
  sendOrQueue({ key: `block:new:${crypto.randomUUID()}`, method: 'POST', path: '/tasks', body },
    r => sendRequest(r).then(parse(BlockResponse, 'block')));

export const deleteBlock = (id: number) => apiSend<void>('DELETE', `/tasks/${id}`);
