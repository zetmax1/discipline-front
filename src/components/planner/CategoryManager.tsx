import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CATEGORY_ICONS, CATEGORY_KINDS, type Category, type CategoryIcon, type CategoryKind } from '@/contracts/categories';
import { ApiError } from '@/lib/api';
import { createCategory, deleteCategory, updateCategory } from '@/lib/planner-api';
import { categoryLabel } from '@/lib/planner';
import { useI18n, type TKey } from '@/i18n';
import { CategoryIconView } from './CategoryIconView';

const SWATCHES = ['#3B82F6', '#8B5CF6', '#6B7280', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#14B8A6'];
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Draft { id?: number; name: string; color: string; icon: CategoryIcon; kind: CategoryKind; system: boolean }

interface Props {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onChanged: (message: TKey) => void;
}

/** Categories: rename/recolour any, add your own with a kind, delete your own (moving its blocks first). */
export function CategoryManager({ open, categories, onClose, onChanged }: Props) {
  const { t, errorMessage } = useI18n();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [inUse, setInUse] = useState(false);
  const [reassign, setReassign] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const edit = (c?: Category) => {
    setError('');
    setInUse(false);
    setReassign('');
    setDraft(c
      ? { id: c.id, name: categoryLabel(c, t), color: c.color, icon: c.icon, kind: c.kind, system: c.systemKey != null }
      : { name: '', color: SWATCHES[0], icon: 'target', kind: 'focus', system: false });
  };

  const run = async (action: () => Promise<TKey>) => {
    setBusy(true);
    setError('');
    try {
      onChanged(await action());
      setDraft(null);
    } catch (err) {
      if (err instanceof ApiError && err.body.code === 'category_in_use') setInUse(true);
      else setError(errorMessage(err, 'planner.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    if (!draft) return 'categories.saved';
    const original = categories.find(c => c.id === draft.id);
    if (draft.id && original) {
      const renamed = draft.name.trim() !== categoryLabel(original, t);
      await updateCategory(draft.id, { color: draft.color, icon: draft.icon, ...(renamed ? { name: draft.name.trim() } : {}) });
    } else {
      await createCategory({ name: draft.name.trim(), color: draft.color, icon: draft.icon, kind: draft.kind });
    }
    return 'categories.saved';
  });

  const remove = (reassignTo?: number) => run(async () => {
    await deleteCategory(draft!.id!, reassignTo);
    return 'categories.deleted';
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setDraft(null); onClose(); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft ? (draft.id ? t('categories.edit', { name: draft.name }) : t('categories.new')) : t('categories.title')}</DialogTitle>
          <DialogDescription>{t('categories.defaultHint')}</DialogDescription>
        </DialogHeader>
        {!draft && (
          <div className="space-y-1">
            <ul className="divide-y rounded-md border">
              {categories.map(c => (
                <li key={c.id}>
                  <button type="button" onClick={() => edit(c)}
                    className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                    <CategoryIconView icon={c.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{categoryLabel(c, t)}</span>
                    <span className="text-xs text-muted-foreground">{t(`categories.kinds.${c.kind}` as TKey)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button className="mt-2 w-full" onClick={() => edit()}>{t('categories.new')}</Button>
          </div>
        )}
        {draft && (
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (draft.name.trim() && !busy) void save(); }}>
            <div>
              <Label htmlFor="cat-name">{t('categories.name')}</Label>
              <Input id="cat-name" value={draft.name} maxLength={64} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <fieldset>
              <legend className="text-sm font-medium">{t('categories.color')}</legend>
              <div className="mt-1 flex flex-wrap gap-1">
                {SWATCHES.map(color => (
                  <button key={color} type="button" aria-pressed={draft.color === color} aria-label={t('categories.colorOption', { color })}
                    className={`h-11 w-11 rounded-full border-2 ${draft.color === color ? 'border-foreground' : 'border-transparent'}`}
                    onClick={() => setDraft({ ...draft, color })}>
                    <span className="mx-auto block h-7 w-7 rounded-full" style={{ backgroundColor: color }} />
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="cat-icon">{t('categories.icon')}</Label>
              <select id="cat-icon" className={selectClass} value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value as CategoryIcon })}>
                {CATEGORY_ICONS.map(i => <option key={i} value={i}>{t(`categories.icons.${i}` as TKey)}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="cat-kind">{t('categories.kind')}</Label>
              <select id="cat-kind" className={selectClass} value={draft.kind} disabled={!!draft.id}
                onChange={e => setDraft({ ...draft, kind: e.target.value as CategoryKind })}>
                {CATEGORY_KINDS.map(k => <option key={k} value={k}>{t(`categories.kinds.${k}` as TKey)}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{t('categories.kindHint')}</p>
            </div>
            {inUse && (
              <div className="space-y-2 rounded-md border p-3">
                <Label htmlFor="cat-reassign">{t('categories.deleteInUse')}</Label>
                <select id="cat-reassign" className={selectClass} value={reassign} onChange={e => setReassign(Number(e.target.value))}>
                  <option value="">{t('categories.reassignTo')}</option>
                  {categories.filter(c => c.id !== draft.id).map(c => <option key={c.id} value={c.id}>{categoryLabel(c, t)}</option>)}
                </select>
                <Button type="button" variant="secondary" disabled={reassign === '' || busy} onClick={() => remove(Number(reassign))}>
                  {t('categories.reassignAndDelete')}
                </Button>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap justify-between gap-2">
              {draft.id && !draft.system && !inUse
                ? <Button type="button" variant="ghost" disabled={busy} onClick={() => remove()}>{t('categories.delete')}</Button>
                : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={!draft.name.trim() || busy}>{t('common.save')}</Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
