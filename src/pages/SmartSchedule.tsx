import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { Commitment, WeeklyGoals } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

import { apiPut, generateSmartSchedule, isDemoOnly } from '@/lib/api';
import type { ScheduleReason, SmartScheduleResponse } from '@/contracts/analytics';
import { ALL_DAYS, WEEKDAYS, categoryLabel, formatDays, shortfallMessages, toggleDay } from '@/lib/smart-schedule';
import { useI18n, type I18n } from '@/i18n';
import { DemoUnavailable } from '@/components/DemoUnavailable';
import { planDateFor, weekOptions } from '@/lib/dates';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarCheck } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Example commitments for a first visit, named in the user's language. */
const defaultCommitments = (t: I18n['t']): Commitment[] => [
  { id: '1', name: t('schedule.default.sleep'), startTime: '23:00', endTime: '07:00', days: DAYS },
  { id: '2', name: t('schedule.default.university'), startTime: '10:00', endTime: '13:00', days: ['Monday', 'Wednesday', 'Friday'] },
  { id: '3', name: t('schedule.default.gym'), startTime: '17:00', endTime: '18:30', days: ['Monday', 'Wednesday', 'Friday'] },
];

type ScheduleBlock = SmartScheduleResponse['blocks'][number];

/** A generated block's name: translated from its label (English keeps the service's name; commitments keep theirs). */
function blockName(block: ScheduleBlock, i18n: I18n): string {
  if (i18n.locale === 'en' || !block.label) return block.name;
  return i18n.t(`schedule.label.${block.label}`);
}

/** The reasoning lines: the service's English text, or the same facts in the user's language. */
function reasoningLines(result: SmartScheduleResponse, i18n: I18n): string[] {
  if (i18n.locale === 'en' || !result.reasons) return result.reasoning;
  return result.reasons.filter((r): r is ScheduleReason & { code: 'learned' | 'default' } => r.code !== 'shortfall').map(r => {
    const category = categoryLabel(r.category, i18n.locale);
    const time = r.start_time ?? '';
    return r.code === 'learned'
      ? i18n.t('schedule.reason.learned', { category, time, count: r.blocks ?? 0 })
      : i18n.t('schedule.reason.default', { category, time });
  });
}
const DEFAULT_GOALS: WeeklyGoals = { deepWorkHours: 15, studyHours: 10, restHours: 7 };

export default function SmartSchedule() {
  const { t } = useI18n();
  if (isDemoOnly()) return <DemoUnavailable feature={t('nav.schedule')} />;
  return <SmartScheduleContent />;
}

