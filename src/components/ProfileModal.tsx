import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPut, getUser, setUser, isAuthenticated, type AuthUser } from '@/lib/api';
import { buildProfileUpdate } from '@/lib/profile-update';
import { PASSWORD_POLICY_HINT } from '@/lib/password-policy';
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
      const { body, error: formError } = buildProfileUpdate(currentUser, { name, email, oldPassword, newPassword, timezone });
      if (formError || !body) {
        setError(formError ?? 'Update failed');
        return;
      }

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await apiPut<{ user: AuthUser }>('/me', body);
      setUser(res.user);
      toast.success('Profile updated successfully');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your name, email, or password</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-sm">Name</Label>
            <Input id="profile-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email" className="text-sm">Email</Label>
            <Input id="profile-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-timezone" className="text-sm">Time zone</Label>
            <Input
              id="profile-timezone"
              list="profile-timezones"
              value={timezone}
              onChange={e => setTimezone(e.target.value.trim())}
              placeholder="e.g. Asia/Tashkent"
            />
            <datalist id="profile-timezones">
              {TIMEZONES.map(tz => <option key={tz} value={tz} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">Used to decide what "today" is for your blocks and analytics.</p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Change password</p>
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  id="old-password"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Required to change email or password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={`Leave empty to keep current · ${PASSWORD_POLICY_HINT.toLowerCase()}`}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
