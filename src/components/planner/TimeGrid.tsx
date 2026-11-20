import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Repeat } from 'lucide-react';
import type { Block } from '@/contracts/blocks';
import type { Category } from '@/contracts/categories';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { CategoryIconView } from './CategoryIconView';
import {
  DAY_MIN, LONG_PRESS_MS, categoryLabel, clockLabel, layoutLanes, moveWithin, pressDecision, resizeEnd, snap,
} from '@/lib/planner';

/** A date a rule has no block on, shown quietly at the rule's time: a conflict or "not this week". */
export interface GridMarker {
  key: string;
  ruleId: number;
  date: string;
  startMin: number;
  endMin: number;
  name: string;
  reason: 'conflict' | 'cancelled';
}

export interface Placement { date: string; startMin: number; endMin: number }

interface Props {
  days: string[];
  blocks: Block[];
  markers: GridMarker[];
  categories: Map<number, Category>;
  pxPerMin: number;
  today: string;
  nowMin: number;
  readOnly: boolean;
  onOpen: (block: Block) => void;
  onNew: (date: string, startMin: number) => void;
  onCommit: (block: Block, to: Placement) => void;
  onPlaceAnyway: (m: GridMarker) => void;
  onSkip: (m: GridMarker) => void;
  /** Phone: a horizontal swipe on the grid goes to the next (1) or previous (-1) day. */
  onSwipe?: (dir: 1 | -1) => void;
  /** The accessible date of a column ("Wednesday, 4 November"). */
  label: (date: string) => string;
}

