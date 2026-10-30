import { CloudOff } from 'lucide-react';
import { usePendingCount } from '@/hooks/use-sync';
import { useI18n } from '@/i18n';

/** "N changes waiting to sync" while the queue is not empty. */
export function SyncStatus() {
  const { t } = useI18n();
  const count = usePendingCount();
  if (count === 0) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <CloudOff className="h-4 w-4" aria-hidden />
      {t('sync.pending', { count })}
    </p>
  );
}
