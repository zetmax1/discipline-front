import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { TASK_CATEGORIES, CATEGORY_COLORS, type TaskCategory } from '@/lib/types';
import { toast } from 'sonner';
import { completionMessage } from '@/lib/static-data';
import { categoryLabel } from '@/lib/smart-schedule';
import { useI18n } from '@/i18n';
import { localDateString } from '@/lib/dates';

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6-24

// Generate time options in 24h format with 15-minute intervals
function generateTimeOptions() {
  const options: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  options.push('24:00');
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Parse "HH:MM" to total minutes for comparison
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Planner() {
  const { todayTasks, addTask, updateTask, adjustDistractions, deleteTask } = useTasks();
  const today = localDateString();
  const { t, locale } = useI18n();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('deep-work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [energy, setEnergy] = useState(3);

  const isTimeValid = timeToMinutes(endTime) > timeToMinutes(startTime);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error(t('planner.enterName'));
      return;
    }
    if (!isTimeValid) {
      toast.error(t('planner.endAfterStart'));
      return;
    }
    const result = await addTask({ name: name.trim(), category, startTime, endTime, energy, date: today });
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    setName('');
    toast(t('planner.added'));
  };

  // Auto-adjust end time when start time changes
  const handleStartChange = (value: string) => {
    setStartTime(value);
    if (timeToMinutes(value) >= timeToMinutes(endTime)) {
      // Set end to start + 1 hour, capped at 24:00
      const newEnd = Math.min(timeToMinutes(value) + 60, 24 * 60);
      const h = Math.floor(newEnd / 60);
      const m = newEnd % 60;
      setEndTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const handleComplete = (id: string | number) => {
    updateTask(id, { status: 'completed' });
    toast(t(completionMessage()));
  };

  const handleSkip = (id: string | number) => {
    updateTask(id, { status: 'skipped' });
    toast(t('planner.skipped'));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">{t('planner.title')}</h1>

      {/* Add Task Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('planner.newBlock')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="block-name" className="text-xs">{t('planner.task')}</Label>
              <Input id="block-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('planner.taskPlaceholder')} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <Label className="text-xs">{t('planner.category')}</Label>
              <Select value={category} onValueChange={v => setCategory(v as TaskCategory)}>
                <SelectTrigger aria-label={t('planner.category')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(k => (
                    <SelectItem key={k} value={k}>{categoryLabel(k, locale)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('planner.start')}</Label>
              <Select value={startTime} onValueChange={handleStartChange}>
                <SelectTrigger className="font-mono text-sm" aria-label={t('planner.start')}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.filter(t => t !== '24:00').map(t => (
                    <SelectItem key={`s-${t}`} value={t} className="font-mono">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t('planner.end')}</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger aria-label={t('planner.end')} className={`font-mono text-sm ${!isTimeValid ? 'border-destructive text-destructive' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_OPTIONS.filter(t => timeToMinutes(t) > timeToMinutes(startTime)).map(t => (
                    <SelectItem key={`e-${t}`} value={t} className="font-mono">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isTimeValid && (
                <p className="text-[10px] text-destructive mt-0.5">{t('planner.mustBeAfterStart')}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">{t('planner.energy', { energy })}</Label>
              <div className="flex gap-1 h-10 items-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setEnergy(n)}
                    aria-label={t('planner.energyLevel', { n })}
                    aria-pressed={n === energy}
                    className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                      n <= energy ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleAdd} className="mt-3" size="sm" disabled={!name.trim() || !isTimeValid}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t('planner.addBlock')}
          </Button>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('planner.timeBlocks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {HOURS.map(hour => {
              const blocks = todayTasks.filter(t => {
                const h = parseInt(t.startTime.split(':')[0]);
                return h === hour;
              });
              return (
                <div key={hour} className="flex border-t min-h-[48px]">
                  <div className="w-16 shrink-0 py-2 text-xs text-muted-foreground font-mono">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 py-1 space-y-1">
                    {blocks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all ${
                          CATEGORY_COLORS[task.category]
                        } ${task.status === 'completed' ? 'opacity-60' : ''} ${task.status === 'skipped' ? 'opacity-30 line-through' : ''}`}
                      >
                        <span className="flex-1 font-medium">{task.name}</span>
                        <span className="text-[10px] font-mono">{task.startTime}–{task.endTime}</span>

                        {/* Distraction counter */}
                        {task.status === 'pending' && (
                          <div className="flex items-center gap-1 border-l pl-2 ml-1">
                            <button onClick={() => adjustDistractions(task.id, -1)} className="p-0.5 hover:bg-background/50 rounded" aria-label={t('planner.distractionLess')}>
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-mono w-4 text-center">{task.distractions}</span>
                            <button onClick={() => adjustDistractions(task.id, 1)} className="p-0.5 hover:bg-background/50 rounded" aria-label={t('planner.distractionMore')}>
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {task.status === 'pending' && (
                          <>
                            <button onClick={() => handleComplete(task.id)} className="p-1 hover:bg-background/50 rounded" title={t('planner.complete')} aria-label={t('planner.complete')}>
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            </button>
                            <button onClick={() => handleSkip(task.id)} className="p-1 hover:bg-background/50 rounded" title={t('planner.skip')} aria-label={t('planner.skip')}>
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-background/50 rounded" title={t('planner.delete')} aria-label={t('planner.delete')}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
