import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppMenu } from './AppMenu';
import { BottomNav } from './BottomNav';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OfflineBanner } from './OfflineBanner';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { useI18n } from '@/i18n';
import { useFeature } from '@/hooks/use-features';
import { cn } from '@/lib/utils';

/**
 * App shell. With F12A on: bottom navigation and a settings sheet below 768 px, sidebar above,
 * and an offline banner. With F12A off: the sidebar everywhere, as before.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = useFeature('F12A');
  const { t } = useI18n();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className={cn(shell && 'hidden md:inline-flex')} />
            {shell && <span className="text-sm font-bold uppercase tracking-widest text-primary md:hidden">{t('common.appName')}</span>}
            {shell && (
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden md:flex md:items-center md:gap-2">
                  <LanguageSwitcher />
                  <ThemeSwitcher />
                </div>
                <div className="md:hidden">
                  <AppMenu />
                </div>
              </div>
            )}
          </header>
          {shell && <OfflineBanner />}
          <div className={cn('flex-1 p-6 overflow-auto', shell && 'p-4 pb-24 md:p-6')}>
            {children}
          </div>
        </main>
      </div>
      {shell && <BottomNav />}
    </SidebarProvider>
  );
}
