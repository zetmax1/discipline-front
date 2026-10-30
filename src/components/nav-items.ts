import { LayoutDashboard, CalendarDays, BarChart3, Sparkles, BookOpen } from 'lucide-react';
import type { TKey } from '@/i18n';

/** Main sections: `title` for the sidebar, `short` for the bottom navigation. */
export const NAV_ITEMS: { title: TKey; short: TKey; url: string; icon: typeof LayoutDashboard }[] = [
  { title: 'nav.dashboard', short: 'nav.short.dashboard', url: '/', icon: LayoutDashboard },
  { title: 'nav.planner', short: 'nav.short.planner', url: '/planner', icon: CalendarDays },
  { title: 'nav.analytics', short: 'nav.short.analytics', url: '/analytics', icon: BarChart3 },
  { title: 'nav.schedule', short: 'nav.short.schedule', url: '/schedule', icon: Sparkles },
  { title: 'nav.vocabulary', short: 'nav.short.vocabulary', url: '/vocabulary', icon: BookOpen },
];

