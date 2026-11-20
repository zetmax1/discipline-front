/**
 * Contract for categories (F13): GET/POST /categories, PUT/DELETE /categories/:id.
 * A category is user-editable (name, colour, icon) with a fixed kind; metrics use the kind only.
 * The six defaults carry a systemKey; the UI shows `categories.<systemKey>` until the user renames
 * one (nameCustom). `contracts/categories.schema.json` is generated: run `npm run contract:update`.
 */
import { z } from 'zod/v4';

export const CATEGORY_KINDS = ['focus', 'study', 'admin', 'exercise', 'rest', 'personal'] as const;
export const CategoryKind = z.enum(CATEGORY_KINDS);
export type CategoryKind = z.infer<typeof CategoryKind>;

export const CATEGORY_ICONS = [
  'target', 'book-open', 'briefcase', 'dumbbell', 'coffee', 'user', 'graduation-cap', 'heart',
  'home', 'moon', 'music', 'palette', 'plane', 'shopping-cart', 'users', 'wrench',
] as const;
export const CategoryIcon = z.enum(CATEGORY_ICONS);
export type CategoryIcon = z.infer<typeof CategoryIcon>;

export const SYSTEM_KEYS = ['deep_work', 'study', 'admin', 'exercise', 'rest', 'personal'] as const;

export const Category = z.looseObject({
  id: z.number(),
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9A-F]{6}$/),
  icon: CategoryIcon,
  kind: CategoryKind,
  systemKey: z.string().nullable(),
  nameCustom: z.boolean(),
});
export type Category = z.infer<typeof Category>;

export const CategoryList = z.looseObject({ categories: z.array(Category) });
export const CategoryResponse = z.looseObject({ category: Category });

export function exportContract() {
  return {
    category: z.toJSONSchema(Category),
    category_list: z.toJSONSchema(CategoryList),
    category_response: z.toJSONSchema(CategoryResponse),
  };
}
