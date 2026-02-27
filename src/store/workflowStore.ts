import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Minimal quote shape for workflow pipeline (Phase 1) */
export interface WorkflowQuote {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

interface WorkflowState {
  // Project data
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  designData: WindowUnit | null;
  optimizationResult: OptimizationResult | null;
  /** P1: BOM from PresetAwareBOMGenerator */
  bom: CompleteBOM | null;
  /** P1: Priced quote for fabricator workflow */
  quote: WorkflowQuote | null;

  // Progress tracking
  completedSteps: Set<string>;
  activeStep: string;

  // Actions
  setMeasurementData: (data: MeasurementData) => void;
  setDesignData: (data: WindowUnit) => void;
  setOptimizationResult: (result: OptimizationResult) => void;
  setBOM: (bom: CompleteBOM | null) => void;
  setQuote: (quote: WorkflowQuote | null) => void;
  completeStep: (step: string) => void;
  setActiveStep: (step: string) => void;
  canAccessStep: (step: string) => boolean;
  clearWorkflow: () => void;
  setCurrentProject: (project: WindowUnit | null) => void;
}

const WORKFLOW_STEPS = [
  'measuring',
  'design', 
  'preview3d',
  'optimization',
  'inventory',
  'production',
  'quality-control'
];

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
      completedSteps: new Set(),
      activeStep: 'measuring',
      
      // Actions
      setMeasurementData: (data) => {
        set({ measurementData: data });
        // Auto-create project if none exists
        if (!get().currentProject) {
          set({
            currentProject: {
              id: `project-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}`,
              posNumber: '1',
              type: 'window',
              components: [],
              overallWidth: data.width || 1200,
              overallHeight: data.height || 1400,
              color: '#FFFFFF',
              glazing: { type: 'clear', thickness: 24 },
              hardware: [],
              status: 'draft',
              createdAt: new Date(),
              updatedAt: new Date(),
              quantity: 1,
            } as WindowUnit,
          });
        }
      },
      
      setDesignData: (data) => {
        set({ designData: data, currentProject: data });
      },
      
      setOptimizationResult: (result) => {
        set({ optimizationResult: result });
      },

      setBOM: (bom) => {
        set({ bom });
      },

      setQuote: (quote) => {
        set({ quote });
      },

      completeStep: (step) => {
        set((state) => ({
          completedSteps: new Set([...state.completedSteps, step]),
        }));
      },
      
      setActiveStep: (step) => {
        set({ activeStep: step });
      },
      
      canAccessStep: (step: string) => {
        const { completedSteps } = get();
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
          completedSteps: new Set(),
          activeStep: 'measuring',
        });
      },
      
      setCurrentProject: (project) => {
        set({ currentProject: project });
      },
    }),
    {
      name: 'fabricator-workflow-storage',
      // Only persist specific fields
      partialize: (state) => ({
        currentProject: state.currentProject,
        measurementData: state.measurementData,
        designData: state.designData,
        optimizationResult: state.optimizationResult,
        bom: state.bom,
        quote: state.quote,
        completedSteps: Array.from(state.completedSteps),
        activeStep: state.activeStep,
      }),
      // On rehydrate, convert array back to Set and ensure new fields exist
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.completedSteps = new Set(state.completedSteps as unknown as string[]);
          if (state.bom === undefined) state.bom = null;
          if (state.quote === undefined) state.quote = null;
        }
      },
    }
  )
);
