import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Block } from '@/contracts/blocks';
import type { Category } from '@/contracts/categories';
import { useI18n } from '@/i18n';
import { STEPS, categoryLabel, clockLabel, isoWeekday, parseDate } from '@/lib/planner';
import {
  cancelOccurrence, createBlock, createRule, deleteBlock, deleteRule, saveBlock, updateRule,
} from '@/lib/planner-api';

/** What the form opens on: a new block (maybe repeating) or an existing one. */
export type FormTarget =
  | { mode: 'new'; date: string; startMin: number; repeat?: boolean }
  | { mode: 'edit'; block: Block };

export type FormResult = { kind: 'saved' | 'queued' | 'deleted' | 'ruleSaved' | 'ruleQueued'; rules?: boolean };

interface Props {
  target: FormTarget | null;
  categories: Category[];
  onClose: () => void;
  onDone: (r: FormResult) => void;
}

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7];
const ENGLISH = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Everything a gesture can do, by keyboard and screen reader (F13 S2): date, 15-minute start/end,
 * category, weekly repetition, and for an occurrence "only this one" / "this and following".
 */
export function BlockFormModal({ target, categories, onClose, onDone }: Props) {
  const { t, weekday, errorMessage } = useI18n();
  const block = target?.mode === 'edit' ? target.block : null;
  const occurrence = block?.recurringRuleId != null;
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState(540);
  const [end, setEnd] = useState(600);
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState('');
  const [scope, setScope] = useState<'one' | 'following'>('one');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setError('');
    setScope('one');
    setUntil('');
    if (target.mode === 'edit') {
      const b = target.block;
      setName(b.name);
      setCategoryId(b.categoryId ?? '');
      setDate(b.date);
      setStart(b.startMin);
      setEnd(b.endMin);
      setRepeat(false);
    } else {
      setName('');
      setCategoryId(categories.find(c => c.kind === 'focus')?.id ?? categories[0]?.id ?? '');
      setDate(target.date);
      setStart(target.startMin);
      setEnd(Math.min(1440, target.startMin + 60));
      setRepeat(!!target.repeat);
      setWeekdays([isoWeekday(target.date)]);
    }
  }, [target, categories]);

  const valid = name.trim().length > 0 && categoryId !== '' && end > start && date !== '' && (!repeat || weekdays.length > 0);

  const run = async (action: () => Promise<FormResult>) => {
    setBusy(true);
    setError('');
    try {
      onDone(await action());
    } catch (err) {
      setError(errorMessage(err, 'planner.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    const cat = Number(categoryId);
    const times = { startTime: clockLabel(start), endTime: clockLabel(end) };
    if (!block) {
      if (repeat) {
        const r = await createRule({ categoryId: cat, name: name.trim(), weekdays, startMin: start, endMin: end,
          validFrom: date, validTo: until || null });
        return { kind: r.queued ? 'ruleQueued' : 'ruleSaved', rules: true };
      }
      const r = await createBlock({ name: name.trim(), categoryId: cat, date, energy: 3, ...times });
      return { kind: r.queued ? 'queued' : 'saved' };
    }
    if (occurrence && scope === 'following') {
      await updateRule(block.recurringRuleId!, { name: name.trim(), categoryId: cat, startMin: start, endMin: end },
        { scope: 'following', fromDate: block.originalDate ?? block.date });
      return { kind: 'ruleSaved', rules: true };
    }
    const r = await saveBlock(block.id, { name: name.trim(), categoryId: cat, date, ...times });
    return { kind: r.queued ? 'queued' : 'saved' };
  });

  const remove = (which: 'block' | 'one' | 'following') => run(async () => {
    if (!block) return { kind: 'deleted' };
    if (which === 'block') await deleteBlock(block.id);
    else if (which === 'one') await cancelOccurrence(block.id);
    else await deleteRule(block.recurringRuleId!, { scope: 'following', fromDate: block.originalDate ?? block.date });
    return { kind: 'deleted', rules: which === 'following' };
  });

  const title = block ? t('planner.editTitle') : repeat ? t('recurring.new') : t('planner.newTitle');

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{t('planner.dragHint')}</DialogDescription>
        </DialogHeader>
        <form id="block-form" className="space-y-3" onSubmit={e => { e.preventDefault(); if (valid && !busy) void save(); }}>
          <div>
            <Label htmlFor="bf-name">{t('planner.task')}</Label>
            <Input id="bf-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder={t('planner.taskPlaceholder')} />
          </div>
          <div>
            <Label htmlFor="bf-category">{t('planner.category')}</Label>
            <select id="bf-category" className={selectClass} value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
              {categories.map(c => <option key={c.id} value={c.id}>{categoryLabel(c, t)}</option>)}
            </select>
          </div>
          {!(occurrence && scope === 'following') && (
            <div>
              <Label htmlFor="bf-date">{repeat ? t('recurring.from') : t('planner.date')}</Label>
              <Input id="bf-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bf-start">{t('planner.start')}</Label>
              <select id="bf-start" className={`${selectClass} font-mono`} value={start}
                onChange={e => { const s = Number(e.target.value); setStart(s); if (end <= s) setEnd(Math.min(1440, s + 60)); }}>
                {STEPS.filter(m => m < 1440).map(m => <option key={m} value={m}>{clockLabel(m)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="bf-end">{t('planner.end')}</Label>
              <select id="bf-end" className={`${selectClass} font-mono`} value={end} onChange={e => setEnd(Number(e.target.value))}>
                {STEPS.filter(m => m > start).map(m => <option key={m} value={m}>{clockLabel(m)}</option>)}
              </select>
            </div>
          </div>

          {!block && (
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={repeat} onChange={e => setRepeat(e.target.checked)} />
              {t('recurring.repeat')}
            </label>
          )}
          {!block && repeat && (
            <>
              <fieldset>
                <legend className="text-sm font-medium">{t('recurring.weekdays')}</legend>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ISO_DAYS.map(d => {
                    const on = weekdays.includes(d);
                    return (
                      <button key={d} type="button" aria-pressed={on} aria-label={weekday(ENGLISH[d - 1])}
                        className={`h-10 min-w-10 rounded-md border px-2 text-xs font-medium ${on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                        onClick={() => setWeekdays(w => (on ? w.filter(x => x !== d) : [...w, d].sort()))}>
                        {weekday(ENGLISH[d - 1], 'short')}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="bf-until">{t('recurring.until')}</Label>
                <Input id="bf-until" type="date" value={until} min={date} onChange={e => setUntil(e.target.value)} />
                {!until && <p className="mt-1 text-xs text-muted-foreground">{t('recurring.noEnd')}</p>}
              </div>
            </>
          )}

          {occurrence && (
            <fieldset>
              <legend className="text-sm font-medium">{t('recurring.applyTo')}</legend>
              {(['one', 'following'] as const).map(s => (
                <label key={s} className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input type="radio" name="bf-scope" className="h-4 w-4" checked={scope === s} onChange={() => setScope(s)} />
                  {s === 'one' ? t('recurring.thisOne') : t('recurring.thisAndFollowing')}
                </label>
              ))}
              <p className="text-xs text-muted-foreground">{t('recurring.badge')} · {block && formatShort(block.date, weekday)}</p>
            </fieldset>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {block && !occurrence && (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => remove('block')}>{t('planner.deleteBlock')}</Button>
            )}
            {block && occurrence && (
              <>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => remove('one')}>{t('recurring.deleteOne')}</Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => remove('following')}>{t('recurring.deleteFollowing')}</Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" form="block-form" disabled={!valid || busy}>{t('common.save')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatShort(date: string, weekday: (d: string, w?: 'long' | 'short') => string) {
  return weekday(ENGLISH[(parseDate(date).getDay() + 6) % 7], 'long');
}
