import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Repeat, Tags, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeGrid, type GridMarker, type Placement } from '@/components/planner/TimeGrid';
import { BlockFormModal, type FormResult, type FormTarget } from '@/components/planner/BlockFormModal';
import { CategoryManager } from '@/components/planner/CategoryManager';
import type { Block } from '@/contracts/blocks';
import type { BlockRange } from '@/contracts/recurring';
import { useCategories, useInvalidatePlanner, useRules, useWeek } from '@/hooks/use-planner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnline } from '@/hooks/use-online';
import { useI18n, type TKey } from '@/i18n';
import { zonedDateString, zonedMinuteOfDay } from '@/lib/dates';
import { getUser } from '@/lib/api';
import { addDays, clockLabel, dayLoad, mondayOf, parseDate, weekDates, PLAN_AHEAD_DAYS } from '@/lib/planner';
import { placeAnyway, saveBlock, skipConflict } from '@/lib/planner-api';

type View = 'day' | 'week';
const VIEW_KEY = 'planner-view';

function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'day' ? 'day' : 'week';
  } catch {
    return 'week';
  }
}

/** "Now" ticks every minute, so the today column and the now line follow midnight too. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Planner v2 (F13): a Day view and a Week view on a 00:00–24:00 grid in 15-minute steps. From
 * 768 px the week has seven columns; on a phone it is one day with weekday pills. Blocks move by
 * drag (mouse) or long press (touch), and everything also works through the form.
 */
