/**
 * Production Service API
 *
 * Database operations for production projects and reports
 * RA Workshop parity - Phase 1 implementation
 */

import { supabase } from '@/lib/supabase';
import { executionService } from './executionService';
import type { WindowUnit } from '@/types/fabricator';
import type { ExecutionStage, ExecutionFeedback } from '@/types/execution';

export interface ProductionProject {
  id: string;
  user_id: string;
  name: string;
  grouping_mode: 'color' | 'type' | 'profile' | 'none';
  filters: Record<string, any>;
  status: 'draft' | 'queued' | 'in_progress' | 'completed' | 'cancelled';
  window_count: number;
  total_bom_cost: number;
  total_labor_hours: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  notes?: string;
}

export interface ProductionProjectItem {
  id: string;
  production_project_id: string;
  window_unit_id: string;
  window_order: number;
  group_key: string;
  created_at: string;
}

export interface ProductionReport {
  id: string;
  production_project_id: string;
  report_type: 'execution_plan' | 'cutting_list' | 'purchase_order' | 'labor_summary' | 'waste_summary';
  payload_json: any;
  file_size_bytes?: number;
  page_count?: number;
  generated_by_user_id?: string;
  created_at: string;
}

/**
 * Production Service for database operations
 */
export class ProductionService {
  private db = supabase as any;
  /**
   * Create a new production project
   */
  async createProject(
    name: string,
    groupingMode: 'color' | 'type' | 'profile' | 'none' = 'none',
    notes?: string
  ): Promise<ProductionProject> {
    const { data, error } = await this.db
      .from('production_projects')
      .insert({
        name,
        grouping_mode: groupingMode,
        status: 'draft',
        window_count: 0,
        total_bom_cost: 0,
        notes
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create production project: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all production projects for the current user
   */
  async getProjects(): Promise<ProductionProject[]> {
    const { data, error } = await this.db
      .from('production_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch production projects: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific production project
   */
  async getProject(projectId: string): Promise<ProductionProject | null> {
    const { data, error } = await this.db
      .from('production_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch production project: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a production project
   */
  async updateProject(
    projectId: string,
    updates: Partial<Omit<ProductionProject, 'id' | 'user_id' | 'created_at'>>
  ): Promise<ProductionProject> {
    const { data, error } = await this.db
      .from('production_projects')
      .update(updates as any)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update production project: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a production project
   */
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await this.db
      .from('production_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to delete production project: ${error.message}`);
    }
  }

  /**
   * Add window unit to production project
   */
  async addWindowToProject(
    projectId: string,
    windowUnit: WindowUnit,
    groupKey: string = 'default'
  ): Promise<ProductionProjectItem> {
    // Get current max order
    const { data: existingItems } = await this.db
      .from('production_project_items')
      .select('window_order')
      .eq('production_project_id', projectId)
      .order('window_order', { ascending: false })
      .limit(1);

    const nextOrder = existingItems && existingItems.length > 0
      ? existingItems[0].window_order + 1
      : 0;

    const { data, error } = await this.db
      .from('production_project_items')
      .insert({
        production_project_id: projectId,
        window_unit_id: windowUnit.id,
        window_order: nextOrder,
        group_key: groupKey
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add window to project: ${error.message}`);
    }

    // Update project window count
    await this.updateProjectWindowCount(projectId);

    return data;
  }

  /**
   * Get project items
   */
  async getProjectItems(projectId: string): Promise<ProductionProjectItem[]> {
    const { data, error } = await this.db
      .from('production_project_items')
      .select('*')
      .eq('production_project_id', projectId)
      .order('window_order');

    if (error) {
      throw new Error(`Failed to fetch project items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Remove window from project
   */
  async removeWindowFromProject(projectId: string, windowUnitId: string): Promise<void> {
    const { error } = await this.db
      .from('production_project_items')
      .delete()
      .eq('production_project_id', projectId)
      .eq('window_unit_id', windowUnitId);

    if (error) {
      throw new Error(`Failed to remove window from project: ${error.message}`);
    }

    // Update project window count
    await this.updateProjectWindowCount(projectId);
  }

  /**
   * Create production report
   */
  async createReport(
    projectId: string,
    reportType: ProductionReport['report_type'],
    payload: any,
    fileSizeBytes?: number,
    pageCount?: number
  ): Promise<ProductionReport> {
    const { data, error } = await this.db
      .from('production_reports')
      .insert({
        production_project_id: projectId,
        report_type: reportType,
        payload_json: payload,
        file_size_bytes: fileSizeBytes,
        page_count: pageCount
      } as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create production report: ${error.message}`);
    }

    return data;
  }

  /**
   * Get project reports
   */
  async getProjectReports(projectId: string): Promise<ProductionReport[]> {
    const { data, error } = await this.db
      .from('production_reports')
      .select('*')
      .eq('production_project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch project reports: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get specific report
   */
  async getReport(reportId: string): Promise<ProductionReport | null> {
    const { data, error } = await this.db
      .from('production_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch report: ${error.message}`);
    }

    return data;
  }

  /**
   * Update project window count
   */
  private async updateProjectWindowCount(projectId: string): Promise<void> {
    const { count, error } = await this.db
      .from('production_project_items')
      .select('*', { count: 'exact', head: true })
      .eq('production_project_id', projectId);

    if (error) {
      console.error('Failed to count project items:', error);
      return;
    }

    await this.db
      .from('production_projects')
      .update({ window_count: count || 0 } as any)
      .eq('id', projectId);
  }

  /**
   * Initialize execution stages for a project
   */
  async initializeExecutionStages(projectId: string): Promise<ExecutionStage[]> {
    return executionService.initializeExecutionStages(projectId);
  }

  /**
   * Get execution stages for a project
   */
  async getExecutionStages(projectId: string): Promise<ExecutionStage[]> {
    return executionService.getExecutionStages(projectId);
  }

  /**
   * Get execution summary for a project
   */
  async getExecutionSummary(projectId: string) {
    return executionService.getExecutionSummary(projectId);
  }

  /**
   * Update execution stage status with feedback
   */
  async updateExecutionStage(
    stageId: string,
    feedback: ExecutionFeedback
  ): Promise<ExecutionStage> {
    return executionService.updateStageStatus(stageId, feedback.status, feedback);
  }

  /**
   * Start execution stage
   */
  async startExecutionStage(stageId: string): Promise<ExecutionStage> {
    return executionService.updateStageStatus(stageId, 'in_progress');
  }

  /**
   * Complete execution stage with feedback
   */
  async completeExecutionStage(
    stageId: string,
    feedback: Omit<ExecutionFeedback, 'status'>
  ): Promise<ExecutionStage> {
    return executionService.updateStageStatus(stageId, 'completed', {
      ...feedback,
      status: 'completed'
    });
  }

  /**
   * Fail execution stage with feedback
   */
  async failExecutionStage(
    stageId: string,
    feedback: Omit<ExecutionFeedback, 'status'>
  ): Promise<ExecutionStage> {
    return executionService.updateStageStatus(stageId, 'failed', {
      ...feedback,
      status: 'failed'
    });
  }
}

// Singleton instance
export const productionService = new ProductionService();