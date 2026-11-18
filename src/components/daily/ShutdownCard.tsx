import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Moon } from 'lucide-react';
import { addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkInBlock, closeDay, moveBlock } from '@/lib/daily-api';
import { localDateString } from '@/lib/dates';
import type { Shutdown } from '@/contracts/daily';
import type { Task } from '@/lib/types';
import { useI18n } from '@/i18n';

/** Device default until Settings exists: offer the shutdown from 21:00. */
export const SHUTDOWN_PROMPT_MIN = 21 * 60;

/** Evening shutdown: unfinished blocks → tomorrow or drop, one win, close the day. */
export function ShutdownCard({ unfinished, closed, show }: { unfinished: Task[]; closed: Shutdown | null; show: boolean }) {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [win, setWin] = useState('');
  const [busy, setBusy] = useState(false);

  if (closed) {
    return (
      <Card>
        <CardContent className="space-y-1 p-5">
          <p className="flex items-center gap-2 font-medium"><Moon className="h-4 w-4 text-primary" aria-hidden />{t('shutdown.closed')}</p>
          {closed.win && <p className="text-sm text-muted-foreground">{t('shutdown.closedWin', { win: closed.win })}</p>}
        </CardContent>
      </Card>
    );
  }
  if (!show && !open) return null;

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    queryClient.invalidateQueries({ queryKey: ['shutdown'] }),
  ]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, 'planner.saveFailed'));
    } finally {
      setBusy(false);
    }
  };
  const tomorrow = localDateString(addDays(new Date(), 1));

  if (!open) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="flex items-center gap-2 font-medium"><Moon className="h-4 w-4 text-primary" aria-hidden />{t('shutdown.prompt')}</p>
            <p className="text-sm text-muted-foreground">{t('shutdown.promptBody')}</p>
          </div>
          <Button onClick={() => setOpen(true)}>{t('shutdown.open')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{t('shutdown.title')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('shutdown.unfinished')}</p>
          {unfinished.length === 0 && <p className="text-sm text-muted-foreground">{t('shutdown.allDone')}</p>}
          {unfinished.map(b => (
            <div key={b.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
              <span className="flex-1 min-w-[8rem]">{b.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{b.startTime}–{b.endTime}</span>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => act(() => moveBlock(b.id, { date: tomorrow, startMin: b.startMin ?? 0, endMin: b.endMin ?? 0 }))}>
                {t('shutdown.tomorrow')}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => checkInBlock(b.id, { status: 'skipped' }))}>
                {t('shutdown.drop')}
              </Button>
            </div>
          ))}
        </div>
        <div>
          <Label htmlFor="shutdown-win" className="text-xs">{t('shutdown.win')}</Label>
          <Input id="shutdown-win" value={win} maxLength={280} placeholder={t('shutdown.winPlaceholder')} onChange={e => setWin(e.target.value)} />
        </div>
        <Button disabled={busy} onClick={() => act(async () => {
          const res = await closeDay(win.trim());
          toast(res.queued ? t('sync.queued') : t('shutdown.closed'));
          if ('result' in res) queryClient.setQueryData(['shutdown', 'today'], { date: res.result.shutdown.date, shutdown: res.result.shutdown });
        })}>
          {t('shutdown.open')}
        </Button>
      </CardContent>
    </Card>
  );
}
