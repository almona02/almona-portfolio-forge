import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { loadOwnedWorkshopInventory } from '@/lib/fabricator/inventory/ProfileInventoryAdapter';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React from 'react';

/**
 * Canonical Studio stock surface — UP-09.
 * Loads owned fabricator_profiles independently of catalog codes.
 * Active pose systemPackId is an optional filter only (never a catalog substitute).
 */
export const StudioStockPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useFabricatorWorkspace();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['studio-owned-inventory', user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user?.id) {
        return { profiles: [], totalValue: 0, error: null as string | null };
      }
      // UP-09: owned stock independent of active pose (no catalog substitute).
      const result = await loadOwnedWorkshopInventory({
        userId: user.id,
        syncFromMovements: true,
      });
      return {
        profiles: result.profiles,
        totalValue: result.totalValue,
        error: result.ok ? null : result.error,
      };
    },
  });

  if (!user?.id) {
    return (
      <div className="h-full overflow-auto p-6" data-testid="studio-stock-page">
        <Alert>
          <AlertDescription>
            Sign in to load workshop stock. Catalog system packs are not workshop inventory.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center gap-2 text-amber-200/80"
        data-testid="studio-stock-page"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading owned workshop inventory…
      </div>
    );
  }

  const loadError = error instanceof Error ? error.message : data?.error;

  return (
    <div className="h-full overflow-auto" data-testid="studio-stock-page">
      {loadError ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      <InventoryDashboard
        inventory={data?.profiles ?? []}
        project={state.currentProject}
        userId={user.id}
      />
    </div>
  );
};

export default StudioStockPage;
