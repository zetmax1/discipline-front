import { NavLink } from '@/components/NavLink';
import { NAV_ITEMS } from '@/components/nav-items';
import { useI18n } from '@/i18n';

/** Main navigation for phones (below 768 px); the sidebar takes over above that. */
export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {NAV_ITEMS.map(item => (
          <li key={item.url} className="min-w-0 flex-1">
            <NavLink
              to={item.url}
              end={item.url === '/'}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] text-muted-foreground transition-colors"
              activeClassName="text-primary font-semibold"
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate">{t(item.short)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
