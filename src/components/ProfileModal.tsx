import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPut, getUser, isAuthenticated, applyProfileResponse, type AuthUser } from '@/lib/api';
import { buildProfileUpdate } from '@/lib/profile-update';
import { MIN_PASSWORD_CHARS } from '@/lib/password-policy';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const DEFAULT_TIMEZONE = 'Asia/Tashkent';

// Browser-provided IANA zone list (empty if the browser can't list them).
const TIMEZONES: string[] =
  (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: Props) {
  const currentUser = getUser();
  const { t, locale, errorMessage } = useI18n();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [timezone, setTimezone] = useState(currentUser?.timezone ?? DEFAULT_TIMEZONE);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const u = getUser();
      setName(u?.name ?? '');
      setEmail(u?.email ?? '');
      setTimezone(u?.timezone ?? DEFAULT_TIMEZONE);
      setOldPassword('');
      setNewPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setError('');
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const { body, error: formError } = buildProfileUpdate(currentUser, { name, email, oldPassword, newPassword, timezone }, locale);
      if (formError || !body) {
        setError(formError ?? t('profile.updateFailed'));
        return;
      }

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await apiPut<{ user: AuthUser; token?: string }>('/me', body);
      applyProfileResponse(res);
      toast.success(t('profile.updated'));
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'profile.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('profile.title')}</DialogTitle>
          <DialogDescription>{t('profile.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-sm">{t('profile.name')}</Label>
            <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email" className="text-sm">{t('profile.email')}</Label>
            <Input id="profile-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-timezone" className="text-sm">{t('profile.timezone')}</Label>
            <Input
              id="profile-timezone"
              list="profile-timezones"
              value={timezone}
              onChange={e => setTimezone(e.target.value.trim())}
              placeholder={t('profile.timezonePlaceholder')}
            />
            <datalist id="profile-timezones">
              {TIMEZONES.map(tz => <option key={tz} value={tz} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">{t('profile.timezoneHint')}</p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t('profile.changePassword')}</p>
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-sm">{t('profile.currentPassword')}</Label>
              <div className="relative">
                <Input
                  id="old-password"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder={t('profile.currentPasswordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  aria-label={showOldPassword ? t('profile.hidePassword') : t('profile.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm">{t('profile.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('profile.newPasswordPlaceholder', { min: MIN_PASSWORD_CHARS })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? t('profile.hidePassword') : t('profile.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
