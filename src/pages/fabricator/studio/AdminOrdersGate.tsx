/**
 * UP-17 — Admin-only bulk orders panel gate for /fabricator/studio/production/orders.
 * Non-admins are redirected to the owner-scoped Orders workspace.
 */

import { OrdersPanel } from '@/components/admin/panels/OrdersPanel';
import { OrderManagement } from '@/components/fabricator/orders/OrderManagement';
import { useAuth } from '@/context/AuthContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

export const AdminOrdersGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <OrdersPanel />;
  }

  return (
    <div className="p-6 space-y-4" data-testid="admin-orders-gate-blocked">
      <Alert className="border-amber-600/40 bg-amber-500/5">
        <ShieldAlert className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-200">Admin orders only</AlertTitle>
        <AlertDescription className="text-amber-100/80 text-sm space-y-3">
          <p>
            Bulk payment and status tools are restricted to administrators. Your workshop orders
            live in the owner-scoped Orders list.
          </p>
          <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
            <Link to={fabricatorRoutes.studioOrders()}>Go to my Orders</Link>
          </Button>
        </AlertDescription>
      </Alert>
      {/* Still show owner list so the route is not a dead end */}
      <OrderManagement />
    </div>
  );
};

export default AdminOrdersGate;
