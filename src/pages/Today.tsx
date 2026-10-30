import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoUnavailable } from '@/components/DemoUnavailable';
import { CheckinCard } from '@/components/daily/CheckinCard';
import { FocusPanel } from '@/components/daily/FocusPanel';
import { BlockCheckin } from '@/components/daily/BlockCheckin';
import { ShutdownCard, SHUTDOWN_PROMPT_MIN } from '@/components/daily/ShutdownCard';
import { SyncStatus } from '@/components/daily/SyncStatus';
import { useTasks } from '@/hooks/use-tasks';
import { useSync } from '@/hooks/use-sync';
import { fetchCheckinToday, fetchSessions, fetchShutdown } from '@/lib/daily-api';
import { isDemoOnly } from '@/lib/api';
import { isOpen, minutesOf } from '@/lib/blocks';
import { localDateString } from '@/lib/dates';
import type { Task } from '@/lib/types';
import { useI18n } from '@/i18n';

const startOf = (b: Task) => b.startMin ?? minutesOf(b.startTime);
const endOf = (b: Task) => b.endMin ?? minutesOf(b.endTime);

function useMinuteOfDay(): number {
  const now = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [m, setM] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setM(now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return m;
}

/** Today (F1, replaces the Dashboard): check-in → now/next block with focus → timeline → shutdown. */
export default function Today() {
  const { t } = useI18n();
  if (isDemoOnly()) return <DemoUnavailable feature={t('today.title')} />;
  return <TodayContent />;
}

function TodayContent() {
  const { t, formatDate, errorMessage } = useI18n();
  useSync(true);
  const today = localDateString();
  const nowMin = useMinuteOfDay();
  const checkin = useQuery({ queryKey: ['checkin', 'today'], queryFn: fetchCheckinToday });
  const sessions = useQuery({ queryKey: ['sessions', today], queryFn: () => fetchSessions(today) });
  const shutdown = useQuery({ queryKey: ['shutdown', 'today'], queryFn: fetchShutdown });
  const { todayTasks, isLoading } = useTasks();

  if ((checkin.isLoading || isLoading) && !checkin.data) {
    return (
      <div className="flex h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />{t('today.loading')}
      </div>
    );
  }
  if (checkin.error && !checkin.data) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-medium text-destructive">{t('today.error')}</p>
        <p className="text-sm text-muted-foreground">{errorMessage(checkin.error, 'today.error')}</p>
        <Button variant="outline" onClick={() => { void checkin.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" aria-hidden />{t('common.retry')}</Button>
      </div>
    );
  }

  const blocks = [...todayTasks].sort((a, b) => startOf(a) - startOf(b));
  const open = blocks.filter(b => isOpen(b.status));
  const current = open.find(b => startOf(b) <= nowMin && nowMin < endOf(b)) ?? null;
  const next = open.find(b => startOf(b) > nowMin) ?? null;
  const focusBlock = current ?? next;
  const completedToday = sessions.data?.sessions.filter(s => s.outcome === 'completed').length ?? 0;
  const unfinished = open.filter(b => endOf(b) <= nowMin || nowMin >= SHUTDOWN_PROMPT_MIN);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('today.title')}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>
      <SyncStatus />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          {checkin.data && !checkin.data.checkin && <CheckinCard defaults={checkin.data.defaults} />}
          <Card>
            <CardContent className="space-y-3 p-5">
              {focusBlock ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{current ? t('today.now') : t('today.next')}</p>
                  <p className="text-lg font-semibold">{focusBlock.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{focusBlock.startTime}–{focusBlock.endTime}</p>
                  {current && <BlockCheckin blockId={current.id} />}
                </div>
              ) : blocks.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{t('today.empty.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('today.empty.body')}</p>
                  <Button asChild variant="outline"><Link to="/planner">{t('today.empty.plan')}</Link></Button>
                  <p className="pt-2 text-xs text-muted-foreground">{t('today.freeSession')}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('today.nothingLeft')}</p>
              )}
              <FocusPanel block={focusBlock ? { id: Number(focusBlock.id), name: focusBlock.name } : null} completedToday={completedToday} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {blocks.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t('today.timeline')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {blocks.map(b => (
                  <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{b.startTime}–{b.endTime}</span>
                    <span className="min-w-[6rem] flex-1">{b.name}</span>
                    <Badge variant={b.status === 'done' ? 'default' : 'outline'} className="text-[10px]">{t(`status.${b.status}`)}</Badge>
                    {isOpen(b.status) && endOf(b) <= nowMin && <BlockCheckin blockId={b.id} compact />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <ShutdownCard unfinished={unfinished} closed={shutdown.data?.shutdown ?? null}
            show={nowMin >= SHUTDOWN_PROMPT_MIN || (blocks.length > 0 && open.length === 0)} />
        </div>
      </div>
    </div>
  );
}
