import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import {
  bomMatchesPhysicalDesign,
  validateOptimizationInputs,
  validateOptimizationReconciliation,
} from '@/lib/fabricator/validation/WorkflowValidator';
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Workflow quote - supports minimal (FabricatorQuoteService) and full (origin) shapes */
export interface WorkflowQuote {
  total: number;
  currency: string;
  subtotal?: number;
  tax?: number;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  /** Extended fields (optional) */
  id?: string;
  bomCost?: {
    materialCost: number;
    laborCost: number;
    hardwareCost: number;
    glazingCost: number;
    accessoriesCost: number;
    totalCost: number;
  };
  markupPercentage?: number;
  markup?: number;
  taxPercentage?: number;
  discountPercentage?: number;
  discount?: number;
  finalPrice?: number;
  customerName?: string;
  projectTitle?: string;
  createdAt?: string;
  validUntil?: string;
}

export interface CutSheetItem {
  id: string;
  profileRole: string;
  profileName: string;
  length: number;
  angle: number;
  quantity: number;
  stockBarId: string;
  stockBarLength: number;
  positionOnBar: number;
  /** Physical-cut identity when available (FP-017) */
  cutId?: string;
  componentId?: string;
}

export interface LabelData {
  id: string;
  positionCode: string;
  profileRole: string;
  length: number;
  angle: number;
  stockBarId: string;
  projectCode: string;
  qrPayload: string;
}

export interface ProductionDocuments {
  cutSheets: CutSheetItem[];
  labels: LabelData[];
  generatedAt: string;
}

export interface QualityApprovalAcknowledgement {
  approvalId: string;
  projectId: string;
  positionId: string;
  revision: number;
  inspectorId: string;
  approvedAt: string;
}

export interface WorkflowIdentity {
  ownerUserId: string;
  projectId: string;
  positionId: string;
  source: 'v1' | 'v2';
  revision: number;
}

function samePoseIdentity(a: WorkflowIdentity | null, b: WorkflowIdentity): boolean {
  return Boolean(
    a &&
      a.ownerUserId === b.ownerUserId &&
      a.projectId === b.projectId &&
      a.positionId === b.positionId &&
      a.source === b.source,
  );
}

/** Rebind BOM qualification to a new authoritative revision after a save bump. */
function rebindBomQualificationIdentity(
  bom: CompleteBOM | null,
  identity: WorkflowIdentity,
): CompleteBOM | null {
  if (!bom?.qualification) return bom;
  return {
    ...bom,
    qualification: {
      ...bom.qualification,
      identity,
    },
  };
}

export interface StockReservationEvidence {
  identity: WorkflowIdentity;
  profileIds: string[];
  metersByProfile: Record<string, number>;
  reservedAt: string;
  /** Soft availability check only — does not deduct stock. */
  availabilityOk: boolean;
  /** BOM fingerprint at acknowledgement time (stale when BOM changes). */
  bomFingerprint: string;
  /** Owned profile stock_version snapshot (stale after intake/consumption). */
  stockVersionByProfile: Record<string, number>;
}

/** UP-18: frozen release fingerprint acknowledgement. */
export interface PositionReleaseEvidence {
  releaseId: string;
  projectId: string;
  positionId: string;
  source: 'v1' | 'v2';
  revision: number;
  bomFingerprint: string;
  stockFingerprint: string;
  optimizationFingerprint: string;
  releasedAt: string;
}

/** UP-20: server delivery acknowledgement. */
export interface DeliveryAcknowledgementEvidence {
  acknowledgementId: string;
  projectId: string;
  positionId: string;
  revision: number;
  ownerUserId: string;
  acknowledgedAt: string;
}

export interface WorkflowState {
  // Project data
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  designData: WindowUnit | null;
  optimizationResult: OptimizationResult | null;
  bom: CompleteBOM | null;
  quote: WorkflowQuote | null;
  productionDocuments: ProductionDocuments | null;
  qualityApproval: QualityApprovalAcknowledgement | null;
  workflowIdentity: WorkflowIdentity | null;
  workflowDraftDirty: boolean;
  /** UP-10: revision-bound stock acknowledgement (no double deduction). */
  stockReservation: StockReservationEvidence | null;
  /** UP-18: revision-bound release freeze. */
  positionRelease: PositionReleaseEvidence | null;
  /** UP-20: revision-bound delivery acknowledgement. */
  deliveryAcknowledgement: DeliveryAcknowledgementEvidence | null;

  // Progress tracking
  completedSteps: Set<string>;
  activeStep: string;

