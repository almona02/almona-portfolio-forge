import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
} from 'chart.js'
import { supabase } from '@/lib/supabase'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
)

type OrderRow = { total_amount: number | null; created_at: string; status: string }

export const SalesChart: React.FC = () => {
  const [labels, setLabels] = React.useState<string[]>([])
  const [series, setSeries] = React.useState<number[]>([])
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
        setLabels([])
        setSeries([])
        setLoading(false)
        return
      }

      const points: Record<string, number> = {}
      const days: string[] = []
      for (let i = 0; i < 30; i++) {
        const d = new Date(since)
        d.setDate(since.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        days.push(key)
        points[key] = 0
      }

      ;(data as OrderRow[] | null)?.forEach((row) => {
        const key = new Date(row.created_at).toISOString().slice(0, 10)
        if (key in points) points[key] += row.total_amount ?? 0
      })

      setLabels(days)
      setSeries(days.map((d) => points[d]))
      setLoading(false)
    }
    fetchData()

    const channel = supabase
      .channel('sales-chart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe()
    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [])

  const data = {
    labels,
    datasets: [
      {
        label: 'Revenue (EGP)',
        data: series,
        fill: true,
        backgroundColor: 'rgba(255, 119, 0, 0.12)',
        borderColor: 'rgba(255, 119, 0, 1)',
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 6,
          callback: (_value: unknown, idx: number) => labels[idx]?.slice(5), // show MM-DD
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (value: number | string) =>
            new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(
              Number(value as number)
            ),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(Number(ctx.parsed.y)),
        },
      },
    },
  } as const

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
            <Line data={data} options={options} height={224} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
