import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OrderRow = {
  id: string
  status: string
  total_amount: number | null
  created_at: string
}

export const RecentOrders: React.FC = () => {
  const [orders, setOrders] = React.useState<OrderRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const fetchOrders = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,total_amount,created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!mounted) return
      if (error) {
        setError('Failed to load recent orders')
        setOrders([])
      } else {
        setOrders((data as unknown as OrderRow[]) ?? [])
      }
      setLoading(false)
    }

    void fetchOrders();
    const channel = supabase
      .channel('recent-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void fetchOrders());
    channel.subscribe();

    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [])

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'delivered':
      case 'paid':
      case 'shipped':
        return 'default'
      case 'processing':
      case 'confirmed':
        return 'secondary'
      case 'cancelled':
      case 'refunded':
        return 'outline'
      case 'pending':
      case 'draft':
      default:
        return 'outline'
    }
  }

  const formatAmount = (val: number | null) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(val ?? 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Orders</CardTitle>
        <Button variant="ghost" size="icon" title="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No recent orders
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusVariant(order.status)} className="capitalize">
                    {order.status}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatAmount(order.total_amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
