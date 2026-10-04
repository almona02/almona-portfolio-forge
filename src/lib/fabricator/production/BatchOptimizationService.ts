/**
 * BatchOptimizationService — Cross-position cut optimization
 *
 * FP-028 / P4.5: Manufacturing batch optimization requires an approved
 * ManufacturingDesignContract + ApprovedApexSystemSnapshot per position.
 * Catalog SystemPack fallbacks and invented stock lengths are forbidden.
 */

import type { CutRequest } from '@/lib/algorithms/LinearOptimizer';
import { optimizeLinearCuts, type OptimizationResult } from '@/lib/algorithms/LinearOptimizer';
import {
  generateApexManufacturing,
  type ApexLinearPiece,
  type ApexManufacturingResult,
  type ApprovedApexSystemSnapshot,
} from '@/lib/fabricator/goldTier/ApexManufacturingEngine';
import type { ManufacturingDesignContract } from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import {
  resolveManufacturingSettings,
  systemPackCuttingOverrideFromMicrons,
  type ManufacturingSettingsInput,
} from '@/lib/fabricator/ManufacturingSettings';

export class BatchOptimizationAuthorityError extends Error {
  readonly blocking = true;

  constructor(
    readonly code: 'MISSING_JOBS' | 'INVALID_JOB' | 'PROFILE_STOCK_MISMATCH',
    message: string
  ) {
    super(message);
    this.name = 'BatchOptimizationAuthorityError';
  }
}

export interface BatchManufacturingJob {
  readonly contract: ManufacturingDesignContract;
  readonly snapshot: ApprovedApexSystemSnapshot;
  readonly strategyId?: string;
}

export interface BatchOptimizationResult {
  readonly frameStock: OptimizationResult;
  readonly sashStock: OptimizationResult;
  readonly perUnitResults: Map<string, ApexManufacturingResult>;
  readonly barsSaved: number;
  readonly wasteSavedMm: number;
}

function pieceToRequests(piece: ApexLinearPiece): CutRequest {
  return {
    id: piece.pieceId,
    length: piece.cutLength.value,
    label: piece.pieceId,
    quantity: piece.totalQuantity,
  };
}

function groupByRole(
  pieces: readonly ApexLinearPiece[],
  role: 'frame' | 'sash'
): { requests: CutRequest[]; stockLengthMm: number } {
  const rolePieces = pieces.filter((piece) => piece.role === role);
  if (rolePieces.length === 0) {
    return { requests: [], stockLengthMm: Number.NaN };
  }

  const stockLengthMm = rolePieces[0].profile.stockLength.value;
  for (const piece of rolePieces) {
    if (piece.profile.stockLength.value !== stockLengthMm) {
      throw new BatchOptimizationAuthorityError(
        'PROFILE_STOCK_MISMATCH',
        `Batch blocked: ${role} pieces use inconsistent approved stock lengths.`
      );
    }
    if (piece.cutLength.unit !== 'mm' || piece.profile.stockLength.unit !== 'mm') {
      throw new BatchOptimizationAuthorityError(
        'PROFILE_STOCK_MISMATCH',
        `Batch blocked: ${role} piece units must be millimetres.`
      );
    }
  }

  return {
    requests: rolePieces.map(pieceToRequests),
    stockLengthMm,
  };
}

/**
 * Runs batch optimization across approved manufacturing jobs only.
 * Fail closed when jobs are missing or authority is incomplete.
 */
export function runBatchOptimization(
  jobs: readonly BatchManufacturingJob[],
  settingsInput: ManufacturingSettingsInput = {}
): BatchOptimizationResult {
  if (!jobs.length) {
    throw new BatchOptimizationAuthorityError(
      'MISSING_JOBS',
      'Batch blocked: at least one approved manufacturing job is required.'
    );
  }

  const perUnitResults = new Map<string, ApexManufacturingResult>();
  const allPieces: ApexLinearPiece[] = [];
  let perUnitBars = 0;
  let perUnitWaste = 0;

  for (const [index, job] of jobs.entries()) {
    if (!job?.contract || !job?.snapshot) {
      throw new BatchOptimizationAuthorityError(
        'INVALID_JOB',
        `Batch blocked: job[${index}] is missing an approved contract or system snapshot.`
      );
    }

    const result = generateApexManufacturing(
      job.contract,
      job.snapshot,
      job.strategyId ?? 'miter'
    );
    const positionId = result.identity.positionId;
    if (perUnitResults.has(positionId)) {
      throw new BatchOptimizationAuthorityError(
        'INVALID_JOB',
        `Batch blocked: duplicate position identity "${positionId}".`
      );
    }
    perUnitResults.set(positionId, result);
    allPieces.push(...result.linearPieces);

    for (const profileOpt of result.optimization) {
      perUnitBars += profileOpt.result.barsCount;
      perUnitWaste += profileOpt.result.totalWaste;
    }
  }

  const frameGroup = groupByRole(allPieces, 'frame');
  const sashGroup = groupByRole(allPieces, 'sash');

  // Kerf/trim from the first approved system; stock lengths stay per-profile authority.
  const firstSystem = jobs[0].snapshot.system;
  const settings = resolveManufacturingSettings({
    ...settingsInput,
    systemPack: systemPackCuttingOverrideFromMicrons(firstSystem.fabricationRules.cutting),
  });

  const emptyStock: OptimizationResult = {
    barsCount: 0,
    totalWaste: 0,
    totalStockLength: 0,
    totalCutLength: 0,
    efficiency: 0,
    stockUsed: [],
  };

  const frameStock =
    frameGroup.requests.length === 0
      ? emptyStock
      : optimizeLinearCuts(
          frameGroup.requests,
          frameGroup.stockLengthMm,
          settings.sawKerfMm,
          settings.trimCutMm
        );

  const sashStock =
    sashGroup.requests.length === 0
      ? emptyStock
      : optimizeLinearCuts(
          sashGroup.requests,
          sashGroup.stockLengthMm,
          settings.sawKerfMm,
          settings.trimCutMm
        );

  const batchBars = frameStock.barsCount + sashStock.barsCount;
  const batchWaste = frameStock.totalWaste + sashStock.totalWaste;

  return {
    frameStock,
    sashStock,
    perUnitResults,
    barsSaved: Math.max(0, perUnitBars - batchBars),
    wasteSavedMm: Math.max(0, perUnitWaste - batchWaste),
  };
}
