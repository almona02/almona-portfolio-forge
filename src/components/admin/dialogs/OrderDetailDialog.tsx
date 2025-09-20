import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Database, OrderStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { table } from '@/lib/data/clientCore'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row']

interface OrderDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onUpdated?: (patch: Partial<Order>) => void
}

export const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({ open, onOpenChange, order, onUpdated }) => {
  const [items, setItems] = React.useState<OrderItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<OrderStatus | ''>('')
  const [payment, setPayment] = React.useState<string>('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      if (!order) return
      setLoading(true)
      setStatus(order.status)
      setPayment(order.payment_status)
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('created_at', { ascending: true })
      if (!error) setItems((data as OrderItem[]) ?? [])
      setLoading(false)
    }
    load()
  }, [order])

  const totalFmt = (n: number) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(n)

  const handleSave = async () => {
    if (!order) return
    setSaving(true)
    const patch: Database['public']['Tables']['orders']['Update'] = {
      status: (status || order.status) as OrderStatus,
      payment_status: payment || order.payment_status,
    }
    type EqClient = { update: (v: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
    const { error } = await (table('orders') as unknown as EqClient)
      .update(patch)
      .eq('id', order.id)
    setSaving(false)
    if (!error) {
      onUpdated?.(patch)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>View order items and update status/payment.</DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-4 py-1">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Order ID</div>
                <div className="font-medium break-all">{order.id}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-medium">{new Date(order.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="font-medium">{totalFmt(order.total_amount)}</div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status || ''} onValueChange={(v: string) => setStatus(v as OrderStatus)}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select value={payment} onValueChange={(v: string) => setPayment(v)}>
                  <SelectTrigger><SelectValue placeholder="Select payment status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="font-medium mb-2">Items</div>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 gap-2 text-sm p-2 font-medium bg-muted/50">
                  <div className="col-span-2">Product</div>
                  <div>Qty</div>
                  <div>Unit</div>
                  <div>Total</div>
                </div>
                <div className="max-h-48 overflow-auto">
                  {loading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading…</div>
                  ) : items.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No items</div>
                  ) : (
                    items.map((it) => (
                      <div key={it.id} className="grid grid-cols-5 gap-2 text-sm p-2 border-t">
                        <div className="col-span-2 truncate" title={it.product_name_en}>{it.product_name_en}</div>
                        <div>{it.quantity}</div>
                        <div>{totalFmt(it.unit_price)}</div>
                        <div>{totalFmt(it.total_price)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          <Button onClick={handleSave} disabled={saving || !order}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrderDetailDialog
