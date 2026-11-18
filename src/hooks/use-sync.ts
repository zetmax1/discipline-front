import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { flushQueue } from '@/lib/daily-api';
import { onQueueChange, pending } from '@/lib/sync-queue';
import { useI18n } from '@/i18n';

/** Sends queued daily-loop changes at start and whenever the device comes back online. */
export function useSync(enabled: boolean) {
  const queryClient = useQueryClient();
  const { t, errorMessage } = useI18n();
  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { sent, dropped } = await flushQueue();
      dropped.forEach(d => toast.error(t('sync.dropped', { reason: errorMessage(d.error, 'errors.internal_error') })));
      if (sent > 0 || dropped.length > 0) await queryClient.invalidateQueries();
    };
    void run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [enabled, queryClient, t, errorMessage]);
}

/** How many changes wait to be sent. */
export function usePendingCount(): number {
  const [count, setCount] = useState(() => pending().length);
  useEffect(() => onQueueChange(() => setCount(pending().length)), []);
  return count;
}
