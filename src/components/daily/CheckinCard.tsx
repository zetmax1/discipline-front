import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveCheckin } from '@/lib/daily-api';
import { clock, minutesOf } from '@/lib/blocks';
import { useI18n, type TKey } from '@/i18n';

function RatingRow({ labelKey, value, onChange }: { labelKey: TKey; value: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1 text-xs font-medium">{t(labelKey)}</p>
      <div className="flex gap-1" role="radiogroup" aria-label={t(labelKey)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={n === value}
            aria-label={t('checkin.rate', { label: t(labelKey), n })} onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
              n <= value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Morning check-in (≈10 s with the prefilled sleep times): sleep, sleep quality, energy, optional note. */
export function CheckinCard({ defaults }: { defaults: { sleepStartMin: number; sleepEndMin: number } }) {
  const { t, errorMessage } = useI18n();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(clock(defaults.sleepStartMin));
  const [to, setTo] = useState(clock(defaults.sleepEndMin));
  const [quality, setQuality] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (skipped: boolean) => {
    setSaving(true);
    try {
      const res = await saveCheckin(skipped ? { skipped: true } : {
        sleepStartMin: minutesOf(from) % 1440, sleepEndMin: minutesOf(to), sleepQuality: quality, energy,
        note: note.trim() || undefined,
      });
      if (res.queued) toast(t('sync.queued'));
      else if (!skipped) toast(t('checkin.saved'));
      // Hide the card now, also when the save is still waiting to sync.
      const saved = 'result' in res ? res.result.checkin : { skipped };
      queryClient.setQueryData(['checkin', 'today'], (old: unknown) =>
        old && typeof old === 'object' ? { ...old, checkin: saved } : old);
    } catch (err) {
      toast.error(errorMessage(err, 'errors.checkin_invalid'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Sun className="h-4 w-4 text-primary" aria-hidden />{t('checkin.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('checkin.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sleep-from" className="text-xs">{t('checkin.sleepFrom')}</Label>
            <Input id="sleep-from" type="time" step={300} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sleep-to" className="text-xs">{t('checkin.sleepTo')}</Label>
            <Input id="sleep-to" type="time" step={300} value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <RatingRow labelKey="checkin.sleepQuality" value={quality} onChange={setQuality} />
        <RatingRow labelKey="checkin.energy" value={energy} onChange={setEnergy} />
        <div>
          <Label htmlFor="checkin-note" className="text-xs">{t('checkin.note')}</Label>
          <Input id="checkin-note" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit(false)} disabled={saving || !from || !to || from === to}>{t('checkin.save')}</Button>
          <Button variant="ghost" onClick={() => submit(true)} disabled={saving}>{t('checkin.skip')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
