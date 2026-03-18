import React, { lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Lazy load chart components to reduce bundle size
const LazyAreaChart = lazy(() => import('recharts').then(module => ({
  default: module.AreaChart
})));
const LazyArea = lazy(() => import('recharts').then(module => ({
  default: module.Area
})));
const LazyCartesianGrid = lazy(() => import('recharts').then(module => ({
  default: module.CartesianGrid
})));
const LazyXAxis = lazy(() => import('recharts').then(module => ({
  default: module.XAxis
})));
const LazyYAxis = lazy(() => import('recharts').then(module => ({
  default: module.YAxis
})));
const LazyChartContainer = lazy(() => import('@/shared/ui/ui/chart').then(module => ({
  default: module.ChartContainer
})));
const LazyChartTooltip = lazy(() => import('@/shared/ui/ui/chart').then(module => ({
  default: module.ChartTooltip
})));
const LazyChartTooltipContent = lazy(() => import('@/shared/ui/ui/chart').then(module => ({
  default: module.ChartTooltipContent
})));

import { supabase } from '@/lib/supabase'

type OrderRow = { total_amount: number | null; created_at: string; status: string }

export const SalesChart: React.FC = () => {
  const [points, setPoints] = React.useState<Array<{ date: string; label: string; revenue: number }>>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const since = new Date()
      since.setDate(since.getDate() - 29) // include today -> 30 points
      since.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount,created_at,status')
        .gte('created_at', since.toISOString())
        .eq('status', 'delivered')
        .order('created_at', { ascending: true })

      if (!mounted) return
      if (error) {
        setError('Failed to load sales data')
        setPoints([])
        setLoading(false)
        return
      }

      const map: Record<string, number> = {}
      const rows = (data as OrderRow[]) || []
      // Initialize 30-day window with zeros
      const days: Array<{ date: string; label: string }> = []
      for (let i = 0; i < 30; i++) {
        const d = new Date(since)
        d.setDate(since.getDate() + i)
        const iso = d.toISOString().slice(0, 10)
        const label = iso.slice(5) // MM-DD
        days.push({ date: iso, label })
        map[iso] = 0
      }
      rows.forEach((r) => {
        const key = new Date(r.created_at).toISOString().slice(0, 10)
        if (key in map) map[key] += r.total_amount ?? 0
      })
      setPoints(days.map((d) => ({ ...d, revenue: map[d.date] })))
      setLoading(false)
    }
    void fetchData();
    const channel = supabase
      .channel('sales-chart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void fetchData());
    channel.subscribe()
    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [])

  const fmtEGP = (n: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

  return (
    <Card className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-white/20 shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader>
        <CardTitle>Sales (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="h-56 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="h-56">
            <Suspense fallback={<div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading chart...</div>}>
              <LazyChartContainer
                config={{ revenue: { label: 'Revenue (EGP)', color: 'var(--almona-orange, #FF5F1F)' } }}
                className="h-56"
              >
                <LazyAreaChart data={points} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5F1F" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#FF5F1F" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <LazyCartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <LazyXAxis dataKey="label" tickMargin={6} minTickGap={16} tickLine={false} axisLine={false} />
                  <LazyYAxis tickFormatter={(v) => fmtEGP(Number(v))} width={72} axisLine={false} tickLine={false} />
                  <LazyChartTooltip cursor={{ stroke: 'rgba(0,0,0,0.1)' }} content={<LazyChartTooltipContent />} />
                  <LazyArea type="monotone" dataKey="revenue" stroke="#FF5F1F" strokeWidth={2} fill="url(#revFill)" />
                </LazyAreaChart>
              </LazyChartContainer>
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
