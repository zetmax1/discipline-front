import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coffee, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchActiveSession, parkNote, saveSession, type SessionBody } from '@/lib/daily-api';
import { pending } from '@/lib/sync-queue';
import type { FocusSession } from '@/contracts/daily';
import {
  breakFor, breakSuggestion, clockOffset, CUSTOM_MAX, CUSTOM_MIN, customPreset, formatCountdown, PRESETS,
  remainingSeconds, type Preset,
} from '@/lib/focus';
import { useI18n } from '@/i18n';

type Live = Pick<FocusSession, 'id' | 'startedAt' | 'plannedMinutes' | 'breakMinutes' | 'distractions'> & { blockId: number | null };
interface Break { endsAtMs: number; minutes: number; long: boolean; suggestion: number }

const LIVE_KEY = 'focus-session'; // the running session on this device, for offline reloads

function readLive(): Live | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    return raw ? (JSON.parse(raw) as Live) : null;
  } catch {
    return null;
  }
}

function writeLive(live: Live | null) {
  try {
    if (live) localStorage.setItem(LIVE_KEY, JSON.stringify(live));
    else localStorage.removeItem(LIVE_KEY);
  } catch {
    // Private mode: the timer still runs in this tab.
  }
}

/** A short beep and a vibration when a session ends (web push arrives with F2). */
function signalEnd() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // No audio (tests, blocked autoplay): vibration and the title still signal the end.
  }
  navigator.vibrate?.([200, 100, 200]);
}

const presetFor = (minutes: number): Preset => PRESETS.find(p => p.focus === minutes) ?? customPreset(minutes);

/**
 * The focus timer. The countdown runs from the server's start time (corrected for this device's
 * clock), so a refresh, a second tab or another device show the same time. Every change is sent
 * as absolute values and queued when offline.
 */
