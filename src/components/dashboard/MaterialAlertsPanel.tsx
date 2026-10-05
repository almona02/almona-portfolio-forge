import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { useAuth } from '@/context/AuthContext';
import { loadOwnedWorkshopInventory } from '@/lib/fabricator/inventory/ProfileInventoryAdapter';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import type { Profile } from '@/types/fabricator';
import { useQuery } from '@tanstack/react-query';

/**
 * UP-21: material alerts from owned workshop inventory — never legacy mock profiles.
 */
const MaterialAlertsPanel: React.FC = () => {
  const { user } = useAuth();
  const { data: profiles = [], isLoading, isError, error } = useQuery<Profile[]>({
    queryKey: ['command-material-alerts', user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user?.id) return [];
      const result = await loadOwnedWorkshopInventory({
        userId: user.id,
        syncFromMovements: false,
      });
      if (!result.ok) throw new Error(result.error);
      return result.profiles;
    },
  });

  const lowStockItems = useMemo(
    () =>
      profiles.filter(
        (p) =>
          typeof p.minStockLevel === 'number' &&
          Number.isFinite(p.minStockLevel) &&
          (p.stockQuantity ?? 0) <= p.minStockLevel,
      ),
    [profiles],
  );

  return (
    <Card className="bg-gray-900/70 border-gray-700 card-dark">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Material Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-gray-400">
        {!user?.id ? (
          <p className="text-slate-400">Sign in to load owned inventory alerts.</p>
        ) : isLoading ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading owned inventory…
          </p>
        ) : isError ? (
          <p className="text-red-300">
            Inventory unavailable: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        ) : profiles.length === 0 ? (
          <p className="text-amber-200/80">
            No owned profiles recorded. Configure stock before treating availability as known.
          </p>
        ) : lowStockItems.length === 0 ? (
          <p className="text-slate-300">
            Tracked owned profiles are above their minimum stock levels ({profiles.length} profiles).
          </p>
        ) : (
          <>
            <p>Some owned profiles are at or below minimum stock:</p>
            <div className="space-y-1">
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="truncate">{item.name}</span>
                  <span className="text-red-400 font-semibold">{item.stockQuantity ?? 0}m</span>
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <p className="text-[11px] text-gray-500">
                  +{lowStockItems.length - 3} more profiles below threshold
                </p>
              )}
            </div>
          </>
        )}
        <Link to={fabricatorRoutes.studioDataStock()}>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-yellow-500/40 text-yellow-300"
          >
            Open Stock
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default MaterialAlertsPanel;
