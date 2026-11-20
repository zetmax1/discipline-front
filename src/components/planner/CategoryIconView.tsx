import {
  BookOpen, Briefcase, Coffee, Dumbbell, GraduationCap, Heart, Home, Moon, Music, Palette, Plane, ShoppingCart,
  Target, User, Users, Wrench, type LucideIcon,
} from 'lucide-react';
import type { CategoryIcon } from '@/contracts/categories';

const CATEGORY_ICON_COMPONENTS: Record<CategoryIcon, LucideIcon> = {
  target: Target, 'book-open': BookOpen, briefcase: Briefcase, dumbbell: Dumbbell, coffee: Coffee, user: User,
  'graduation-cap': GraduationCap, heart: Heart, home: Home, moon: Moon, music: Music, palette: Palette,
  plane: Plane, 'shopping-cart': ShoppingCart, users: Users, wrench: Wrench,
};

/** A category's icon (decorative: the category name is always next to it). */
export function CategoryIconView({ icon, className }: { icon: CategoryIcon; className?: string }) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon] ?? Target;
  return <Icon className={className} aria-hidden="true" />;
}
