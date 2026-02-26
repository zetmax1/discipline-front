import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, CheckCircle2, Brain, Clock, Flame, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/use-tasks';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { MICRO_MESSAGES } from '@/lib/static-data';
import { CATEGORY_LABELS, CATEGORY_COLORS, type TaskCategory } from '@/lib/types';
import { toast } from 'sonner';
import { COMPLETION_MESSAGES } from '@/lib/static-data';

function getTimeDiffHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

export default function Dashboard() {
  const { todayTasks, updateTask } = useTasks();
  const { todayWords, toggleLearned } = useVocabulary();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % MICRO_MESSAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = todayTasks.length;
    const done = todayTasks.filter(t => t.status === 'completed').length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;

    const deepWorkTasks = todayTasks.filter(t => t.category === 'deep-work');
    const deepWorkHours = deepWorkTasks.reduce((acc, t) => acc + getTimeDiffHours(t.startTime, t.endTime), 0);
    const totalHours = todayTasks.reduce((acc, t) => acc + getTimeDiffHours(t.startTime, t.endTime), 0);
    const totalDistractions = todayTasks.reduce((acc, t) => acc + t.distractions, 0);

    const deepRatio = totalHours > 0 ? deepWorkHours / totalHours : 0;
    const distractionPenalty = Math.min(totalDistractions * 5, 40);
    const focusScore = Math.max(0, Math.round(deepRatio * 100 - distractionPenalty));

    return { total, done, completion, deepWorkHours: deepWorkHours.toFixed(1), totalHours: totalHours.toFixed(1), focusScore };
  }, [todayTasks]);

  const summaryCards = [
    { label: 'Today', value: format(new Date(), 'EEE, MMM d'), icon: Calendar },
    { label: 'Completion', value: `${stats.completion}%`, icon: CheckCircle2 },
    { label: 'Focus Score', value: `${stats.focusScore}`, icon: Brain },
    { label: 'Total Hours', value: stats.totalHours, icon: Clock },
    { label: 'Deep Work', value: `${stats.deepWorkHours}h`, icon: Flame },
  ];

  const handleComplete = (id: string) => {
    updateTask(id, { status: 'completed' });
    toast(COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)]);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 italic">{MICRO_MESSAGES[messageIndex]}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summaryCards.map(card => (
          <Card key={card.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <card.icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
              </div>
              <p className="text-xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todayTasks.length === 0 && <p className="text-sm text-muted-foreground">No blocks scheduled.</p>}
            {todayTasks.map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-md border text-sm transition-opacity ${
                  task.status === 'completed' ? 'opacity-60' : ''
                } ${task.status === 'skipped' ? 'opacity-30' : ''}`}
              >
                <span className="text-xs text-muted-foreground font-mono w-24 shrink-0">
                  {task.startTime} – {task.endTime}
                </span>
                <div className={`w-1 h-8 rounded-full`} style={{ backgroundColor: `hsl(var(--category-${task.category}))` }} />
                <span className={`flex-1 ${task.status === 'completed' ? 'line-through' : ''}`}>{task.name}</span>
                <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[task.category]}</Badge>
                {task.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-accent" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Task List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Tasks ({stats.done}/{stats.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayTasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => {
                      if (task.status !== 'completed') handleComplete(task.id);
                      else updateTask(task.id, { status: 'pending' });
                    }}
                  />
                  <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[task.category]}</Badge>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vocabulary Widget */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Today's Words</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {todayWords.length === 0 && <p className="text-sm text-muted-foreground">No words for today.</p>}
            <div className="space-y-3">
              {todayWords.map(word => (
                <div key={word.id} className="p-3 rounded-md border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{word.word}</span>
                    <Badge variant="outline" className="text-[10px]">{word.language === 'russian' ? 'RU' : 'EN'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{word.definition}</p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant={word.learned ? 'secondary' : 'outline'}
                      className="text-xs h-7"
                      onClick={() => toggleLearned(word.id)}
                    >
                      {word.learned ? 'Learned' : 'Mark learned'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
