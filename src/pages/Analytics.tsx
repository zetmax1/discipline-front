import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCcw, Loader2 } from 'lucide-react';
import { fetchAnalytics, fetchFocusPatterns } from '@/lib/api';
import type { PatternsFound } from '@/contracts/analytics';
import { formatHours, formatScore, patternsMessage } from '@/lib/analytics-format';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function ChartImage({ image, alt, className }: { image: string; alt: string; className?: string }) {
  return <img src={`data:image/png;base64,${image}`} alt={alt} className={className} />;
}

export default function Analytics() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const days = range === 'week' ? 7 : 30;

  const report = useQuery({ queryKey: ['analytics', range], queryFn: () => fetchAnalytics(range) });
  const focus = useQuery({ queryKey: ['focus-patterns', days], queryFn: () => fetchFocusPatterns(days) });

  const loading = report.isFetching || focus.isFetching;
  const error = report.error ?? focus.error;

  if ((report.isLoading || focus.isLoading) && !report.data) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
        <p className="text-muted-foreground">Loading deep insights...</p>
      </div>
    );
  }

  if (error || !report.data || !focus.data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh] space-y-4">
        <p className="text-destructive font-medium">{error?.message || 'Failed to load analytics data'}</p>
        <Button onClick={() => { report.refetch(); focus.refetch(); }} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const r = report.data;
  const f = focus.data;
  const change = r.comparison.change;
  const patternsNote = patternsMessage(r.patterns);
  const insights = r.patterns.insufficient_data === false ? (r.patterns as PatternsFound).insights : [];

  // Daily series (null completion = nothing was due that day -> gap, not 0)
  const series = r.days.map(d => ({
    name: d.date.substring(5),
    completion: d.completion == null ? null : Math.round(d.completion * 100),
    deepHours: Math.round((d.deep_work_minutes / 60) * 10) / 10,
  }));

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics engine</h1>
        <div className="flex gap-2 items-center">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button size="sm" variant={range === 'week' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setRange('week')} disabled={loading}>
              This week
            </Button>
            <Button size="sm" variant={range === 'month' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setRange('month')} disabled={loading}>
              This month
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Focus score: mean of the daily scores that exist */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between rounded-xl bg-gradient-to-br from-card to-secondary/10">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Average focus score</p>
              <div className="flex items-end gap-3 mb-2">
                <p className="text-6xl font-black text-primary tracking-tighter" data-testid="period-focus-score">{formatScore(r.focus_score)}</p>
                {change != null && (
                  <div className="mb-2">
                    <Badge data-testid="score-change" variant={change > 0 ? 'default' : (change < 0 ? 'destructive' : 'secondary')} className="flex items-center gap-1 text-sm shadow-sm">
                      {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : (change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null)}
                      {change > 0 ? '+' : ''}{change}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Planned {formatHours(r.planned_minutes)} · Done {formatHours(r.completed_minutes)} · Deep work {formatHours(r.deep_work_minutes)}
              </p>
              <p className="text-sm text-muted-foreground">Streak: {r.streak} {r.streak === 1 ? 'day' : 'days'}</p>
            </div>
            <div className="hidden sm:block">
              <ChartImage image={r.charts.focus_gauge.image} alt="Focus Gauge" className="h-28 object-contain drop-shadow-sm mix-blend-multiply dark:mix-blend-screen" />
            </div>
          </CardContent>
        </Card>

        {/* Patterns over the last 30 days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
              Detected patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patternsNote ? (
              <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">{patternsNote}</p>
            ) : (
              <ul className="space-y-3">
                {insights.map((insight, idx) => (
                  <li key={idx} className="text-sm bg-muted/50 p-2.5 rounded-lg border border-border/50 text-foreground">
                    {insight}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Completion rate (daily)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="completion" name="Completion %" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Deep work hours (daily)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                <Bar dataKey="deepHours" name="Deep Work (h)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6">
        <h2 className="text-lg font-bold mb-4 tracking-tight">Advanced visualizations</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="overflow-hidden md:col-span-2">
            <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
              <CardTitle className="text-sm font-semibold">Focus heatmap ({f.start_date} – {f.end_date})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <ChartImage image={f.charts.focus_heatmap.image} alt="Focus Heatmap" className="w-full h-auto" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
              <CardTitle className="text-sm font-semibold">Time distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <ChartImage image={r.charts.category_distribution.image} alt="Category Distribution" className="w-full h-auto p-4" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
              <CardTitle className="text-sm font-semibold">Distraction trend</CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <ChartImage image={f.charts.distraction_trend.image} alt="Distraction Trend" className="w-full h-auto p-4" />
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
