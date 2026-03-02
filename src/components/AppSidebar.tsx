import { useState } from 'react';
import { LayoutDashboard, CalendarDays, BarChart3, Sparkles, BookOpen, User, LogOut } from 'lucide-react';
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
import { isAuthenticated, getUser, logout } from '@/lib/api';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Daily Planner', url: '/planner', icon: CalendarDays },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Smart Schedule', url: '/schedule', icon: Sparkles },
  { title: 'Vocabulary', url: '/vocabulary', icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [profileOpen, setProfileOpen] = useState(false);
  const loggedIn = isAuthenticated();
  const user = getUser();

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent className="pt-4">
          {!collapsed && (
            <div className="px-6 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Discipline</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tracker</p>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center pb-4">
              <span className="text-sm font-bold text-primary">D</span>
            </div>
          )}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User section at bottom */}
          {loggedIn && (
            <div className="mt-auto border-t px-3 py-3 space-y-1">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
                  </div>
                )}
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>
          )}
        </SidebarContent>
      </Sidebar>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
