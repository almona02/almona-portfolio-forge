import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

type Row = { id: string; sku: string; name_en: string; stock_quantity: number; min_stock_level: number }

export const LowStockAlerts: React.FC = () => {
  const [items, setItems] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('products')
        .select('id,sku,name_en,stock_quantity,min_stock_level')
        .gt('stock_quantity', 0)
        .lte('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })
        .limit(8)
      if (!mounted) return
      if (error) {
        setError('Failed to load low stock items')
        setItems([])
      } else {
        setItems((data as Row[]) ?? [])
      }
      setLoading(false)
    }
    load()
    const ch = supabase
      .channel('low-stock-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load())
      .subscribe()
    return () => { mounted = false; ch.unsubscribe() }
  }, [])

  return (
    <Card className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-white/20 shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader>
        <CardTitle>Low Stock Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">All stock levels healthy</div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <div className="truncate pr-2" title={`${p.sku} — ${p.name_en}`}>
                  <span className="text-sm font-medium">{p.sku}</span>
                  <span className="text-sm text-muted-foreground"> — {p.name_en}</span>
                </div>
                <Badge variant={p.stock_quantity <= (p.min_stock_level || 0) ? 'outline' : 'secondary'}>
                  {p.stock_quantity}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default LowStockAlerts
