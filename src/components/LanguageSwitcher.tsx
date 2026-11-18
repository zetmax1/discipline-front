import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n';
import { LOCALES, LOCALE_NAMES, isLocale } from '@/i18n/locales';
import { cn } from '@/lib/utils';

/** Language picker (native select: keyboard and phone friendly). Shown only while F12A is on. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, switchable, t } = useI18n();
  if (!switchable) return null;
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <select
        aria-label={t('menu.language')}
        value={locale}
        onChange={e => isLocale(e.target.value) && setLocale(e.target.value)}
        className="h-11 min-w-[44px] appearance-none rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {LOCALES.map(l => (
          <option key={l} value={l} lang={l}>{LOCALE_NAMES[l]}</option>
        ))}
      </select>
    </div>
  );
}
