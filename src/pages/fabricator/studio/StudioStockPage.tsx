import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { bomStockDemand } from '@/lib/fabricator/inventory/bomStockDemand';
import { loadOwnedWorkshopInventory } from '@/lib/fabricator/inventory/ProfileInventoryAdapter';
import { isQualifiedBOM } from '@/lib/fabricator/bom/bomQualification';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { toast } from 'sonner';

/**
 * Canonical Studio stock surface — UP-09 / UP-10.
 * Loads owned fabricator_profiles independently of catalog codes.
 * Soft revision-bound availability acknowledgement (no stock deduction).
 */
export const StudioStockPage: React.FC = () => {
  const { user } = useAuth();
  const { state } = useFabricatorWorkspace();
  const bom = useWorkflowStore((s) => s.bom);
  const workflowIdentity = useWorkflowStore((s) => s.workflowIdentity);
  const stockReservation = useWorkflowStore((s) => s.stockReservation);
  const setStockReservation = useWorkflowStore((s) => s.setStockReservation);
  const currentProject = useWorkflowStore((s) => s.currentProject) ?? state.currentProject;

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
      const result = await loadOwnedWorkshopInventory({
        userId: user.id,
        syncFromMovements: false,
      });
      return {
        profiles: result.profiles,
        totalValue: result.totalValue,
        error: result.ok ? null : result.error,
      };
    },
  });

  const reservationCurrent = useMemo(() => {
    if (!stockReservation || !workflowIdentity) return false;
    return (
      stockReservation.identity.projectId === workflowIdentity.projectId
      && stockReservation.identity.ownerUserId === workflowIdentity.ownerUserId
      && stockReservation.identity.source === workflowIdentity.source
      && stockReservation.identity.positionId === workflowIdentity.positionId
      && stockReservation.identity.revision === workflowIdentity.revision
    );
  }, [stockReservation, workflowIdentity]);

  const handleAcknowledgeStock = () => {
    if (!workflowIdentity || workflowIdentity.ownerUserId !== user?.id) {
      toast.error('Open a saved position revision before acknowledging stock.');
      return;
    }
    if (!isQualifiedBOM(bom)) {
      toast.error('Qualify the BOM for this revision before acknowledging stock.');
      return;
    }

    const inventory = data?.profiles ?? [];
    if (isLoading || error || data?.error || !data) {
      toast.error('Reconciled owned inventory must load successfully before acknowledging stock.');
      return;
    }
    let metersByProfile: Record<string, number>;
    try { metersByProfile = bomStockDemand(bom!.profiles); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Invalid physical cut ledger.'); return; }
    const profileIds = Object.keys(metersByProfile);
    const availabilityOk = profileIds.every(id => {
      const owned = inventory.find(profile => profile.id === id);
      return owned && Number.isFinite(owned.stockQuantity) && owned.stockQuantity >= metersByProfile[id];
    });

    setStockReservation({
      identity: workflowIdentity,
      profileIds: Array.from(new Set(profileIds)),
      metersByProfile,
      reservedAt: new Date().toISOString(),
      availabilityOk,
    });

    if (availabilityOk) {
      toast.success(`Stock availability acknowledged for R${workflowIdentity.revision} (no deduction).`);
    } else {
      toast.warning(
        `Stock acknowledgement recorded for R${workflowIdentity.revision}, but availability is short — resolve intake before optimize.`,
      );
    }
  };

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
      <div className="p-4 space-y-3">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <Alert className="border-amber-600/30 bg-amber-500/5">
          <AlertTitle className="text-amber-200 text-sm">Pose stock acknowledgement (UP-10)</AlertTitle>
          <AlertDescription className="text-amber-100/80 text-xs space-y-2">
            <p>
              Soft availability check for the active revision — does not deduct stock or create
              movements. Optimization stays blocked until this matches the saved identity.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleAcknowledgeStock}
                disabled={!workflowIdentity || !isQualifiedBOM(bom)}
              >
                Acknowledge stock for this revision
              </Button>
              {reservationCurrent && stockReservation ? (
                <span className="inline-flex items-center gap-1 text-green-300 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  R{stockReservation.identity.revision}
                  {stockReservation.availabilityOk ? ' · available' : ' · short'}
                </span>
              ) : (
                <span className="text-amber-500/80 text-xs">Not recorded for current revision</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <InventoryDashboard
        currency="EGP"
        inventory={data?.profiles ?? []}
        project={currentProject}
        userId={user.id}
      />
    </div>
  );
};

export default StudioStockPage;
