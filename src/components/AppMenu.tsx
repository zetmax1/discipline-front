import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ProfileModal } from '@/components/ProfileModal';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { useI18n } from '@/i18n';
import { getUser, isAuthenticated, isDemoMode, logout } from '@/lib/api';

/** Phone settings sheet: language, theme, profile and sign out (the sidebar holds these on desktop). */
export function AppMenu() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const loggedIn = isAuthenticated();
  const user = getUser();

  return (
    <>
      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('menu.open')} onClick={() => setOpen(true)}>
        <Settings className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>{t('menu.open')}</SheetTitle>
            <SheetDescription className="sr-only">{t('menu.open')}</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3">
            <LanguageSwitcher className="w-full [&>select]:w-full" />
            <ThemeSwitcher className="w-full [&>select]:w-full" />
          </div>
          {loggedIn ? (
            <div className="space-y-2">
              <Button variant="outline" className="h-11 w-full justify-start" onClick={() => { setOpen(false); setProfileOpen(true); }}>
                <User className="mr-2 h-4 w-4" />
                <span className="truncate">{user?.name || t('menu.profile')}</span>
              </Button>
              <Button variant="ghost" className="h-11 w-full justify-start text-muted-foreground" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.signOut')}
              </Button>
            </div>
          ) : isDemoMode() ? (
            <div className="space-y-2">
              <Button className="h-11 w-full justify-start" onClick={() => { setOpen(false); navigate('/login'); }}>
                <LogIn className="mr-2 h-4 w-4" />
                {t('nav.signInUp')}
              </Button>
              <Button variant="ghost" className="h-11 w-full justify-start text-muted-foreground" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.exitDemo')}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
