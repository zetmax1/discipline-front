import { Moon, Sun, SunMoon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const THEMES = ['light', 'dark', 'system'] as const;
const ICONS = { light: Sun, dark: Moon, system: SunMoon };

/** Theme picker (native select). Shown only while F12A is on. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { t, switchable } = useI18n();
  const { theme = 'system', setTheme } = useTheme();
  if (!switchable) return null;
  const current = (THEMES as readonly string[]).includes(theme) ? (theme as (typeof THEMES)[number]) : 'system';
  const Icon = ICONS[current];
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <Icon className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
      <select
        aria-label={t('menu.theme')}
        value={current}
        onChange={e => setTheme(e.target.value)}
        className="h-11 min-w-[44px] appearance-none rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {THEMES.map(v => (
          <option key={v} value={v}>{t(`menu.theme.${v}`)}</option>
        ))}
      </select>
    </div>
  );
}
