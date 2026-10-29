import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCcw, Loader2 } from 'lucide-react';
import { fetchAnalytics, fetchFocusPatterns } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function Analytics() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [analytics, setAnalytics] = useState<any>(null);
  const [focusPatterns, setFocusPatterns] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [range]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const days = range === 'week' ? 7 : 30;
      
      const [analyticsRes, focusRes] = await Promise.all([
        fetchAnalytics(range),
        fetchFocusPatterns(days)
      ]);

      setAnalytics(analyticsRes);
      setFocusPatterns(focusRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
        <p className="text-muted-foreground">Loading deep insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh] space-y-4">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Map Python data to Recharts format
  const isWeek = range === 'week';
  const breakdownData = isWeek 
    ? (analytics?.report?.daily_breakdown || [])
    : (analytics?.analysis?.weekly_breakdown || analytics?.report?.weekly_breakdown || []);
  
  const completionData = breakdownData.map((d: any) => {
    const name = isWeek 
      ? d.date?.substring(5) 
      : (d.start_date ? d.start_date.substring(5) : `W${d.week}`);
    return { name: name || 'N/A', rate: d.completion_rate };
  });

  const deepWorkData = breakdownData.map((d: any) => {
    const name = isWeek 
      ? d.date?.substring(5) 
      : (d.start_date ? d.start_date.substring(5) : `W${d.week}`);
    return { name: name || 'N/A', hours: d.deep_work_hours };
  });

  const freqData = focusPatterns?.data?.productivity_by_weekday || [];
  const productivityByDay = freqData.map((d: any) => ({
    day: d.day,
    score: d.avg_focus_score
  }));

  // Overall metrics
  const metrics = analytics?.analysis?.metrics || analytics?.report?.metrics || {};
  const focusScore = metrics.focus_score || 0;
  
  // Trend comparison
  const comparison = analytics?.report?.comparison || {};
  const scoreTrend = comparison.focus_score_diff || 0;

  // Render Base64 encoded charts from Python
  const pythonCharts = { ...analytics?.charts, ...focusPatterns?.charts };

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
        {/* Focus Score (Discipline Index) */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between rounded-xl bg-gradient-to-br from-card to-secondary/10">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Composite focus score</p>
              <div className="flex items-end gap-3 mb-2">
                <p className="text-6xl font-black text-primary tracking-tighter">{focusScore}</p>
                <div className="mb-2">
                  <Badge variant={scoreTrend > 0 ? "default" : (scoreTrend < 0 ? "destructive" : "secondary")} className="flex items-center gap-1 text-sm shadow-sm">
                    {scoreTrend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : (scoreTrend < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null)}
                    {scoreTrend > 0 ? '+' : ''}{scoreTrend}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Based on completion, deep work, and distractions.</p>
            </div>
            
            {/* Show Python generated Gauge if available */}
            {pythonCharts.focus_gauge && (
              <div className="hidden sm:block">
                <img src={`data:image/png;base64,${pythonCharts.focus_gauge}`} alt="Focus Gauge" className="h-28 object-contain drop-shadow-sm mix-blend-multiply dark:mix-blend-screen" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Python AI Insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse"></span>
              AI detected patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {focusPatterns?.data?.insights && focusPatterns.data.insights.length > 0 ? (
               <ul className="space-y-3">
                 {focusPatterns.data.insights.slice(0, 3).map((insight: string, idx: number) => (
                   <li key={idx} className="text-sm bg-muted/50 p-2.5 rounded-lg border border-border/50 text-foreground">
                     {insight}
                   </li>
                 ))}
               </ul>
            ) : (
               <p className="text-sm text-muted-foreground italic h-full flex items-center justify-center">
                 Not enough data points yet to detect meaningful patterns. Keep logging blocks!
               </p>
            )}
          </CardContent>
        </Card>

        {/* Completion Trend (Recharts) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Completion rate ({isWeek ? 'Daily' : 'Weekly'})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="rate" name="Completion Rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deep Work Hours (Recharts) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Deep work hours ({isWeek ? 'Daily' : 'Weekly'})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deepWorkData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                <Bar dataKey="hours" name="Deep Work (h)" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Python Rendered Visualizations Section */}
      <div className="pt-6">
        <h2 className="text-lg font-bold mb-4 tracking-tight">Advanced visualizations</h2>
        <div className="grid md:grid-cols-2 gap-4">
          
          {pythonCharts.focus_heatmap && (
            <Card className="overflow-hidden md:col-span-2">
              <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
                <CardTitle className="text-sm font-semibold">Focus heatmap intensity</CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <img src={`data:image/png;base64,${pythonCharts.focus_heatmap}`} alt="Focus Heatmap" className="w-full h-auto" />
              </CardContent>
            </Card>
          )}

          {pythonCharts.category_distribution && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
                <CardTitle className="text-sm font-semibold">Time distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <img src={`data:image/png;base64,${pythonCharts.category_distribution}`} alt="Category Distribution" className="w-full h-auto p-4" />
              </CardContent>
            </Card>
          )}

          {pythonCharts.distraction_trend && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-4 bg-muted/20">
                <CardTitle className="text-sm font-semibold">Distraction trend</CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <img src={`data:image/png;base64,${pythonCharts.distraction_trend}`} alt="Distraction Trend" className="w-full h-auto p-4" />
              </CardContent>
            </Card>
          )}
          
        </div>
      </div>
      
    </div>
  );
}
