import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { checkInBlock, type BlockCheckinBody } from '@/lib/daily-api';
import { useI18n } from '@/i18n';

type Outcome = BlockCheckinBody['status'];

/** One tap done / partly / skip, then a skippable 1–5 focus rating (done and partly only). */
export function BlockCheckin({ blockId, compact = false }: { blockId: number | string; compact?: boolean }) {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<Outcome | null>(null);

  const send = async (body: BlockCheckinBody) => {
    try {
      const res = await checkInBlock(blockId, body);
      toast(res.queued ? t('sync.queued') : t('checkinBlock.saved'));
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(errorMessage(err, 'planner.saveFailed'));
    }
  };

  const choose = (status: Outcome) => {
    void send({ status });
    if (status !== 'skipped') setRating(status);
  };

  if (rating) {
    return (
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('checkinBlock.rateTitle')}>
        <span className="mr-1 text-xs text-muted-foreground">{t('checkinBlock.rateTitle')}</span>
        {[1, 2, 3, 4, 5].map(n => (
          <Button key={n} size="sm" variant="outline" className="h-8 w-8 p-0"
            aria-label={t('checkin.rate', { label: t('checkinBlock.rateTitle'), n })}
            onClick={() => { void send({ status: rating, focusRating: n }); setRating(null); }}>
            {n}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setRating(null)}>{t('checkinBlock.rateSkip')}</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1" role="group">
      <Button size="sm" variant="default" className={compact ? 'h-8 text-xs' : ''} onClick={() => choose('done')}>{t('checkinBlock.done')}</Button>
      <Button size="sm" variant="outline" className={compact ? 'h-8 text-xs' : ''} onClick={() => choose('partial')}>{t('checkinBlock.partial')}</Button>
      <Button size="sm" variant="ghost" className={compact ? 'h-8 text-xs' : ''} onClick={() => choose('skipped')}>{t('checkinBlock.skip')}</Button>
    </div>
  );
}
