import type { OrderStatus } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { formatCurrency } from '@/lib/i18n/formatters';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OrderRow {
  id: string;
  user_id: string;
  quote_id: string | null;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  total_amount: number;
  currency: string;
  payment_status: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: <FileText size={12} /> },
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: <Clock size={12} /> },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: <CheckCircle2 size={12} /> },
  paid: { label: 'Paid', color: 'bg-green-500/20 text-green-300 border-green-500/40', icon: <CheckCircle2 size={12} /> },
  processing: { label: 'In Production', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: <Package size={12} /> },
  shipped: { label: 'Shipped', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: <Truck size={12} /> },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: <CheckCircle2 size={12} /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-300 border-red-500/40', icon: <XCircle size={12} /> },
  refunded: { label: 'Refunded', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: <XCircle size={12} /> },
};

const TIMELINE_STEPS: OrderStatus[] = ['draft', 'pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered'];

export const OrderManagement: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as OrderRow[]) || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      toast.success(`Order status updated to ${STATUS_CONFIG[newStatus].label}`);
      void loadOrders();
    } catch (err) {
      toast.error('Failed to update order status');
      console.error(err);
    }
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total Orders" value={orders.length} />
        <KPI label="Active" value={orders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(o.status)).length} />
        <KPI label="Revenue" value={formatCurrency(orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0), 'en', 'EGP')} />
        <KPI label="Delivered" value={orders.filter(o => o.status === 'delivered').length} />
      </div>

      {/* Orders List */}
      <Card className="bg-slate-900/40 border-amber-600/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
            <Package size={16} />
            Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet.</p>
              <p className="text-xs text-slate-600 mt-1">Convert a quote to an order from the Commercial workspace.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                const isExpanded = selectedOrder === order.id;

                return (
                  <div key={order.id} className="border border-slate-800/50 rounded-lg overflow-hidden">
                    {/* Order row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 cursor-pointer"
                      onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-amber-300 font-mono text-xs">
                          {order.id.substring(0, 8).toUpperCase()}
                        </div>
                        <Badge className={`${cfg.color} text-[10px] flex items-center gap-1`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-amber-200 font-bold text-sm">
                          {formatCurrency(order.total_amount, 'en', order.currency || 'EGP')}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <ChevronRight size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/50 px-4 py-4 bg-slate-900/30 space-y-4">
                        {/* Timeline */}
                        <OrderTimeline currentStatus={order.status} />

                        {/* Cost breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <div className="bg-slate-800/30 rounded p-2">
                            <span className="text-slate-500">Subtotal</span>
                            <p className="text-amber-200 font-mono">{formatCurrency(order.subtotal, 'en', order.currency)}</p>
                          </div>
                          <div className="bg-slate-800/30 rounded p-2">
                            <span className="text-slate-500">Tax</span>
                            <p className="text-amber-200 font-mono">{formatCurrency(order.tax_amount, 'en', order.currency)}</p>
                          </div>
                          <div className="bg-slate-800/30 rounded p-2">
                            <span className="text-slate-500">Discount</span>
                            <p className="text-green-300 font-mono">-{formatCurrency(order.discount_amount, 'en', order.currency)}</p>
                          </div>
                          <div className="bg-slate-800/30 rounded p-2">
                            <span className="text-slate-500">Shipping</span>
                            <p className="text-amber-200 font-mono">{formatCurrency(order.shipping_cost, 'en', order.currency)}</p>
                          </div>
                          <div className="bg-amber-500/10 rounded p-2 border border-amber-500/30">
                            <span className="text-amber-500">Total</span>
                            <p className="text-amber-300 font-bold font-mono">{formatCurrency(order.total_amount, 'en', order.currency)}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {order.status === 'draft' && (
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'pending')}>
                              Submit Order
                            </Button>
                          )}
                          {order.status === 'pending' && (
                            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'confirmed')}>
                              Confirm
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'paid')}>
                              Mark Paid
                            </Button>
                          )}
                          {order.status === 'paid' && (
                            <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'processing')}>
                              Start Production
                            </Button>
                          )}
                          {order.status === 'processing' && (
                            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'shipped')}>
                              Mark Shipped
                            </Button>
                          )}
                          {order.status === 'shipped' && (
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs" onClick={() => void handleUpdateStatus(order.id, 'delivered')}>
                              Mark Delivered
                            </Button>
                          )}
                          {!['delivered', 'cancelled', 'refunded'].includes(order.status) && (
                            <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 text-xs" onClick={() => void handleUpdateStatus(order.id, 'cancelled')}>
                              Cancel
                            </Button>
                          )}
                        </div>

                        {/* Notes */}
                        {order.customer_notes && (
                          <p className="text-xs text-slate-500"><span className="text-slate-400">Notes:</span> {order.customer_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const OrderTimeline: React.FC<{ currentStatus: OrderStatus }> = ({ currentStatus }) => {
  const currentIdx = TIMELINE_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'refunded';

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-1">
      {TIMELINE_STEPS.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div className={`h-px w-6 flex-shrink-0 ${isPast ? 'bg-green-500/60' : 'bg-slate-700/40'}`} />
            )}
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] whitespace-nowrap flex-shrink-0 ${
              isCancelled ? 'opacity-30' :
              isCurrent ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40' :
              isPast ? 'text-green-400/70' : 'text-slate-600'
            }`}>
              {isPast ? <CheckCircle2 size={10} className="text-green-500" /> : cfg.icon}
              {cfg.label}
            </div>
          </React.Fragment>
        );
      })}
      {isCancelled && (
        <>
          <div className="h-px w-6 flex-shrink-0 bg-red-500/40" />
          <div className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-red-500/15 text-red-300 border border-red-500/40 whitespace-nowrap flex-shrink-0">
            <XCircle size={10} /> {STATUS_CONFIG[currentStatus].label}
          </div>
        </>
      )}
    </div>
  );
};

const KPI: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Card className="bg-slate-900/40 border-amber-600/20">
    <CardContent className="pt-3 pb-2 px-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-lg font-bold text-amber-200 mt-0.5">{value}</p>
    </CardContent>
  </Card>
);