  // Actions
  setMeasurementData: (data: MeasurementData) => void;
  setDesignData: (data: WindowUnit) => void;
  setOptimizationResult: (result: OptimizationResult | null) => void;
  setBOM: (bom: CompleteBOM | null) => void;
  setQuote: (quote: WorkflowQuote | null) => void;
  setProductionDocuments: (docs: ProductionDocuments | null) => void;
  setQualityApproval: (approval: QualityApprovalAcknowledgement | null) => void;
  setStockReservation: (reservation: StockReservationEvidence | null) => void;
  setPositionRelease: (release: PositionReleaseEvidence | null) => void;
  setDeliveryAcknowledgement: (ack: DeliveryAcknowledgementEvidence | null) => void;
  invalidateStep: (step: string) => void;
  completeStep: (step: string) => boolean;
  setActiveStep: (step: string) => void;
  canAccessStep: (step: string) => boolean;
  clearWorkflow: () => void;
  setCurrentProject: (project: WindowUnit | null) => void;
  /** Soft align for shell header — does not wipe workflow when updating same pose. */
  alignShellProject: (project: WindowUnit | null) => void;
  hydrateAuthoritativePosition: (identity: WorkflowIdentity, project: WindowUnit) => void;
  markWorkflowDraftSaved: () => void;
}

const WORKFLOW_STEPS = [
  'measuring',
  'design', 
  'preview3d',
  'bom',
  'optimization',
  'commercial',
  'production',
  'quality-control'
];

const downstreamFrom = (completed: Set<string>, step: string): Set<string> => {
  const index = WORKFLOW_STEPS.indexOf(step);
  if (index < 0) return new Set(completed);
  return new Set([...completed].filter(item => WORKFLOW_STEPS.indexOf(item) < index));
};

const identityKey = (identity: WorkflowIdentity | null): string | null => identity
  ? `${identity.ownerUserId}:${identity.projectId}:${identity.positionId}:${identity.source}:${identity.revision}`
  : null;

export const workflowIdentityMatches = (
  actual: WorkflowIdentity | null,
  expected: WorkflowIdentity,
): boolean => identityKey(actual) === identityKey(expected);

const assertHydrationIdentity = (identity: WorkflowIdentity, project: WindowUnit): void => {
  const recordProjectId = (project as WindowUnit & { projectId?: string }).projectId;
  if (identity.positionId !== project.id || (recordProjectId && identity.projectId !== recordProjectId)) {
    throw new Error('Authoritative position identity does not match the position record.');
  }
};

type CompletionState = Pick<WorkflowState, 'measurementData' | 'currentProject' | 'optimizationResult' | 'qualityApproval'>;

export function canCompleteWorkflowStep(state: CompletionState, step: string): boolean {
  if (step === 'measuring') {
    const width = Number(state.measurementData?.width);
    const height = Number(state.measurementData?.height);
    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
  }
  if (step === 'design' || step === 'preview3d' || step === 'bom') return validateOptimizationInputs(state.currentProject).valid;
  if (step === 'optimization' || step === 'commercial' || step === 'inventory' || step === 'production') {
    return validateOptimizationReconciliation(state.optimizationResult, state.currentProject).valid;
  }
  if (step === 'quality-control') {
    const approval = state.qualityApproval;
    return validateOptimizationReconciliation(state.optimizationResult, state.currentProject).valid && Boolean(
      approval?.approvalId && approval.projectId && approval.positionId === state.currentProject?.id &&
      Number.isInteger(approval.revision) && approval.revision > 0 && approval.inspectorId && approval.approvedAt
    );
  }
  return false;
}

