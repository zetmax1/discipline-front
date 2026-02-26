import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { Commitment, WeeklyGoals, ScheduleBlock } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function generateSchedule(commitments: Commitment[], goals: WeeklyGoals): { blocks: ScheduleBlock[], reasoning: string[] } {
  const blocks: ScheduleBlock[] = [];
  const reasoning: string[] = [];
  const dailyDeepWork = goals.deepWorkHours / 5;
  const dailyStudy = goals.studyHours / 5;

  DAYS.forEach((day, di) => {
    const dayCommitments = commitments.filter(c => c.days.includes(day));
    const occupied = dayCommitments.map(c => ({ start: parseInt(c.startTime), end: parseInt(c.endTime) }));

    // Add fixed commitments
    dayCommitments.forEach(c => {
      blocks.push({ id: `${day}-${c.id}`, name: c.name, category: 'fixed', startTime: c.startTime, endTime: c.endTime, day });
    });

    const isOccupied = (hour: number) => occupied.some(o => hour >= o.start && hour < o.end);

    // Place deep work in morning (7-12)
    let deepPlaced = 0;
    for (let h = 7; h <= 11 && deepPlaced < dailyDeepWork; h++) {
      if (!isOccupied(h)) {
        blocks.push({ id: `${day}-dw-${h}`, name: 'Deep Work', category: 'deep-work', startTime: `${String(h).padStart(2, '0')}:00`, endTime: `${String(h + 1).padStart(2, '0')}:00`, day });
        occupied.push({ start: h, end: h + 1 });
        deepPlaced++;
      }
    }
    if (deepPlaced > 0) reasoning.push(`${day}: Deep work placed at morning — focus is highest.`);

    // Place study in afternoon (13-17)
    let studyPlaced = 0;
    for (let h = 13; h <= 16 && studyPlaced < dailyStudy; h++) {
      if (!isOccupied(h)) {
        blocks.push({ id: `${day}-st-${h}`, name: 'Study', category: 'study', startTime: `${String(h).padStart(2, '0')}:00`, endTime: `${String(h + 1).padStart(2, '0')}:00`, day });
        occupied.push({ start: h, end: h + 1 });
        studyPlaced++;
      }
    }

    // Rest block
    if (di < 5) {
      for (let h = 19; h <= 20; h++) {
        if (!isOccupied(h)) {
          blocks.push({ id: `${day}-rest-${h}`, name: 'Rest', category: 'rest', startTime: `${String(h).padStart(2, '0')}:00`, endTime: `${String(h + 1).padStart(2, '0')}:00`, day });
          break;
        }
      }
    }
  });

  if (reasoning.length === 0) reasoning.push('Schedule generated based on your commitments and goals.');
  return { blocks, reasoning };
}

export default function SmartSchedule() {
  const [commitments, setCommitments] = useState<Commitment[]>([
    { id: '1', name: 'Sleep', startTime: '23:00', endTime: '07:00', days: DAYS },
    { id: '2', name: 'University', startTime: '10:00', endTime: '13:00', days: ['Monday', 'Wednesday', 'Friday'] },
    { id: '3', name: 'Gym', startTime: '17:00', endTime: '18:30', days: ['Monday', 'Wednesday', 'Friday'] },
  ]);
  const [goals, setGoals] = useState<WeeklyGoals>({ deepWorkHours: 15, studyHours: 10, restHours: 7 });
  const [result, setResult] = useState<{ blocks: ScheduleBlock[], reasoning: string[] } | null>(null);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [selectedDay, setSelectedDay] = useState('Monday');

  const addCommitment = () => {
    if (!newName.trim()) return;
    setCommitments(prev => [...prev, { id: crypto.randomUUID(), name: newName, startTime: newStart, endTime: newEnd, days: [selectedDay] }]);
    setNewName('');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Smart Schedule</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Commitments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Fixed Commitments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commitments.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-xs font-mono text-muted-foreground">{c.startTime}–{c.endTime}</span>
                <button onClick={() => setCommitments(prev => prev.filter(x => x.id !== c.id))} className="p-1 hover:bg-secondary rounded">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-4 gap-2 items-end pt-2 border-t">
              <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
              <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="text-sm" />
              <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-sm" />
              <Button size="sm" onClick={addCommitment} disabled={!newName.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly Goals (hours)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Deep Work</Label>
              <Input type="number" value={goals.deepWorkHours} onChange={e => setGoals(g => ({ ...g, deepWorkHours: +e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Study</Label>
              <Input type="number" value={goals.studyHours} onChange={e => setGoals(g => ({ ...g, studyHours: +e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Rest</Label>
              <Input type="number" value={goals.restHours} onChange={e => setGoals(g => ({ ...g, restHours: +e.target.value }))} />
            </div>
            <Button onClick={() => setResult(generateSchedule(commitments, goals))} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" /> Generate Schedule
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Reasoning</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {result.reasoning.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground italic">"{r}"</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {DAYS.map(day => {
            const dayBlocks = result.blocks.filter(b => b.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (dayBlocks.length === 0) return null;
            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{day}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {dayBlocks.map(block => (
                      <div key={block.id} className={`flex items-center gap-3 px-3 py-2 rounded border text-sm ${CATEGORY_COLORS[block.category]}`}>
                        <span className="font-mono text-xs w-24">{block.startTime}–{block.endTime}</span>
                        <span className="font-medium">{block.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
