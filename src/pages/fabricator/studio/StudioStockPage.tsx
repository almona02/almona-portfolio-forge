import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import React, { useMemo } from 'react';

/**
 * Canonical Studio stock surface. Reuses InventoryDashboard — no new inventory logic.
 */
export const StudioStockPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useFabricatorWorkspace();
  const inventory = useMemo(() => {
    const packId = state.currentProject?.systemPackId;
    if (!packId) return [];
    return SYSTEM_PACKS.find((p) => p.meta.id === packId)?.profiles ?? [];
  }, [state.currentProject?.systemPackId]);

  return (
    <div className="h-full overflow-auto" data-testid="studio-stock-page">
      <InventoryDashboard
        inventory={inventory}
        project={state.currentProject}
        userId={user?.id}
      />
    </div>
  );
};

export default StudioStockPage;
