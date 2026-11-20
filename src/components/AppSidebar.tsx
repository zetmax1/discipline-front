import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, LogIn } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { ProfileModal } from '@/components/ProfileModal';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { isAuthenticated, isDemoMode, getUser } from '@/lib/api';
import { useSignOut } from '@/hooks/use-sign-out';
import { useI18n } from '@/i18n';
import { NAV_ITEMS } from '@/components/nav-items';

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const [profileOpen, setProfileOpen] = useState(false);
  const loggedIn = isAuthenticated();
  const demoMode = isDemoMode();
  const user = getUser();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signOut, signOutDialog } = useSignOut();

  // Close sidebar on mobile after clicking a nav item
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent className="pt-4">
          {!collapsed && (
            <div className="px-6 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{t('common.appName')}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('common.appTagline')}</p>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center pb-4">
              <span className="text-sm font-bold text-primary">{t('common.appName').charAt(0)}</span>
            </div>
          )}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">{t('nav.navigation')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={t(item.title)}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        onClick={handleNavClick}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.title)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User section at bottom */}
          <div className="mt-auto border-t px-3 py-3 space-y-1">
            {loggedIn ? (
              <>
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{user?.name || t('nav.user')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
                    </div>
                  )}
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {!collapsed && <span>{t('nav.signOut')}</span>}
                </button>
              </>
            ) : demoMode ? (
              <>
                {!collapsed && (
                  <p className="px-3 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{t('nav.demoMode')}</p>
                )}
                <button
                  onClick={() => {
                    handleNavClick();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  {!collapsed && <span>{t('nav.signInUp')}</span>}
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {!collapsed && <span>{t('nav.exitDemo')}</span>}
                </button>
              </>
            ) : null}
          </div>
        </SidebarContent>
      </Sidebar>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {signOutDialog}
    </>
  );
}
