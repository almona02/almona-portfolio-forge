import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type ProfileRow = { id: string; full_name: string | null; email: string | null; created_at: string }
type OrderRow = { id: string; created_at: string }

export const CustomerActivity: React.FC = () => {
  const [items, setItems] = React.useState<Array<{ label: string; time: string }>>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    const fetchActivity = async () => {
      setLoading(true)
      setError(null)

      const [profilesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('id,created_at').order('created_at', { ascending: false }).limit(5),
      ])

      if (!mounted) return

  const pErr = 'error' in profilesRes ? profilesRes.error : null
  const oErr = 'error' in ordersRes ? ordersRes.error : null
      if (pErr || oErr) {
        setError('Failed to load activity')
        setItems([])
        setLoading(false)
        return
      }

      const profileItems = ((profilesRes.data as ProfileRow[]) || []).map((p) => ({
        label: `${p.full_name || p.email || 'New user'} • Registered`,
        time: new Date(p.created_at).toLocaleString(),
      }))
      const orderItems = ((ordersRes.data as OrderRow[]) || []).map((o) => ({
        label: `${o.id} • Placed an order`,
        time: new Date(o.created_at).toLocaleString(),
      }))

      const combined = [...profileItems, ...orderItems].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      )

      setItems(combined.slice(0, 8))
      setLoading(false)
    }

    void fetchActivity();
    const channel = supabase
      .channel('customer-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void fetchActivity())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void fetchActivity());
    channel.subscribe();

    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [])

  return (
    <Card className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-white/20 shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader>
        <CardTitle>Customer Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <ul className="space-y-3">
            {items.map((a, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate pr-2" title={a.label}>{a.label}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
