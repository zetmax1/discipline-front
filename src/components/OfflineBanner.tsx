import { WifiOff } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useOnline } from '@/hooks/use-online';

/** A calm note under the top bar while the device is offline. */
export function OfflineBanner() {
  const { t } = useI18n();
  if (useOnline()) return null;
  return (
    <div role="status" className="flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm text-foreground">
      <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{t('shell.offline')}</span>
    </div>
  );
}
