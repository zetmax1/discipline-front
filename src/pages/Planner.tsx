import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { CATEGORY_LABELS, CATEGORY_COLORS, type TaskCategory } from '@/lib/types';
import { toast } from 'sonner';
import { COMPLETION_MESSAGES } from '@/lib/static-data';

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6-24

export default function Planner() {
  const { todayTasks, addTask, updateTask, deleteTask } = useTasks();
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<TaskCategory>('deep-work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [energy, setEnergy] = useState(3);

  const handleAdd = () => {
    if (!name.trim()) return;
    addTask({ name: name.trim(), category, startTime, endTime, energy, date: today });
    setName('');
    toast('Block added.');
  };

  const handleComplete = (id: string) => {
    updateTask(id, { status: 'completed' });
    toast(COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]);
  };

  const handleSkip = (id: string) => {
    updateTask(id, { status: 'skipped' });
    toast('Block skipped.');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Daily Planner</h1>

      {/* Add Task Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">New Block</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <Label className="text-xs">Task</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Task name" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Energy ({energy})</Label>
              <div className="flex gap-1 h-10 items-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setEnergy(n)}
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
          <Button onClick={handleAdd} className="mt-3" size="sm" disabled={!name.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Block
          </Button>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Time Blocks</CardTitle>
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
                            <button onClick={() => updateTask(task.id, { distractions: Math.max(0, task.distractions - 1) })} className="p-0.5 hover:bg-background/50 rounded">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-mono w-4 text-center">{task.distractions}</span>
                            <button onClick={() => updateTask(task.id, { distractions: task.distractions + 1 })} className="p-0.5 hover:bg-background/50 rounded">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {task.status === 'pending' && (
                          <>
                            <button onClick={() => handleComplete(task.id)} className="p-1 hover:bg-background/50 rounded" title="Complete">
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            </button>
                            <button onClick={() => handleSkip(task.id)} className="p-1 hover:bg-background/50 rounded" title="Skip">
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-background/50 rounded" title="Delete">
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
