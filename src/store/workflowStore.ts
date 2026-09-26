import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { validateOptimizationInputs, validateOptimizationResult } from '@/lib/fabricator/validation/WorkflowValidator';
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
  invalidateStep: (step: string) => void;
  completeStep: (step: string) => boolean;
  setActiveStep: (step: string) => void;
  canAccessStep: (step: string) => boolean;
  clearWorkflow: () => void;
  setCurrentProject: (project: WindowUnit | null) => void;
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
    return validateOptimizationResult(state.optimizationResult).valid;
  }
  if (step === 'quality-control') {
    const approval = state.qualityApproval;
    return validateOptimizationResult(state.optimizationResult).valid && Boolean(
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
      completedSteps: new Set(),
      activeStep: 'measuring',
      
      // Actions
      setMeasurementData: (data) => {
        set(state => ({ measurementData: data, workflowDraftDirty: true, designData: null, bom: null, optimizationResult: null, quote: null, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'measuring'), qualityApproval: null }));
      },
      
      setDesignData: (data) => {
        set(state => ({ designData: data, currentProject: data, workflowDraftDirty: true, bom: null, optimizationResult: null, quote: null, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'design'), qualityApproval: null }));
      },
      
      setOptimizationResult: (result) => {
        set(state => ({ optimizationResult: result, quote: null, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'optimization'), qualityApproval: null }));
      },

      setBOM: (bom) => {
        set(state => ({ bom, optimizationResult: null, quote: null, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'bom'), qualityApproval: null }));
      },

      setQuote: (quote) => {
        set(state => ({ quote, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'commercial'), qualityApproval: null }));
      },

      setProductionDocuments: (docs) => {
        set({ productionDocuments: docs });
      },

      setQualityApproval: (qualityApproval) => set({ qualityApproval }),

      invalidateStep: (step) => set(state => ({
        completedSteps: downstreamFrom(state.completedSteps, step),
        ...(step === 'optimization' ? { optimizationResult: null, qualityApproval: null } : {}),
        ...(step === 'quality-control' ? { qualityApproval: null } : {}),
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
          completedSteps: new Set(),
          activeStep: 'measuring',
        });
      },
      
      setCurrentProject: (project) => {
        set(state => ({ currentProject: project, workflowDraftDirty: project !== null, designData: null, bom: null, optimizationResult: null, quote: null, productionDocuments: null, completedSteps: downstreamFrom(state.completedSteps, 'design'), qualityApproval: null }));
      },

      hydrateAuthoritativePosition: (identity, project) => {
        assertHydrationIdentity(identity, project);
        set(state => {
        const sameRevision = workflowIdentityMatches(state.workflowIdentity, identity);
        if (sameRevision && state.workflowDraftDirty) return {};
        if (sameRevision) return { currentProject: project, designData: project };
        return {
          workflowIdentity: identity,
          currentProject: project,
          workflowDraftDirty: false,
          measurementData: {
            width: String(project.overallWidth),
            height: String(project.overallHeight),
            manufacturingWidth: project.overallWidth,
            manufacturingHeight: project.overallHeight,
            windowType: project.type,
            systemPackId: project.systemPackId,
            measurementMode: project.measurementMode ?? 'manufacturing',
          } as MeasurementData,
          designData: null,
          bom: null,
          optimizationResult: null,
          quote: null,
          productionDocuments: null,
          qualityApproval: null,
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
        completedSteps: Array.from(state.completedSteps),
        activeStep: state.activeStep,
      }),
      // On rehydrate, convert array back to Set and ensure new fields exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.completedSteps = new Set(state.completedSteps as unknown as string[]);
          if (state.bom === undefined) state.bom = null;
          if (state.quote === undefined) state.quote = null;
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
