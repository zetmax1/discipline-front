import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/api';
import { flushQueue } from '@/lib/daily-api';
import { pending } from '@/lib/sync-queue';
import { useI18n } from '@/i18n';

/**
 * Sign out without losing work: when changes still wait in the offline queue, the user first
 * chooses "Sync now" (send them, then sign out) or "Discard" (sign out, which clears them).
 * Nothing queued is ever dropped silently. Render `signOutDialog` next to the button.
 */
export function useSignOut() {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);

  const signOut = () => {
    const waiting = pending().length;
    if (waiting === 0) {
      logout();
      return;
    }
    setCount(waiting);
    setStillWaiting(false);
    setOpen(true);
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const { sent, dropped } = await flushQueue();
      // A change the server refused is reported, as everywhere else the queue is sent.
      dropped.forEach(d => toast.error(t('sync.dropped', { reason: errorMessage(d.error, 'errors.internal_error') })));
      if (sent > 0 || dropped.length > 0) await queryClient.invalidateQueries();
      const left = pending().length;
      if (left === 0) {
        setOpen(false);
        logout();
        return;
      }
      setCount(left);
      setStillWaiting(true);
    } finally {
      setBusy(false);
    }
  };

  const signOutDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('signOut.pendingTitle', { count })}</AlertDialogTitle>
          <AlertDialogDescription>{t('signOut.pendingBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        {stillWaiting && <p role="status" className="text-sm text-muted-foreground">{t('signOut.stillWaiting')}</p>}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
          <Button variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => { setOpen(false); logout(); }}>
            {t('signOut.discard')}
          </Button>
          <Button className="min-h-[44px]" disabled={busy} onClick={() => void syncNow()}>
            {busy ? t('signOut.syncing') : t('signOut.syncNow')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { signOut, signOutDialog };
}
