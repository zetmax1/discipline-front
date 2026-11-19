/**
 * Daily loop API (F1). Reads parse with the zod contracts; writes that must survive going
 * offline go through the sync queue (all of them are replay-safe on the server).
 */
import type { z } from 'zod/v4';
import { apiGet, apiSend, ContractError } from './api';
import { sendOrQueue, flush, type QueuedRequest } from './sync-queue';
import { BlockResponse } from '@/contracts/blocks';
import {
  CheckinResponse, CheckinToday, SessionList, SessionResponse, ShutdownResponse, ShutdownToday,
} from '@/contracts/daily';

function parse<S extends z.ZodType>(schema: S, what: string) {
  return (value: unknown): z.infer<S> => {
    const result = schema.safeParse(value);
    if (result.error) throw new ContractError(what, result.error.message);
    return result.data;
  };
}

/** Sends one queued request. */
export const sendRequest = (r: QueuedRequest) => apiSend<unknown>(r.method, r.path, r.body, r.headers);

/** Sends whatever is waiting in the sync queue. */
export const flushQueue = () => flush(sendRequest);

export const fetchCheckinToday = () => apiGet<unknown>('/checkins/today').then(parse(CheckinToday, 'check-in'));
export const fetchActiveSession = () => apiGet<unknown>('/sessions/active').then(parse(SessionResponse, 'session'));
export const fetchSessions = (date: string) =>
  apiGet<unknown>(`/sessions?date=${encodeURIComponent(date)}`).then(parse(SessionList, 'sessions'));
export const fetchShutdown = () => apiGet<unknown>('/shutdowns/today').then(parse(ShutdownToday, 'shutdown'));

export interface CheckinBody {
  skipped?: boolean;
  sleepStartMin?: number;
  sleepEndMin?: number;
  sleepQuality?: number;
  energy?: number;
  note?: string;
}

/**
 * Saves the morning check-in, stamped with the moment the user saved it (`madeAt`), so a check-in
 * queued offline before midnight still counts for that day when the queue drains afterwards. The
 * server only trusts the stamp within the bounds it uses for a queued session start (at most 24 h
 * old, at most a minute ahead) and otherwise counts the check-in for today.
 */
export function saveCheckin(body: CheckinBody) {
  const stamped = { ...body, madeAt: new Date().toISOString() };
  return sendOrQueue({ key: 'checkin:today', method: 'PUT', path: '/checkins/today', body: stamped }, r =>
    sendRequest(r).then(parse(CheckinResponse, 'check-in')));
}

export interface SessionBody {
  blockId?: number | null;
  startedAt?: string;
  plannedMinutes: number;
  breakMinutes: number;
  distractions: number;
  endedAt?: string;
  outcome?: 'completed' | 'abandoned';
}

export function saveSession(id: string, body: SessionBody) {
  return sendOrQueue({ key: `session:${id}`, method: 'PUT', path: `/sessions/${id}`, body }, r =>
    sendRequest(r).then(parse(SessionResponse, 'session')));
}

export function parkNote(id: string, text: string, sessionId?: string) {
  return sendOrQueue({ key: `note:${id}`, method: 'PUT', path: `/parking-lot/${id}`, body: { text, sessionId } }, sendRequest);
}

export function closeDay(win: string) {
  return sendOrQueue({ key: 'shutdown:today', method: 'PUT', path: '/shutdowns/today', body: { win } }, r =>
    sendRequest(r).then(parse(ShutdownResponse, 'shutdown')));
}

export interface BlockCheckinBody {
  status: 'done' | 'partial' | 'skipped';
  actualStartMin?: number;
  actualEndMin?: number;
  focusRating?: number;
}

export function checkInBlock(id: number | string, body: BlockCheckinBody) {
  return sendOrQueue({ key: `block-checkin:${id}`, method: 'POST', path: `/tasks/${id}/check-in`, body }, r =>
    sendRequest(r).then(parse(BlockResponse, 'block')));
}

export function moveBlock(id: number | string, to: { date: string; startMin: number; endMin: number }) {
  const key = crypto.randomUUID();
  return sendOrQueue({ key: `move:${key}`, method: 'POST', path: `/tasks/${id}/move`, body: to,
    headers: { 'Idempotency-Key': key } }, r => sendRequest(r).then(parse(BlockResponse, 'block')));
}