interface Press {
  block: Block;
  mode: 'move' | 'resize';
  pointerId: number;
  mouse: boolean;
  x: number;
  y: number;
  at: number;
  picked: boolean;
  timer?: number;
  cur: Placement;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MIN_TARGET_PX = 44;

export function TimeGrid(props: Props) {
  const { days, blocks, markers, categories, pxPerMin, today, nowMin, readOnly, label } = props;
  const { t } = useI18n();
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const columns = useRef<(HTMLDivElement | null)[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ id: number; to: Placement } | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const height = DAY_MIN * pxPerMin;

  const clear = () => {
    const p = press.current;
    if (p?.timer) window.clearTimeout(p.timer);
    press.current = null;
    setPreview(null);
  };

  useEffect(() => {
    const columnAt = (x: number): string | undefined => {
      const i = columns.current.findIndex(el => {
        const r = el?.getBoundingClientRect();
        return r && x >= r.left && x <= r.right;
      });
      return i >= 0 ? propsRef.current.days[i] : undefined;
    };
    const onMove = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (!p.picked) {
        if (p.mouse) {
          if (moved < 4) return;
          p.picked = true;
        } else {
          if (pressDecision(performance.now() - p.at, moved) === 'scroll') clear(); // a swipe scrolls
          return;
        }
      }
      const delta = (e.clientY - p.y) / propsRef.current.pxPerMin;
      const orig = { startMin: p.block.startMin, endMin: p.block.endMin };
      p.cur = p.mode === 'resize'
        ? { date: p.block.date, startMin: orig.startMin, endMin: resizeEnd(orig, orig.endMin + delta) }
        : { date: columnAt(e.clientX) ?? p.cur.date, ...moveWithin(orig, orig.startMin + delta) };
      setPreview({ id: p.block.id, to: p.cur });
    };
    const onUp = (e: PointerEvent) => {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      if (p.picked) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 0);
        const r = gridRef.current?.getBoundingClientRect();
        const inside = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 40 && e.clientY <= r.bottom + 40;
        const changed = p.cur.date !== p.block.date || p.cur.startMin !== p.block.startMin || p.cur.endMin !== p.block.endMin;
        if (inside && changed) propsRef.current.onCommit(p.block, p.cur); // dragged off-screen: cancelled
      }
      clear();
    };
    const onCancel = (e: PointerEvent) => {
      if (press.current && e.pointerId === press.current.pointerId) clear();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && press.current) clear();
    };
    // While a block is picked up on touch, the page must not scroll under the finger.
    const onTouchMove = (e: TouchEvent) => {
      if (press.current?.picked) e.preventDefault();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const begin = (e: ReactPointerEvent, block: Block, mode: Press['mode']) => {
    if (readOnly || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (block.status !== 'planned' && block.status !== 'skipped') return; // what happened stays put
    e.stopPropagation();
    const p: Press = {
      block, mode, pointerId: e.pointerId, mouse: e.pointerType === 'mouse', x: e.clientX, y: e.clientY,
      at: performance.now(), picked: false, cur: { date: block.date, startMin: block.startMin, endMin: block.endMin },
    };
    if (!p.mouse) {
      p.timer = window.setTimeout(() => {
        if (press.current !== p) return;
        p.picked = true;
        try { navigator.vibrate?.(20); } catch { /* not supported */ }
        setPreview({ id: block.id, to: p.cur });
      }, LONG_PRESS_MS);
    }
    press.current = p;
  };

  const blockStyle = (b: Block, lane: { lane: number; lanes: number } | undefined) => {
    const span = preview?.id === b.id ? preview.to : b;
    const l = lane ?? { lane: 0, lanes: 1 };
    return {
      top: span.startMin * pxPerMin,
      height: Math.max((span.endMin - span.startMin) * pxPerMin, 20),
      left: `calc(${(100 / l.lanes) * l.lane}% + 2px)`,
      width: `calc(${100 / l.lanes}% - 4px)`,
    };
  };

  return (
    <div ref={gridRef} className="relative flex select-none" style={{ height }}>
      <div className="w-12 shrink-0 relative" aria-hidden="true">
        {HOURS.map(h => (
          <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] font-mono text-muted-foreground"
            style={{ top: h * 60 * pxPerMin }}>
            {h === 0 ? '' : clockLabel(h * 60)}
          </div>
        ))}
      </div>
      {days.map((date, ci) => {
        const dayBlocks = blocks.filter(b => b.date === date);
        // Lanes from the drawn height: a short block is drawn at least 44 px tall on a phone.
        const minLen = MIN_TARGET_PX / pxPerMin;
        const lanes = layoutLanes(dayBlocks.map(b => ({ id: b.id, startMin: b.startMin, endMin: Math.max(b.endMin, b.startMin + minLen) })));
        const isToday = date === today;
        return (
          <div
            key={date}
            ref={el => { columns.current[ci] = el; }}
            data-date={date}
            aria-label={t('planner.gridLabel', { date: label(date) })}
            role="group"
            className="relative flex-1 min-w-0 border-l border-border"
            style={{
              touchAction: 'pan-y',
              backgroundImage: `repeating-linear-gradient(to bottom, hsl(var(--border)) 0 1px, transparent 1px ${60 * pxPerMin}px)`,
            }}
            onClick={e => {
              if (e.target !== e.currentTarget || suppressClick.current || readOnly) return;
              const rect = e.currentTarget.getBoundingClientRect();
              props.onNew(date, Math.min(DAY_MIN - 60, snap(Math.floor((e.clientY - rect.top) / pxPerMin / 15) * 15)));
            }}
            onPointerDown={e => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; }}
            onPointerUp={e => {
              const s = swipe.current;
              swipe.current = null;
              if (!s || s.id !== e.pointerId || press.current?.picked || !props.onSwipe) return;
              const dx = e.clientX - s.x, dy = e.clientY - s.y;
              if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) props.onSwipe(dx < 0 ? 1 : -1);
            }}
          >
            {isToday && (
              <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-primary" style={{ top: nowMin * pxPerMin }} aria-hidden="true" />
            )}
            {markers.filter(m => m.date === date).map(m => (
              <div key={m.key}
                className="absolute inset-x-1 z-0 rounded-md border border-dashed border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                style={{ top: m.startMin * pxPerMin, minHeight: Math.max((m.endMin - m.startMin) * pxPerMin, 24) }}>
                {m.reason === 'conflict' ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="w-full">{t('recurring.conflict', { name: m.name })}</span>
                    {!readOnly && (
                      <>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => props.onPlaceAnyway(m)}>{t('recurring.placeAnyway')}</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => props.onSkip(m)}>{t('recurring.skipThisWeek')}</Button>
                      </>
                    )}
                  </div>
                ) : (
                  <span>{t('recurring.notThisWeek', { name: m.name })}</span>
                )}
              </div>
            ))}
            {dayBlocks.map(b => {
              const cat = b.categoryId != null ? categories.get(b.categoryId) : undefined;
              const name = b.name;
              const start = clockLabel(preview?.id === b.id ? preview.to.startMin : b.startMin);
              const end = clockLabel(preview?.id === b.id ? preview.to.endMin : b.endMin);
              const picked = preview?.id === b.id;
              const finished = b.status === 'done' || b.status === 'partial';
              return (
                <button
                  key={b.id}
                  type="button"
                  data-block-id={b.id}
                  aria-label={t('planner.blockLabel', { name, start, end }) + (cat ? `, ${categoryLabel(cat, t)}` : '')}
                  className={`absolute z-10 overflow-hidden rounded-md border border-border bg-card px-2 py-1 text-left text-xs text-foreground shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    picked ? 'z-30 scale-[1.02] shadow-lg ring-2 ring-primary' : ''} ${finished ? 'opacity-75' : ''} ${b.status === 'skipped' ? 'text-muted-foreground' : ''}`}
                  style={{ ...blockStyle(b, lanes.get(b.id)), borderLeftWidth: 4, borderLeftColor: cat?.color ?? 'hsl(var(--border))',
                    touchAction: picked ? 'none' : 'pan-y' }}
                  onPointerDown={e => begin(e, b, 'move')}
                  onClick={() => { if (!suppressClick.current) props.onOpen(b); }}
                  onContextMenu={e => { if (press.current) e.preventDefault(); }}
                >
                  <span className="flex items-center gap-1 font-medium leading-tight">
                    {cat && <CategoryIconView icon={cat.icon} className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{name}</span>
                    {b.recurringRuleId != null && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t('recurring.badge')} />}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground">{start}–{end}</span>
                  {!readOnly && b.status === 'planned' && (
                    <div aria-hidden="true" onPointerDown={e => begin(e, b, 'resize')}
                      className="absolute inset-x-0 -bottom-[22px] h-[44px] cursor-ns-resize [@media(pointer:fine)]:bottom-0 [@media(pointer:fine)]:h-2" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
