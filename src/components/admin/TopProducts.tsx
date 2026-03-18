import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type OrderItemRow = { product_name_en: string | null; quantity: number | null; created_at: string }

export const TopProducts: React.FC = () => {
  const [items, setItems] = React.useState<Array<{ name: string; sales: number }>>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const fetchTop = async () => {
      setLoading(true)
      setError(null)
      const since = new Date()
      since.setDate(since.getDate() - 30)
      since.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('order_items')
        .select('product_name_en,quantity,created_at')
        .gte('created_at', since.toISOString())

      if (!mounted) return
      if (error) {
        setError('Failed to load top products')
        setItems([])
        setLoading(false)
        return
      }

      const map: Record<string, number> = {}
      ;(data as OrderItemRow[] | null)?.forEach((r) => {
        const name = (r.product_name_en || 'Unknown').trim()
        const qty = Number(r.quantity ?? 0)
        map[name] = (map[name] || 0) + qty
      })

      const top = Object.entries(map)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)

      setItems(top)
      setLoading(false)
    }

    void fetchTop();
    const channel = supabase
      .channel('top-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => void fetchTop());
    channel.subscribe();

    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [])

  return (
    <Card className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-white/20 shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">No sales in this period</div>
        ) : (
          <ul className="space-y-3">
            {items.map((p, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate pr-2" title={p.name}>{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.sales} sold</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