export function FocusPanel({ block, completedToday }: { block: { id: number; name: string } | null; completedToday: number }) {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [live, setLive] = useState<Live | null>(readLive);
  const [offset, setOffset] = useState(0);
  const [brk, setBrk] = useState<Break | null>(null);
  const [choice, setChoice] = useState<string>('0');
  const [custom, setCustom] = useState(40);
  const [note, setNote] = useState('');
  const [, tick] = useState(0);
  const title = useRef(document.title);
  const finishing = useRef(false);

  const active = useQuery({ queryKey: ['session', 'active'], queryFn: fetchActiveSession, refetchInterval: 30_000 });
  useEffect(() => {
    if (!active.data) return;
    setOffset(clockOffset(Date.parse(active.data.serverNow), Date.now()));
    const s = active.data.session;
    const serverNow = Date.parse(active.data.serverNow);
    setLive(prev => {
      if (s) {
        return { id: s.id, startedAt: s.startedAt, plannedMinutes: s.plannedMinutes, breakMinutes: s.breakMinutes,
          distractions: Math.max(s.distractions, prev?.id === s.id ? prev.distractions : 0), blockId: s.blockId };
      }
      // No running session on the server: keep ours if the server hasn't seen it yet
      // (still queued offline, or started after this answer was taken).
      if (prev && (pending().some(r => r.key === `session:${prev.id}`) || Date.parse(prev.startedAt) > serverNow - 5_000)) return prev;
      return null;
    });
  }, [active.data]);
  useEffect(() => writeLive(live), [live]);

  useEffect(() => {
    if (!live && !brk) return;
    const id = window.setInterval(() => tick(n => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [live, brk]);

  const send = useCallback(async (s: Live, extra: Partial<SessionBody> = {}) => {
    try {
      const res = await saveSession(s.id, { blockId: s.blockId, startedAt: s.startedAt, plannedMinutes: s.plannedMinutes,
        breakMinutes: s.breakMinutes, distractions: s.distractions, ...extra });
      if ('result' in res) {
        setOffset(clockOffset(Date.parse(res.result.serverNow), Date.now()));
        return res.result.session;
      }
    } catch (err) {
      toast.error(errorMessage(err, 'errors.session_invalid'));
      void queryClient.invalidateQueries({ queryKey: ['session'] });
    }
    return null;
  }, [errorMessage, queryClient]);

  const serverNowIso = () => new Date(Date.now() + offset).toISOString();

  const start = async () => {
    const preset = choice === 'custom' ? customPreset(Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, custom))) : PRESETS[Number(choice)];
    const s: Live = { id: crypto.randomUUID(), startedAt: serverNowIso(), plannedMinutes: preset.focus,
      breakMinutes: breakFor(preset, completedToday + 1), distractions: 0, blockId: block?.id ?? null };
    document.title = title.current;
    setBrk(null);
    setLive(s);
    const saved = await send(s);
    if (saved) setLive(prev => (prev && prev.id === s.id ? { ...prev, startedAt: saved.startedAt } : prev));
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const finish = useCallback(async (outcome: 'completed' | 'abandoned') => {
    if (!live || finishing.current) return;
    finishing.current = true;
    const ended = live;
    setLive(null);
    await send(ended, { endedAt: new Date(Date.now() + offset).toISOString(), outcome });
    finishing.current = false;
    if (outcome === 'completed') {
      signalEnd();
      document.title = `${t('session.titleDone')} · ${title.current}`;
      toast(t('session.done'));
      const done = completedToday + 1;
      const minutes = breakFor(presetFor(ended.plannedMinutes), done);
      setBrk({ endsAtMs: Date.now() + minutes * 60_000, minutes, long: minutes !== presetFor(ended.plannedMinutes).break, suggestion: done });
    }
    void queryClient.invalidateQueries({ queryKey: ['sessions'] });
  }, [live, offset, send, t, completedToday, queryClient]);

  const remaining = live ? remainingSeconds(live, Date.now(), offset) : 0;
  useEffect(() => {
    if (live && remaining === 0) void finish('completed');
  }, [live, remaining, finish]);

  const distract = () => {
    if (!live) return;
    const next = { ...live, distractions: live.distractions + 1 };
    setLive(next);
    void send(next);
  };

  const park = async () => {
    const text = note.trim();
    if (!text) return;
    setNote('');
    try {
      const res = await parkNote(crypto.randomUUID(), text, live?.id);
      toast(res.queued ? t('sync.queued') : t('session.parked'));
    } catch (err) {
      toast.error(errorMessage(err, 'errors.parking_note_invalid'));
    }
  };

  if (live) {
    return (
      <Card className="border-primary/40">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary"><Timer className="h-4 w-4" aria-hidden />{t('session.focusing')}</p>
            {block && live.blockId === block.id && <p className="truncate text-sm text-muted-foreground">{t('session.on', { name: block.name })}</p>}
          </div>
          <p className="text-center font-mono text-6xl font-bold tabular-nums" role="timer" aria-label={t('session.remaining')} data-testid="countdown">
            {formatCountdown(remaining)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={distract}>{t('session.distraction')}</Button>
            <span className="text-sm text-muted-foreground" data-testid="distractions">{t('session.distractions', { count: live.distractions })}</span>
          </div>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void park(); }}>
            <Input aria-label={t('session.park')} placeholder={t('session.parkPlaceholder')} value={note} maxLength={280} onChange={e => setNote(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!note.trim()}>{t('session.park')}</Button>
          </form>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => finish('completed')}>{t('session.finish')}</Button>
            <Button variant="ghost" onClick={() => finish('abandoned')}>{t('session.stop')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (brk) {
    const left = Math.max(0, Math.floor((brk.endsAtMs - Date.now()) / 1000));
    return (
      <Card>
        <CardContent className="space-y-3 p-5 text-center">
          <p className="flex items-center justify-center gap-2 text-sm font-medium"><Coffee className="h-4 w-4" aria-hidden />
            {t(brk.long ? 'session.longBreak' : 'session.break', { minutes: brk.minutes })}</p>
          <p className="font-mono text-4xl font-bold tabular-nums">{formatCountdown(left)}</p>
          <p className="text-sm text-muted-foreground">{left === 0 ? t('session.breakOver') : t(breakSuggestion(brk.suggestion))}</p>
          <Button variant="outline" onClick={() => { setBrk(null); document.title = title.current; }}>{t('session.skipBreak')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="session-preset" className="text-xs">{t('session.preset')}</Label>
          <select id="session-preset" value={choice} onChange={e => setChoice(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-2 text-sm">
            {PRESETS.map((p, i) => <option key={p.focus} value={String(i)}>{t('session.presetValue', { focus: p.focus, break: p.break })}</option>)}
            <option value="custom">{t('session.custom')}</option>
          </select>
        </div>
        {choice === 'custom' && (
          <div className="w-32">
            <Label htmlFor="session-custom" className="text-xs">{t('session.customMinutes', { min: CUSTOM_MIN, max: CUSTOM_MAX })}</Label>
            <Input id="session-custom" type="number" min={CUSTOM_MIN} max={CUSTOM_MAX} value={custom} onChange={e => setCustom(Number(e.target.value))} />
          </div>
        )}
        <Button onClick={start}><Timer className="mr-2 h-4 w-4" aria-hidden />{t('session.start')}</Button>
      </div>
    </div>
  );
}
