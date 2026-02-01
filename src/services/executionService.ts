/**
 * Execution Service - Phase 2: Closed-Loop Production
 *
 * Manages production execution stages, status transitions, feedback capture,
 * and inventory consumption tracking.
 */

import { supabase } from '@/lib/supabase';
import { EXECUTION_WORKFLOW, type ExecutionFeedback, type ExecutionLog, type ExecutionStage, type ExecutionStageId, type ExecutionStatus, type ExecutionSummary, type InventoryConsumption, type LogType } from '@/types/execution';

export class ExecutionService {
  /**
   * Initialize execution stages for a production project
   */
  async initializeExecutionStages(projectId: string): Promise<ExecutionStage[]> {
    const stages: ExecutionStage[] = EXECUTION_WORKFLOW.stages.map(stageDef => ({
      id: '', // Will be set by database
      productionProjectId: projectId,
      stageId: stageDef.id,
      stageName: stageDef.name,
      description: stageDef.description,
      status: 'pending' as const,
      estimatedDurationMinutes: stageDef.estimatedDurationMinutes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Insert all stages in batch
    const { data, error } = await supabase
      .from('execution_stages')
      .insert(stages.map(stage => ({
        production_project_id: stage.productionProjectId,
        stage_id: stage.stageId,
        stage_name: stage.stageName,
        description: stage.description,
        status: stage.status,
        estimated_duration_minutes: stage.estimatedDurationMinutes
      })) as any)
      .select();

    if (error) {
      throw new Error(`Failed to initialize execution stages: ${error.message}`);
    }

    return (data || []).map(this.mapExecutionStageFromDB);
  }

  /**
   * Get execution stages for a project
   */
  async getExecutionStages(projectId: string): Promise<ExecutionStage[]> {
    const { data, error } = await supabase
      .from('execution_stages')
      .select('*')
      .eq('production_project_id', projectId)
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch execution stages: ${error.message}`);
    }

    return (data || []).map(this.mapExecutionStageFromDB);
  }

  /**
   * Update execution stage status
   */
  async updateStageStatus(
    stageId: string,
    status: ExecutionStatus,
    feedback?: ExecutionFeedback
  ): Promise<ExecutionStage> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Handle status-specific updates
    if (status === 'in_progress' && !feedback) {
      updates.started_at = new Date().toISOString();
      updates.assigned_operator = 'current_user'; // Would get from auth context
    } else if ((status === 'completed' || status === 'failed') && feedback) {
      updates.completed_at = new Date().toISOString();
      updates.actual_duration_minutes = feedback.timeSpentMinutes;
      updates.quality_score = feedback.qualityScore;
      updates.notes = feedback.notes;

      // Log completion/rejection
      await this.logExecutionEvent(
        stageId,
        status === 'completed' ? 'completion' : 'error',
        feedback.notes || `Stage ${status}`,
        feedback
      );

      // Log issues if any
      if (feedback.issues && feedback.issues.length > 0) {
        for (const issue of feedback.issues) {
          await this.logExecutionEvent(stageId, 'warning', issue, { issue });
        }
      }

      // Handle inventory consumption data
      if (feedback.consumptionData && feedback.consumptionData.length > 0) {
        await this.recordInventoryConsumption(stageId, feedback.consumptionData);
      }
    }

    const { data, error } = await supabase
      .from('execution_stages')
      .update(updates as any)
      .eq('id', stageId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update stage status: ${error.message}`);
    }

    return this.mapExecutionStageFromDB(data);
  }

  /**
   * Log execution event
   */
  async logExecutionEvent(
    stageId: string,
    logType: LogType,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from('execution_logs')
      .insert({
        execution_stage_id: stageId,
        log_type: logType,
        message,
        metadata: metadata || {}
      } as any);

    if (error) {
      console.error('Failed to log execution event:', error);
      // Don't throw - logging failures shouldn't break execution flow
    }
  }

  /**
   * Record inventory consumption for a stage
   */
  async recordInventoryConsumption(
    stageId: string,
    consumptionData: {
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
    }[]
  ): Promise<void> {
    const consumptionRecords = consumptionData.map(item => ({
      execution_stage_id: stageId,
      bom_item_id: item.bomItemId,
      item_category: item.itemCategory,
      item_code: item.itemCode,
      item_name: item.itemName,
      planned_quantity: item.plannedQuantity,
      actual_quantity: item.actualQuantity,
      unit: item.unit,
      wastage_quantity: item.wastageQuantity ?? 0,
      wastage_reason: item.wastageReason,
      supplier: item.supplier,
      batch_number: item.batchNumber,
      quality_check_passed: item.qualityCheckPassed
    }));

    const { error } = await supabase
      .from('inventory_consumption')
      .insert(consumptionRecords as any);

    if (error) {
      throw new Error(`Failed to record inventory consumption: ${error.message}`);
    }
  }

  /**
   * Get execution logs for a stage
   */
  async getExecutionLogs(stageId: string): Promise<ExecutionLog[]> {
    const { data, error } = await supabase
      .from('execution_logs')
      .select('*')
      .eq('execution_stage_id', stageId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch execution logs: ${error.message}`);
    }

    return (data || []).map(this.mapExecutionLogFromDB);
  }

  /**
   * Get inventory consumption for a stage
   */
  async getInventoryConsumption(stageId: string): Promise<InventoryConsumption[]> {
    const { data, error } = await supabase
      .from('inventory_consumption')
      .select('*')
      .eq('execution_stage_id', stageId)
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch inventory consumption: ${error.message}`);
    }

    return (data || []).map(this.mapInventoryConsumptionFromDB);
  }