function SmartScheduleContent() {
  const i18n = useI18n();
  const { t, locale, errorMessage } = i18n;
  // Kept in this browser until commitments/goals move to the server.
  const [commitments, setCommitments] = useLocalStorage<Commitment[]>('smart-schedule-commitments', defaultCommitments(t));
  const [goals, setGoals] = useLocalStorage<WeeklyGoals>('smart-schedule-goals', DEFAULT_GOALS);
  const weeks = useMemo(() => weekOptions(new Date(), 5, locale), [locale]);
  const [weekStart, setWeekStart] = useState(() => weeks.find(w => w.isDefault)!.weekStart);
  const [result, setResult] = useState<SmartScheduleResponse | null>(null);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newDays, setNewDays] = useState<string[]>(WEEKDAYS);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const addCommitment = () => {
    if (!newName.trim() || newDays.length === 0) return;
    setCommitments(prev => [...prev, { id: crypto.randomUUID(), name: newName, startTime: newStart, endTime: newEnd, days: newDays }]);
    setNewName('');
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await generateSmartSchedule({ commitments, goals });
      setResult(res);
      toast({ title: t('schedule.generated'), description: t('schedule.generatedBody') });
    } catch (error) {
      toast({ title: t('schedule.generateFailed'), description: errorMessage(error, 'schedule.unreachable'), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!result) return;
    try {
      setIsSaving(true);
      const tasks = result.blocks.filter(b => b.category !== 'fixed').map(block => ({
        name: blockName(block, i18n),
        category: block.category,
        startTime: block.startTime,
        endTime: block.endTime,
        energy: ['deep-work', 'study'].includes(block.category) ? 5 : 3,
        date: planDateFor(block.day, weekStart),
      }));
      // Replaces any plan saved earlier for the same week (manual blocks are kept).
      const saved = await apiPut<{ count: number; replaced: number }>('/tasks/plan', { weekStart, tasks });
      const week = weeks.find(w => w.weekStart === weekStart)?.label ?? weekStart;
      const blocks = t('planner.blocks', { count: saved.count });
      toast({
        title: t('schedule.success'),
        description: saved.replaced
          ? t('schedule.savedReplaced', { blocks, week, replaced: saved.replaced })
          : t('schedule.saved', { blocks, week }),
      });
      setResult(null); // Clear confirmation phase
    } catch (error) {
      toast({ title: t('schedule.saveFailed'), description: errorMessage(error, 'schedule.couldNotSave'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">{t('schedule.title')}</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Commitments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('schedule.commitments')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commitments.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{formatDays(c.days, locale)}</span>
                <span className="text-xs font-mono text-muted-foreground">{c.startTime}–{c.endTime}</span>
                <button onClick={() => setCommitments(prev => prev.filter(x => x.id !== c.id))} className="p-1 hover:bg-secondary rounded" aria-label={t('schedule.removeCommitment', { name: c.name })}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-2 items-end pt-2 border-t">
              <Input placeholder={t('schedule.namePlaceholder')} aria-label={t('schedule.namePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
              <Input type="time" aria-label={t('schedule.startTime')} value={newStart} onChange={e => setNewStart(e.target.value)} className="text-sm" />
              <Input type="time" aria-label={t('schedule.endTime')} value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={addCommitment} disabled={!newName.trim() || newDays.length === 0} aria-label={t('schedule.addCommitment')}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label={t('schedule.commitmentDays')}>
              {ALL_DAYS.map(day => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={newDays.includes(day) ? 'default' : 'outline'}
                  aria-pressed={newDays.includes(day)}
                  className="h-7 px-2 text-xs"
                  onClick={() => setNewDays(d => toggleDay(d, day))}
                >
                  {i18n.weekday(day, 'short')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('schedule.goals')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="goal-deep-work" className="text-xs">{categoryLabel('deep-work', locale)}</Label>
              <Input id="goal-deep-work" type="number" min={0} max={80} step={0.5} value={goals.deepWorkHours} onChange={e => setGoals(g => ({ ...g, deepWorkHours: +e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="goal-study" className="text-xs">{categoryLabel('study', locale)}</Label>
              <Input id="goal-study" type="number" min={0} max={80} step={0.5} value={goals.studyHours} onChange={e => setGoals(g => ({ ...g, studyHours: +e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="goal-rest" className="text-xs">{categoryLabel('rest', locale)}</Label>
              <Input id="goal-rest" type="number" min={0} max={80} step={0.5} value={goals.restHours} onChange={e => setGoals(g => ({ ...g, restHours: +e.target.value }))} />
            </div>
            <Button onClick={handleGenerate} className="w-full" disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} 
              {isGenerating ? t('schedule.analyzing') : t('schedule.generate')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t('schedule.recommended')}</h2>
            <div className="flex items-center gap-2">
            <Label htmlFor="target-week" className="text-xs">{t('schedule.targetWeek')}</Label>
            <select
              id="target-week"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {weeks.map(w => <option key={w.weekStart} value={w.weekStart}>{w.label}</option>)}
            </select>
            <Button onClick={handleSaveSchedule} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
              {t('schedule.savePlan')}
            </Button>
            </div>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('schedule.reasoning')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {reasoningLines(result, i18n).map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground italic">"{r}"</li>
                ))}
              </ul>
              {shortfallMessages(result.shortfall_minutes, locale).length > 0 && (
                <ul className="mt-3 space-y-1">
                  {shortfallMessages(result.shortfall_minutes, locale).map(m => (
                    <li key={m} className="text-sm text-destructive">{m}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {DAYS.map(day => {
            const dayBlocks = result.blocks.filter(b => b.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (dayBlocks.length === 0) return null;
            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{i18n.weekday(day)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {dayBlocks.map(block => (
                      <div key={block.id} className={`flex items-center gap-3 px-3 py-2 rounded border text-sm ${CATEGORY_COLORS[block.category]}`}>
                        <span className="font-mono text-xs w-24">{block.startTime}–{block.endTime}</span>
                        <span className="font-medium">{blockName(block, i18n)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
