import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { isQualifiedBOM } from '@/lib/fabricator/bom/bomQualification';
import {
  buildBomDemandReport,
  isStockAcknowledgementStale,
} from '@/lib/fabricator/inventory/bomStockAvailability';
import { loadOwnedWorkshopInventory } from '@/lib/fabricator/inventory/ProfileInventoryAdapter';
import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Canonical Studio stock surface — UP-09 / UP-10 / PR2 demand + stale acknowledgement.
 */
export const StudioStockPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
    dataUpdatedAt,
    refetch,
    isFetching,
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

  const bomFingerprint = useMemo(() => fingerprintBom(bom), [bom]);

  const demandReport = useMemo(() => {
    if (!bom?.profiles?.length || !data?.profiles) return null;
    try {
      return buildBomDemandReport(bom.profiles, data.profiles);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Unable to compute BOM demand.',
      } as const;
    }
  }, [bom, data?.profiles]);

  const report = demandReport && 'rows' in demandReport ? demandReport : null;
  const demandError = demandReport && 'error' in demandReport ? demandReport.error : null;

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

  const acknowledgementStale = useMemo(() => {
    if (!reservationCurrent || !stockReservation || !report) return false;
    return isStockAcknowledgementStale({
      reservationBomFingerprint: stockReservation.bomFingerprint,
      currentBomFingerprint: bomFingerprint,
      reservationVersions: stockReservation.stockVersionByProfile,
      currentVersions: report.stockVersionByProfile,
    });
  }, [reservationCurrent, stockReservation, report, bomFingerprint]);

  const handleAcknowledgeStock = () => {
    if (!workflowIdentity || workflowIdentity.ownerUserId !== user?.id) {
      toast.error('Open a saved position revision before acknowledging stock.');
      return;
    }
    if (!isQualifiedBOM(bom)) {
      toast.error('Qualify the bill of materials for this revision before acknowledging stock.');
      return;
    }
    if (isLoading || error || data?.error || !data) {
      toast.error('Owned inventory must load successfully before acknowledging stock.');
      return;
    }
    if (!report) {
      toast.error(demandError || 'Unable to compute project demand.');
      return;
    }
    if (!report.allMapped) {
      toast.error('Map missing catalogue profiles to owned stock before acknowledging.');
      return;
    }

    const metersByProfile: Record<string, number> = {};
    for (const row of report.rows) {
      if (row.ownedProfileId) {
        metersByProfile[row.ownedProfileId] =
          (metersByProfile[row.ownedProfileId] ?? 0) + row.requiredMetres;
      }
    }

    setStockReservation({
      identity: workflowIdentity,
      profileIds: Array.from(new Set(Object.keys(metersByProfile))),
      metersByProfile,
      reservedAt: new Date().toISOString(),
      availabilityOk: report.availabilityOk,
      bomFingerprint,
      stockVersionByProfile: { ...report.stockVersionByProfile },
    });

    if (report.availabilityOk) {
      toast.success(`Stock availability acknowledged for R${workflowIdentity.revision} (soft check only).`);
    } else {
      toast.warning(
        `Stock acknowledgement recorded for R${workflowIdentity.revision}, but metres are short — resolve intake before optimize.`,
      );
    }
  };

  const handleRefreshInventory = async () => {
    await queryClient.invalidateQueries({ queryKey: ['studio-owned-inventory', user?.id] });
    await refetch();
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
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading owned workshop inventory…
      </div>
    );
  }

  const loadError = error instanceof Error ? error.message : data?.error;
  const qualified = isQualifiedBOM(bom);
  const canAcknowledge =
    Boolean(workflowIdentity)
    && qualified
    && !loadError
    && Boolean(report)
    && !demandError
    && !isFetching;

  return (
    <div className="h-full overflow-auto" data-testid="studio-stock-page">
      <div className="p-4 space-y-3">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/70">
          <span>
            Last inventory refresh:{' '}
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'not yet'}
            {isFetching ? ' · refreshing…' : ''}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-600/40 text-amber-100"
            onClick={() => void handleRefreshInventory()}
            disabled={isFetching}
            aria-label="Refresh owned inventory quantities"
          >
            Refresh owned stock
          </Button>
        </div>

        <Alert className="border-amber-600/30 bg-amber-500/5">
          <AlertTitle className="text-amber-200 text-sm">Stock acknowledgement</AlertTitle>
          <AlertDescription className="text-amber-100/80 text-xs space-y-2">
            <p>
              Soft availability check for the active revision — does not deduct stock or create
              movements. Optimization stays blocked until this matches the saved identity and current stock versions.
            </p>
            {!qualified ? (
              <p className="text-amber-200">
                Prerequisite: qualify the bill of materials for this revision before acknowledging stock.{' '}
                <Link
                  className="underline text-amber-100"
                  to={
                    workflowIdentity?.projectId && workflowIdentity?.positionId
                      ? `/fabricator/studio/projects/${workflowIdentity.projectId}/positions/${workflowIdentity.positionId}/bom`
                      : '/fabricator/studio'
                  }
                >
                  Open BOM review
                </Link>
              </p>
            ) : null}
            {acknowledgementStale ? (
              <p className="text-amber-300 inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Previous acknowledgement is stale after BOM or inventory changes — re-acknowledge.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleAcknowledgeStock}
                disabled={!canAcknowledge}
              >
                Acknowledge stock for this revision
              </Button>
              {reservationCurrent && stockReservation && !acknowledgementStale ? (
                <span
                  className={`inline-flex items-center gap-1 text-xs ${
                    stockReservation.availabilityOk ? 'text-green-300' : 'text-amber-300'
                  }`}
                >
                  {stockReservation.availabilityOk ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  )}
                  R{stockReservation.identity.revision}
                  {stockReservation.availabilityOk ? ' · available' : ' · shortage'}
                </span>
              ) : (
                <span className="text-amber-500/80 text-xs">Not recorded for current revision</span>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {demandError ? (
          <Alert variant="destructive">
            <AlertDescription>{demandError}</AlertDescription>
          </Alert>
        ) : null}

        {report ? (
          <div className="rounded-md border border-amber-700/40 bg-black/20 overflow-x-auto">
            <div className="px-3 py-2 text-sm text-amber-100 font-medium">
              Active revision demand
              {report.missingMappingCount
                ? ` · ${report.missingMappingCount} missing mapping(s)`
                : ''}
              {report.shortageCount ? ` · ${report.shortageCount} shortage(s)` : ''}
            </div>
            <table className="w-full text-xs text-left">
              <thead className="text-amber-200/70 border-b border-amber-800/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Catalogue / owned</th>
                  <th className="px-3 py-2 font-medium">Pack</th>
                  <th className="px-3 py-2 font-medium">Required m</th>
                  <th className="px-3 py-2 font-medium">Available m</th>
                  <th className="px-3 py-2 font-medium">Shortage</th>
                  <th className="px-3 py-2 font-medium">Bar lengths</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => {
                  const shortage = row.mappingStatus === 'missing_mapping' || row.shortageMetres > 0;
                  return (
                    <tr
                      key={`${row.bomRowId}-${row.ownedProfileId ?? 'unmapped'}`}
                      className={
                        row.mappingStatus === 'missing_mapping'
                          ? 'bg-red-950/40 text-red-100'
                          : row.shortageMetres > 0
                            ? 'bg-amber-950/40 text-amber-100'
                            : 'text-amber-50/90'
                      }
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.catalogueCode}</div>
                        <div className="text-[10px] opacity-70">
                          {row.ownedProfileName || 'No owned mapping'}
                          {row.isTestStock ? ' · TEST STOCK' : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2">{row.pack || '—'}</td>
                      <td className="px-3 py-2">{row.requiredMetres.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {row.availableMetres == null ? '—' : row.availableMetres.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {row.mappingStatus === 'missing_mapping'
                          ? 'n/a'
                          : row.shortageMetres.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {row.eligibleBarLengthsM.length
                          ? row.eligibleBarLengthsM.map((m) => `${m} m`).join(', ')
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.mappingStatus === 'missing_mapping'
                          ? 'Missing mapping'
                          : shortage
                            ? 'Shortage'
                            : 'Covered'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Alert className="border-slate-600/40 bg-slate-900/40">
            <AlertDescription className="text-xs text-slate-300">
              No linked BOM profiles for this revision yet. Open BOM review after a qualified design
              to see required metres and shortages.
            </AlertDescription>
          </Alert>
        )}
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