export function revalidateCompletedSteps(state: CompletionState, completed: Iterable<string>): Set<string> {
  const valid = new Set<string>();
  for (const step of WORKFLOW_STEPS) {
    if (!new Set(completed).has(step) || !canCompleteWorkflowStep(state, step)) break;
    valid.add(step);
  }
  return valid;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      measurementData: null,
      designData: null,
      optimizationResult: null,
      bom: null,
      quote: null,
      productionDocuments: null,
      qualityApproval: null,
      workflowIdentity: null,
      workflowDraftDirty: false,
      stockReservation: null,
      positionRelease: null,
      deliveryAcknowledgement: null,
      completedSteps: new Set(),
      activeStep: 'measuring',
      
      // Actions
      setMeasurementData: (data) => {
        set(state => ({ measurementData: data, workflowDraftDirty: true, designData: null, bom: null, optimizationResult: null, quote: null, productionDocuments: null, stockReservation: null, positionRelease: null, deliveryAcknowledgement: null, completedSteps: downstreamFrom(state.completedSteps, 'measuring'), qualityApproval: null }));
      },
      
      setDesignData: (data) => {
        set(state => ({ designData: data, currentProject: data, workflowDraftDirty: true, bom: null, optimizationResult: null, quote: null, productionDocuments: null, stockReservation: null, positionRelease: null, deliveryAcknowledgement: null, completedSteps: downstreamFrom(state.completedSteps, 'design'), qualityApproval: null }));
      },
      
      setOptimizationResult: (result) => {
        set(state => ({ optimizationResult: result, quote: null, productionDocuments: null, positionRelease: null, deliveryAcknowledgement: null, completedSteps: downstreamFrom(state.completedSteps, 'optimization'), qualityApproval: null }));
      },

      setBOM: (bom) => {
        set(state => ({ bom, optimizationResult: null, quote: null, productionDocuments: null, stockReservation: null, positionRelease: null, deliveryAcknowledgement: null, completedSteps: downstreamFrom(state.completedSteps, 'bom'), qualityApproval: null }));
      },

      setQuote: (quote) => {
        set(state => ({ quote, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'commercial'), qualityApproval: null }));
      },

      setProductionDocuments: (docs) => {
        set({ productionDocuments: docs });
      },

      setQualityApproval: (qualityApproval) => set({ qualityApproval }),

      setStockReservation: (stockReservation) => set({ stockReservation }),

      setPositionRelease: (positionRelease) => set({ positionRelease }),

      setDeliveryAcknowledgement: (deliveryAcknowledgement) => set({ deliveryAcknowledgement }),

      invalidateStep: (step) => set(state => ({
        completedSteps: downstreamFrom(state.completedSteps, step),
        ...(step === 'optimization' ? { optimizationResult: null, qualityApproval: null, positionRelease: null, deliveryAcknowledgement: null } : {}),
        ...(step === 'quality-control' ? { qualityApproval: null, deliveryAcknowledgement: null } : {}),
        ...(step === 'bom' ? { bom: null, stockReservation: null, optimizationResult: null, positionRelease: null, deliveryAcknowledgement: null } : {}),
        ...(step === 'production' ? { positionRelease: null, deliveryAcknowledgement: null } : {}),
      })),

      completeStep: (step) => {
        if (!canCompleteWorkflowStep(get(), step)) return false;
        set((state) => ({
          completedSteps: new Set([...state.completedSteps, step]),
        }));
        return true;
      },
      
      setActiveStep: (step) => {
        set({ activeStep: step });
      },
      
      canAccessStep: (step: string) => {
        const state = get();
        const completedSteps = revalidateCompletedSteps(state, state.completedSteps);
        const stepIndex = WORKFLOW_STEPS.findIndex(s => s === step);
        
        // Always allow measuring (first step)
        if (stepIndex === 0) return true;
        
        // Check if previous step is completed
        const previousStep = WORKFLOW_STEPS[stepIndex - 1];
        return completedSteps.has(previousStep);
      },
      
      clearWorkflow: () => {
        set({
          currentProject: null,
          measurementData: null,
          designData: null,
          optimizationResult: null,
          bom: null,
          quote: null,
          productionDocuments: null,
          qualityApproval: null,
          workflowIdentity: null,
          workflowDraftDirty: false,
          stockReservation: null, positionRelease: null, deliveryAcknowledgement: null,
          completedSteps: new Set(),
          activeStep: 'measuring',
        });
      },
      
      setCurrentProject: (project) => {
        set(state => ({ currentProject: project, workflowDraftDirty: project !== null, designData: null, bom: null, optimizationResult: null, quote: null, productionDocuments: null, stockReservation: null, positionRelease: null, deliveryAcknowledgement: null, completedSteps: downstreamFrom(state.completedSteps, 'design'), qualityApproval: null }));
      },

      alignShellProject: (project) => {
        if (!project) {
          set({
            currentProject: null,
            measurementData: null,
            designData: null,
            optimizationResult: null,
            bom: null,
            quote: null,
            productionDocuments: null,
            qualityApproval: null,
            workflowIdentity: null,
            workflowDraftDirty: false,
            stockReservation: null, positionRelease: null, deliveryAcknowledgement: null,
            completedSteps: new Set(),
            activeStep: 'measuring',
          });
          return;
        }
        set((state) => {
          if (state.currentProject?.id === project.id) {
            return {
              currentProject: project,
              designData:
                state.designData?.id === project.id
                  ? { ...state.designData, ...project }
                  : state.designData,
            };
          }
          return { currentProject: project };
        });
      },

      hydrateAuthoritativePosition: (identity, project) => {
        assertHydrationIdentity(identity, project);
        set(state => {
        const sameRevision = workflowIdentityMatches(state.workflowIdentity, identity);
        if (sameRevision && state.workflowDraftDirty) return {};
        if (sameRevision) return { currentProject: project, designData: project };

        // Save bumps qc_revision (BEFORE UPDATE trigger). Same pose + BOM still
        // matching the physical design must not wipe the BOM→optimize handoff.
        const revisionOnlyAdvance =
          samePoseIdentity(state.workflowIdentity, identity) &&
          (state.workflowIdentity?.revision ?? 0) !== identity.revision;
        if (
          revisionOnlyAdvance &&
          state.bom &&
          bomMatchesPhysicalDesign(state.bom, project)
        ) {
          return {
            workflowIdentity: identity,
            currentProject: project,
            designData: project,
            workflowDraftDirty: false,
            measurementData: {
              ...project.positionMeta,
              width: String(project.overallWidth),
              height: String(project.overallHeight),
              manufacturingWidth: project.overallWidth,
              manufacturingHeight: project.overallHeight,
              windowType: project.type,
              systemPackId: project.systemPackId,
              measurementMode: project.measurementMode ?? 'manufacturing',
              glazingType: (project.glazing as { type?: string })?.type,
              glassColor: (project.glazing as { color?: string })?.color,
              color: project.color,
              grid: project.grid,
              presetId: project.presetId,
            } as MeasurementData,
            bom: rebindBomQualificationIdentity(state.bom, identity),
            // Optimization evidence is revision-bound — clear on bump.
            optimizationResult: null,
            quote: null,
            productionDocuments: null,
            qualityApproval: null,
            stockReservation: null,
            positionRelease: null,
            deliveryAcknowledgement: null,
            completedSteps: new Set(
              [...state.completedSteps].filter((step) => step === 'measuring' || step === 'design' || step === 'bom'),
            ),
          };
        }

        return {
          workflowIdentity: identity,
          currentProject: project,
          workflowDraftDirty: false,
          measurementData: {
            ...project.positionMeta,
            width: String(project.overallWidth),
            height: String(project.overallHeight),
            manufacturingWidth: project.overallWidth,
            manufacturingHeight: project.overallHeight,
            windowType: project.type,
            systemPackId: project.systemPackId,
            measurementMode: project.measurementMode ?? 'manufacturing',
            glazingType: (project.glazing as { type?: string })?.type,
            glassColor: (project.glazing as { color?: string })?.color,
            color: project.color,
            grid: project.grid,
            presetId: project.presetId,
          } as MeasurementData,
          designData: null,
          bom: null,
          optimizationResult: null,
          quote: null,
          productionDocuments: null,
          qualityApproval: null,
          stockReservation: null, positionRelease: null, deliveryAcknowledgement: null,
          completedSteps: new Set<string>(),
          activeStep: 'measuring',
        };
      });
      },

      markWorkflowDraftSaved: () => set({ workflowDraftDirty: false }),
    }),
    {
      name: 'fabricator-workflow-draft-v2',
      version: 2,
      // Only persist specific fields
      partialize: (state) => ({
        currentProject: state.currentProject,
        measurementData: state.measurementData,
        designData: state.designData,
        optimizationResult: state.optimizationResult,
        bom: state.bom,
        quote: state.quote,
        productionDocuments: state.productionDocuments,
        qualityApproval: state.qualityApproval,
        workflowIdentity: state.workflowIdentity,
        workflowDraftDirty: state.workflowDraftDirty,
        stockReservation: state.stockReservation,
        positionRelease: state.positionRelease,
        deliveryAcknowledgement: state.deliveryAcknowledgement,
        completedSteps: Array.from(state.completedSteps),
        activeStep: state.activeStep,
      }),
      // On rehydrate, convert array back to Set and ensure new fields exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.completedSteps = new Set(state.completedSteps as unknown as string[]);
          if (state.bom === undefined) state.bom = null;
          if (state.quote === undefined) state.quote = null;
          if (state.stockReservation === undefined) state.stockReservation = null;
          if (state.positionRelease === undefined) state.positionRelease = null;
          if (state.deliveryAcknowledgement === undefined) state.deliveryAcknowledgement = null;
          if (state.productionDocuments === undefined) state.productionDocuments = null;
          if (state.qualityApproval === undefined) state.qualityApproval = null;
          if (state.workflowIdentity === undefined) state.workflowIdentity = null;
          if (state.workflowDraftDirty === undefined) state.workflowDraftDirty = false;
          state.completedSteps = revalidateCompletedSteps(state, state.completedSteps);
        }
      },
    }
  )
);