export default function PlannerV2() {
  const { t, formatDate, weekday, errorMessage } = useI18n();
  const isMobile = useIsMobile();
  const online = useOnline();
  const qc = useQueryClient();
  const invalidate = useInvalidatePlanner();
  // Today and now in the user's zone (the one the server plans in), not the device's (review M4).
  const zone = getUser()?.timezone;
  const now = useNow();
  const today = zonedDateString(now, zone);
  const nowMin = zonedMinuteOfDay(now, zone);
  const [view, setView] = useState<View>(storedView);
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [managing, setManaging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  const monday = mondayOf(selected);
  const week = useWeek(monday);
  const categoriesQuery = useCategories();
  const rulesQuery = useRules();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const rules = useMemo(() => rulesQuery.data ?? [], [rulesQuery.data]);

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* per-device convenience only */ }
  }, [view]);

  const pxPerMin = isMobile ? 1.2 : 0.8;
  const days = view === 'week' && !isMobile ? weekDates(monday) : [selected];
  const range = week.data;
  const blocks = useMemo(() => (range?.tasks ?? []).filter(b => b.status !== 'moved'), [range]);
  const markers: GridMarker[] = useMemo(() => {
    const byId = new Map(rules.map(r => [r.id, r]));
    return (range?.exceptions ?? []).flatMap(x => {
      const rule = byId.get(x.ruleId);
      if (!rule || x.reason === 'moved') return [];
      return [{ key: `${x.ruleId}-${x.date}`, ruleId: x.ruleId, date: x.date, startMin: rule.startMin, endMin: rule.endMin,
        name: rule.name, reason: x.reason }];
    });
  }, [range, rules]);

  // Auto-scroll to now (or to the morning on another day) when the view or day changes.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const focus = days.includes(today) ? nowMin : 8 * 60;
    el.scrollTop = Math.max(0, focus * pxPerMin - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selected, isMobile, !!range]);

  const dayLabel = (date: string, width: 'long' | 'short' = 'long') =>
    formatDate(parseDate(date), { weekday: width, day: 'numeric', month: width === 'long' ? 'long' : 'short' });
  const announce = (text: string) => setAnnouncement(text);

  const step = view === 'week' && !isMobile ? 7 : 1;
  const go = (dir: 1 | -1) => setSelected(d => addDays(d, dir * step));

  const commit = async (block: Block, to: Placement) => {
    const key = ['planner-range', monday];
    const before = qc.getQueryData<BlockRange>(key);
    if (before) {
      qc.setQueryData<BlockRange>(key, {
        ...before,
        tasks: before.tasks.map(b => (b.id === block.id ? { ...b, ...to, recurringEdited: b.recurringRuleId != null || b.recurringEdited } : b)),
      });
    }
    announce(t('planner.moved', { date: dayLabel(to.date), start: clockLabel(to.startMin), end: clockLabel(to.endMin) }));
    try {
      const r = await saveBlock(block.id, { date: to.date, startTime: clockLabel(to.startMin), endTime: clockLabel(to.endMin) });
      if (r.queued) toast(t('planner.queued'));
      else invalidate();
    } catch (err) {
      if (before) qc.setQueryData(key, before);
      toast.error(errorMessage(err, 'planner.saveFailed'));
    }
  };

  const resolve = async (action: () => Promise<unknown>, done: TKey) => {
    try {
      await action();
      announce(t(done));
      invalidate();
    } catch (err) {
      toast.error(errorMessage(err, 'planner.saveFailed'));
    }
  };

  const formDone = (r: FormResult) => {
    setForm(null);
    const message: Record<FormResult['kind'], TKey> = {
      saved: 'planner.saved', queued: 'planner.queued', deleted: 'planner.deleted',
      ruleSaved: 'recurring.saved', ruleQueued: 'recurring.offlineHint',
    };
    announce(t(message[r.kind]));
    toast(t(message[r.kind]));
    invalidate({ rules: r.rules });
  };

  const visibleEmpty = range && !blocks.some(b => days.includes(b.date)) && !markers.some(m => days.includes(m.date));
  const loading = !range && week.fetchStatus === 'fetching';
  const offlineNothing = !range && !online;
  const plannedUntil = addDays(today, PLAN_AHEAD_DAYS);
  const newAt = (date: string) => setForm({ mode: 'new', date, startMin: date === today ? Math.min(1380, Math.ceil(nowMin / 15) * 15) : 540 });

  const header = view === 'week' && !isMobile
    ? `${dayLabel(monday, 'short')} – ${dayLabel(addDays(monday, 6), 'short')}`
    : dayLabel(selected);

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('planner.heading')}</h1>
        <div role="group" aria-label={t('planner.views')} className="flex rounded-md border p-0.5">
          {(['day', 'week'] as const).map(v => (
            <Button key={v} size="sm" variant={view === v ? 'default' : 'ghost'} aria-pressed={view === v} onClick={() => setView(v)}>
              {t(v === 'day' ? 'planner.day' : 'planner.week')}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon" variant="outline" aria-label={t(step === 7 ? 'planner.prevWeek' : 'planner.prevDay')} onClick={() => go(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" aria-label={t(step === 7 ? 'planner.nextWeek' : 'planner.nextDay')} onClick={() => go(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSelected(today)}>{t('planner.today')}</Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium" aria-live="polite">{header}</span>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button size="sm" onClick={() => newAt(selected)} disabled={!categories.length}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />{t('planner.emptyAction')}
          </Button>
          <Button size="sm" variant="secondary" disabled={!categories.length}
            onClick={() => setForm({ mode: 'new', date: selected, startMin: 540, repeat: true })}>
            <Repeat className="mr-1 h-4 w-4" aria-hidden="true" />{t('recurring.new')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setManaging(true)} disabled={!categories.length}>
            <Tags className="mr-1 h-4 w-4" aria-hidden="true" />{t('categories.manage')}
          </Button>
        </div>
      </div>

      {!online && (
        <div role="status" className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
          <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{offlineNothing ? t('planner.offlineNothing') : t('planner.offlineWeek')} {t('planner.readOnlyOffline')}</span>
        </div>
      )}
      {week.isError && online && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm">
          <span className="flex-1">{errorMessage(week.error, 'planner.loadFailed')}</span>
          <Button size="sm" variant="outline" onClick={() => week.refetch()}>{t('common.retry')}</Button>
        </div>
      )}
      {range?.truncated && <p className="text-xs text-muted-foreground">{t('planner.plannedUpTo', { date: dayLabel(plannedUntil) })}</p>}

      {isMobile && view === 'week' && (
        <div className="sticky top-0 z-30 -mx-1 grid grid-cols-7 gap-0.5 bg-background py-1" role="group" aria-label={t('planner.week')}>
          {weekDates(monday).map(d => {
            const load = dayLoad(blocks.filter(b => b.date === d));
            const on = d === selected;
            return (
              <button key={d} type="button" aria-pressed={on} aria-label={dayLabel(d)} onClick={() => setSelected(d)}
                className={`flex min-h-[44px] min-w-0 flex-col items-center justify-center rounded-md text-xs ${on ? 'bg-primary text-primary-foreground' : d === today ? 'bg-secondary' : ''}`}>
                <span>{weekday(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][weekDates(monday).indexOf(d)], 'short')}</span>
                <span className="font-semibold">{parseDate(d).getDate()}</span>
                <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                  {Array.from({ length: load }, (_, i) => <span key={i} className={`h-1 w-1 rounded-full ${on ? 'bg-primary-foreground' : 'bg-primary'}`} />)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t(isMobile ? 'planner.longPressHint' : 'planner.dragHint')}</p>

      <div className="relative rounded-md border">
        {days.length > 1 && (
          <div className="flex border-b pl-12 text-xs" aria-hidden="true">
            {days.map(d => (
              <div key={d} className={`flex-1 border-l px-1 py-1 text-center ${d === today ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                {dayLabel(d, 'short')}
              </div>
            ))}
          </div>
        )}
        <div ref={scroller} className="max-h-[70vh] overflow-y-auto overscroll-contain" aria-busy={loading}>
          {range ? (
            <TimeGrid
              days={days} blocks={blocks} markers={markers} categories={categoryMap} pxPerMin={pxPerMin} today={today}
              nowMin={nowMin} readOnly={!online} label={d => dayLabel(d)}
              onOpen={b => setForm({ mode: 'edit', block: b })}
              onNew={(date, startMin) => setForm({ mode: 'new', date, startMin })}
              onCommit={commit}
              onPlaceAnyway={m => resolve(() => placeAnyway(m.ruleId, m.date), 'planner.saved')}
              onSkip={m => resolve(() => skipConflict(m.ruleId, m.date), 'planner.saved')}
              onSwipe={isMobile ? dir => setSelected(d => addDays(d, dir)) : undefined}
            />
          ) : (
            <div className="relative flex" style={{ height: 1440 * pxPerMin }}>
              <div className="w-12 shrink-0" aria-hidden="true">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-right pr-1 font-mono text-[10px] text-muted-foreground" style={{ height: 60 * pxPerMin }}>
                    {h === 0 ? '' : clockLabel(h * 60)}
                  </div>
                ))}
              </div>
              {days.map(d => (
                <div key={d} className="flex-1 space-y-2 border-l p-2">
                  {loading && <><Skeleton className="h-16 w-full" style={{ marginTop: 9 * 60 * pxPerMin }} /><Skeleton className="h-10 w-full" /></>}
                </div>
              ))}
            </div>
          )}
        </div>
        {visibleEmpty && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-4">
            <div className="pointer-events-auto max-w-sm rounded-lg border bg-card p-4 text-center shadow-sm">
              <p className="font-medium">{t('planner.empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('planner.emptyHint')}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => newAt(selected)} disabled={!online || !categories.length}>{t('planner.emptyAction')}</Button>
                {rules.length === 0 && (
                  <Button size="sm" variant="secondary" disabled={!categories.length}
                    onClick={() => setForm({ mode: 'new', date: selected, startMin: 540, repeat: true })}>
                    {t('recurring.new')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div aria-live="polite" className="sr-only" data-testid="planner-announcer">{announcement}</div>
      <BlockFormModal target={form} categories={categories} onClose={() => setForm(null)} onDone={formDone} />
      <CategoryManager open={managing} categories={categories} onClose={() => setManaging(false)}
        onChanged={m => { toast(t(m)); invalidate({ categories: true }); }} />
    </div>
  );
}
