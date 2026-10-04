import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { resolveSystemPackProfiles } from '@/lib/fabricator/engineering/resolveSystemPackProfiles';
import type { Profile } from '@/types/fabricator';
import React, { useMemo } from 'react';

/**
 * Canonical Studio stock surface. Reuses InventoryDashboard — no new inventory logic.
 * FP-028: resolve catalog profiles (e.g. ROCK 60) + custom packs; never invent codes.
 */
export const StudioStockPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useFabricatorWorkspace();

  const inventory = useMemo(() => {
    const packId = state.currentProject?.systemPackId;
    const custom = loadCustomSystems();
    const packs = [
      ...SYSTEM_PACKS,
      ...custom,
    ];

    const byId = new Map<string, Profile>();
    const addProfiles = (list: Profile[]) => {
      for (const profile of list) {
        if (!byId.has(profile.id)) byId.set(profile.id, profile);
      }
    };

    if (packId) {
      const pack = packs.find((p) => p.meta.id === packId);
      addProfiles(resolveSystemPackProfiles(pack));
    } else {
      // No active pose pack — show all resolvable catalog + custom profiles
      for (const pack of packs) {
        addProfiles(resolveSystemPackProfiles(pack));
      }
    }

    return Array.from(byId.values());
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
