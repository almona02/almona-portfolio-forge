/**
 * Legacy pose stepper. Canonical workflow chrome is FabricatorWorkflowBar
 * on StudioLayout (FP-025A). This module re-exports it and keeps a no-op
 * named export so PoseWorkflowLayout does not render a second bar.
 */
export { FabricatorWorkflowBar as WorkflowStepNavigator } from '@/components/fabricator/shell/FabricatorWorkflowBar';
export { FabricatorWorkflowBar } from '@/components/fabricator/shell/FabricatorWorkflowBar';
