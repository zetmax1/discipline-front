import { LayoutDashboard, CalendarDays, BarChart3, Sparkles, BookOpen } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
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

  return (
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
      </SidebarContent>
    </Sidebar>
  );
}
