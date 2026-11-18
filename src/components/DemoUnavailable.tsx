import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n';

/** Shown instead of pages that need the server when the app runs in local demo mode. */
export function DemoUnavailable({ feature }: { feature: string }) {
  const { t } = useI18n();
  return (
    <Card className="max-w-lg">
      <CardContent className="p-6 space-y-2">
        <p className="font-semibold">{t('demo.unavailableTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('demo.unavailableBody', { feature })}</p>
      </CardContent>
    </Card>
  );
}
