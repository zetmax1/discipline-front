import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Brain, Clock, Flame, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/hooks/use-tasks';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useQuote } from '@/hooks/use-quote';
import { toast } from 'sonner';
import { completionMessage } from '@/lib/static-data';
import { isStoredWord } from '@/lib/vocabulary';
import { fetchToday, isAuthenticated } from '@/lib/api';
import { formatHours, formatPercent, formatScore } from '@/lib/analytics-format';
import { categoryLabel } from '@/lib/smart-schedule';
import { useI18n } from '@/i18n';

export default function Dashboard() {
  const { todayTasks, updateTask } = useTasks();
  const { todayWords, toggleLearned } = useVocabulary();
  const { quote, author } = useQuote();
  const { t, locale, formatDate } = useI18n();

  // Today's metrics come from the analytics service (the single metrics module).
  const loggedIn = isAuthenticated();
  const { data: today, error: todayError } = useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: fetchToday,
    enabled: loggedIn,
  });

  const done = todayTasks.filter(t => t.status === 'completed').length;
  const total = todayTasks.length;
  const unavailable = !loggedIn ? t('dashboard.demoUnavailable') : todayError ? t('dashboard.metricsError') : null;
  const pct = (r: number | null | undefined) => formatPercent(r, locale);
  const hours = (m: number) => formatHours(m, locale);

  const summaryCards = [
    { label: t('dashboard.today'), value: formatDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' }), icon: Calendar },
    {
      label: t('dashboard.focusScore'), testId: 'focus-score', value: formatScore(today?.focus_score), icon: Brain,
      sub: today
        ? t('dashboard.breakdown', { completion: pct(today.completion), deep: pct(today.deep), distraction: pct(today.distraction) })
        : unavailable,
      subTestId: 'focus-breakdown',
    },
    { label: t('dashboard.planned'), testId: 'planned', value: today ? hours(today.planned_minutes) : '—', icon: Clock },
    { label: t('dashboard.done'), testId: 'done', value: today ? hours(today.completed_minutes) : '—', icon: CheckCircle2 },
    {
      label: t('dashboard.deepWork'), value: today ? hours(today.deep_work_minutes) : '—', icon: Flame,
      sub: today ? t('dashboard.ofTarget', { target: hours(today.daily_deep_work_target_minutes) }) : null,
    },
  ];

  const handleComplete = (id: string | number) => {
    updateTask(id, { status: 'completed' });
    toast(t(completionMessage()));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1 italic">
          {quote}{author ? ` — ${author}` : ''}
        </p>
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
              <p className="text-xl font-bold" data-testid={card.testId}>{card.value}</p>
              {card.sub && <p className="text-[11px] text-muted-foreground mt-1" data-testid={card.subTestId}>{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('dashboard.schedule')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todayTasks.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.noBlocks')}</p>}
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
                <Badge variant="outline" className="text-[10px]">{categoryLabel(task.category, locale)}</Badge>
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
            <CardTitle className="text-base font-semibold">{t('dashboard.tasks', { done, total })}</CardTitle>
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
                  <Badge variant="secondary" className="text-[10px]">{categoryLabel(task.category, locale)}</Badge>
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
              <CardTitle className="text-base font-semibold">{t('dashboard.words')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {todayWords.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.noWords')}</p>}
            <div className="space-y-3">
              {todayWords.map(word => (
                <div key={`${word.language}-${word.id}`} className="p-3 rounded-md border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{word.word}</span>
                    <Badge variant="outline" className="text-[10px]">{t(word.language === 'russian' ? 'vocabulary.langShort.russian' : 'vocabulary.langShort.english')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{word.definition}</p>
                  {isStoredWord(word) && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant={word.learned ? 'secondary' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => toggleLearned(word.id)}
                      >
                        {word.learned ? t('vocabulary.learned') : t('vocabulary.markLearned')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
