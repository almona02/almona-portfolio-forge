/**
 * Execution Workflow Types - Phase 2: Closed-Loop Production
 *
 * Defines production execution stages, status transitions, and feedback capture.
 */

export type ExecutionStageId =
  | 'material_prep'
  | 'frame_assembly'
  | 'sash_assembly'
  | 'glazing'
  | 'hardware_install'
  | 'quality_check';

export type ExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export type LogType =
  | 'info'
  | 'warning'
  | 'error'
  | 'completion'
  | 'rework'
  | 'rejection';

export interface ExecutionStage {
  id: string;
  productionProjectId: string;
  stageId: ExecutionStageId;
  stageName: string;
  description: string;
  status: ExecutionStatus;
  estimatedDurationMinutes: number;
  actualDurationMinutes?: number;
  startedAt?: string;
  completedAt?: string;
  assignedOperator?: string;
  notes?: string;
  qualityScore?: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionLog {
  id: string;
  executionStageId: string;
  logType: LogType;
  message: string;
  operatorId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface InventoryConsumption {
  id: string;
  executionStageId: string;
  bomItemId: string;
  itemCategory: string;
  itemCode: string;
  itemName: string;
  plannedQuantity: number;
  actualQuantity?: number;
  unit: string;
  wastageQuantity: number;
  wastageReason?: string;
  supplier?: string;
  batchNumber?: string;
  qualityCheckPassed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionWorkflow {
  stages: ExecutionStageDefinition[];
  transitions: ExecutionTransition[];
}

export interface ExecutionStageDefinition {
  id: ExecutionStageId;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  requiredSkills: string[];
  predecessorStages: ExecutionStageId[];
  successorStages: ExecutionStageId[];
  qualityCheckpoints: string[];
  safetyRequirements: string[];
}

export interface ExecutionTransition {
  fromStage: ExecutionStageId;
  toStage: ExecutionStageId;
  conditions: string[];
  automated: boolean;
}

export interface ExecutionFeedback {
  stageId: string;
  status: ExecutionStatus;
  qualityScore?: number;
  notes?: string;
  consumptionData?: {
    bomItemId: string;
    itemCategory: string;
    itemCode: string;
    itemName: string;
    plannedQuantity: number;
    actualQuantity: number;
    unit: string;
    wastageQuantity?: number;
    wastageReason?: string;
    supplier?: string;
    batchNumber?: string;
    qualityCheckPassed?: boolean;
  }[];
  timeSpentMinutes?: number;
  issues?: string[];
}

export interface ExecutionSummary {
  projectId: string;
  totalStages: number;
  completedStages: number;
  failedStages: number;
  averageQualityScore: number;
  totalTimeSpent: number; // minutes
  efficiency: number; // 0-1
  wastageSummary: {
    totalWastage: number;
    wastageByCategory: Record<string, number>;
    primaryReasons: string[];
  };
}

// Pre-defined execution workflow
export const EXECUTION_WORKFLOW: ExecutionWorkflow = {
  stages: [
    {
      id: 'material_prep',
      name: 'Material Preparation',
      description: 'Cut and prepare all profiles according to cutting list with kerf compensation',
      estimatedDurationMinutes: 120,
      requiredSkills: ['cutting', 'measuring', 'material_handling'],
      predecessorStages: [],
      successorStages: ['frame_assembly'],
      qualityCheckpoints: [
        'Profile dimensions verified',
        'Kerf compensation applied correctly',
        'Material quality inspected'
      ],
      safetyRequirements: [
        'PPE required',
        'Machine guards operational',
        'Dust extraction active'
      ]
    },
    {
      id: 'frame_assembly',
      name: 'Frame Assembly',
      description: 'Assemble window frames with corner keys and structural reinforcement',
      estimatedDurationMinutes: 90,
      requiredSkills: ['assembly', 'welding', 'measurement'],
      predecessorStages: ['material_prep'],
      successorStages: ['sash_assembly'],
      qualityCheckpoints: [
        'Corner joints square and aligned',
        'Structural integrity verified',
        'Dimensions within tolerance'
      ],
      safetyRequirements: [
        'Heavy lifting protocols',
        'Welding safety procedures'
      ]
    },
    {
      id: 'sash_assembly',
      name: 'Sash Assembly',
      description: 'Assemble movable sashes with weather seals and preliminary hardware',
      estimatedDurationMinutes: 75,
      requiredSkills: ['assembly', 'hardware', 'sealing'],
      predecessorStages: ['frame_assembly'],
      successorStages: ['glazing'],
      qualityCheckpoints: [
        'Sash movement smooth',
        'Weather seals properly installed',
        'Hardware alignment verified'
      ],
      safetyRequirements: [
        'Precision tool handling',
        'Ergonomic lifting practices'
      ]
    },
    {
      id: 'glazing',
      name: 'Glazing Installation',
      description: 'Install glass panels with proper bedding and weather sealing',
      estimatedDurationMinutes: 60,
      requiredSkills: ['glazing', 'sealing', 'measurement'],
      predecessorStages: ['sash_assembly'],
      successorStages: ['hardware_install'],
      qualityCheckpoints: [
        'Glass panels secure',
        'Seals continuous and proper depth',
        'No glass damage or contamination'
      ],
      safetyRequirements: [
        'Glass handling procedures',
        'Sealant ventilation'
      ]
    },
    {
      id: 'hardware_install',
      name: 'Hardware Installation',
      description: 'Install all handles, hinges, locks, rollers with proper torque settings',
      estimatedDurationMinutes: 45,
      requiredSkills: ['hardware', 'tool_calibration'],
      predecessorStages: ['glazing'],
      successorStages: ['quality_check'],
      qualityCheckpoints: [
        'Hardware securely fastened',
        'Torque settings verified',
        'Operation smooth and secure'
      ],
      safetyRequirements: [
        'Power tool safety',
        'Proper torque procedures'
      ]
    },
    {
      id: 'quality_check',
      name: 'Quality Control & Final Inspection',
      description: 'Complete quality inspection, functional testing, and final approval',
      estimatedDurationMinutes: 30,
      requiredSkills: ['quality_control', 'testing'],
      predecessorStages: ['hardware_install'],
      successorStages: [],
      qualityCheckpoints: [
        'All operations functional',
        'Dimensions within final tolerance',
        'Visual quality standards met',
        'Safety requirements verified'
      ],
      safetyRequirements: [
        'Testing procedures',
        'Documentation completeness'
      ]
    }
  ],
  transitions: [
    {
      fromStage: 'material_prep',
      toStage: 'frame_assembly',
      conditions: ['All profiles cut and prepared', 'Quality inspection passed'],
      automated: false
    },
    {
      fromStage: 'frame_assembly',
      toStage: 'sash_assembly',
      conditions: ['Frame structurally sound', 'Dimensions verified'],
      automated: false
    },
    {
      fromStage: 'sash_assembly',
      toStage: 'glazing',
      conditions: ['Sash movement tested', 'Seals installed'],
      automated: false
    },
    {
      fromStage: 'glazing',
      toStage: 'hardware_install',
      conditions: ['Glass securely installed', 'Seals cured'],
      automated: false
    },
    {
      fromStage: 'hardware_install',
      toStage: 'quality_check',
      conditions: ['Hardware operational', 'Torque verified'],
      automated: false
    }
  ]
};