  /**
   * Generate execution summary for a project
   */
  async getExecutionSummary(projectId: string): Promise<ExecutionSummary> {
    const stages = await this.getExecutionStages(projectId);

    const totalStages = stages.length;
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const failedStages = stages.filter(s => s.status === 'failed').length;

    const qualityScores = stages
      .filter(s => s.qualityScore !== undefined)
      .map(s => s.qualityScore!);
    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;

    const totalTimeSpent = stages
      .filter(s => s.actualDurationMinutes !== undefined)
      .reduce((sum, stage) => sum + stage.actualDurationMinutes!, 0);

    const estimatedTime = stages.reduce((sum, stage) => sum + stage.estimatedDurationMinutes, 0);
    const efficiency = estimatedTime > 0 ? totalTimeSpent / estimatedTime : 0;

    // Calculate wastage summary
    const wastageData = await Promise.all(
      stages.map(stage => this.getInventoryConsumption(stage.id))
    );

    const allWastage = wastageData.flat();
    const totalWastage = allWastage.reduce((sum, item) => sum + item.wastageQuantity, 0);

    const wastageByCategory = allWastage.reduce((acc, item) => {
      acc[item.itemCategory] = (acc[item.itemCategory] || 0) + item.wastageQuantity;
      return acc;
    }, {} as Record<string, number>);

    const wastageReasons = allWastage
      .filter(item => item.wastageReason)
      .map(item => item.wastageReason!)
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const primaryReasons = Object.entries(wastageReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([reason]) => reason);

    return {
      projectId,
      totalStages,
      completedStages,
      failedStages,
      averageQualityScore,
      totalTimeSpent,
      efficiency,
      wastageSummary: {
        totalWastage,
        wastageByCategory,
        primaryReasons
      }
    };
  }

  /**
   * Check if stage can transition to new status
   */
  canTransitionStage(stage: ExecutionStage, newStatus: ExecutionStatus): boolean {
    const currentStatus = stage.status;

    // Define valid transitions
    const validTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
      pending: ['in_progress', 'skipped'],
      in_progress: ['completed', 'failed'],
      completed: [], // Terminal state
      failed: ['in_progress'], // Can retry
      skipped: [] // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get next available stages based on workflow
   */
  getNextStages(currentStageId: ExecutionStageId): ExecutionStageId[] {
    const stageDef = EXECUTION_WORKFLOW.stages.find(s => s.id === currentStageId);
    return stageDef?.successorStages || [];
  }

  // Private mapping methods
  private mapExecutionStageFromDB = (data: any): ExecutionStage => {
    return {
      id: data.id,
      productionProjectId: data.production_project_id,
      stageId: data.stage_id,
      stageName: data.stage_name,
      description: data.description,
      status: data.status,
      estimatedDurationMinutes: data.estimated_duration_minutes,
      actualDurationMinutes: data.actual_duration_minutes,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      assignedOperator: data.assigned_operator,
      notes: data.notes,
      qualityScore: data.quality_score,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapExecutionLogFromDB = (data: any): ExecutionLog => {
    return {
      id: data.id,
      executionStageId: data.execution_stage_id,
      logType: data.log_type,
      message: data.message,
      operatorId: data.operator_id,
      metadata: data.metadata,
      createdAt: data.created_at
    };
  }

  private mapInventoryConsumptionFromDB = (data: any): InventoryConsumption => {
    return {
      id: data.id,
      executionStageId: data.execution_stage_id,
      bomItemId: data.bom_item_id,
      itemCategory: data.item_category,
      itemCode: data.item_code,
      itemName: data.item_name,
      plannedQuantity: data.planned_quantity,
      actualQuantity: data.actual_quantity,
      unit: data.unit,
      wastageQuantity: data.wastage_quantity,
      wastageReason: data.wastage_reason,
      supplier: data.supplier,
      batchNumber: data.batch_number,
      qualityCheckPassed: data.quality_check_passed,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// Singleton instance
export const executionService = new ExecutionService();