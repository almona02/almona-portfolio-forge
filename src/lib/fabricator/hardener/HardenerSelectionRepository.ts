/**
 * HardenerSelectionRepository - Database Persistence Layer
 * 
 * Provides database persistence for hardener selections and audit logs.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { supabase } from '@/lib/supabase';
import type { HardenerSelectionContext, HardenerSelectionResult } from './types';

/**
 * Database row for hardener_selections table
 */
export interface HardenerSelectionRow {
  id: string;
  window_unit_id: string;
  project_id?: string | null;
  user_id: string;
  profile_system: string;
  material: 'aluminum' | 'upvc';
  glass_thickness_mm: number;
  sash_width_mm: number;
  sash_height_mm: number;
  opening_type: 'casement' | 'tilt-turn' | 'sliding' | 'fixed' | 'pivot';
  region?: 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar' | null;
  hardener_code: string;
  rule_id: string;
  validation_status: 'PASS' | 'FAIL' | 'WARNING';
  system_stop_required: boolean;
  requires_human_intervention: boolean;
  validation_details: Record<string, unknown>;
  justification?: string | null;
  constitutional_disclaimer?: string | null;
  system_mode: 'sandbox' | 'production' | 'certified';
  created_at: string;
  updated_at: string;
}

/**
 * Database row for hardener_audit_log table
 */
export interface HardenerAuditLogRow {
  id: string;
  selection_id: string;
  window_unit_id: string;
  user_id?: string | null;
  selection_context: HardenerSelectionContext;
  selection_result: HardenerSelectionResult;
  audit_hash?: string | null;
  system_mode: 'sandbox' | 'production' | 'certified';
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

/** Supabase table builder for tables not in generated schema (insert/update chains) */
type SupabaseTableBuilder<T> = {
  insert: (v: unknown) => { select: () => { single: () => Promise<{ data: T | null; error: { message?: string } | null }> } };
  update: (v: unknown) => { eq: (col: string, val: string) => { select: () => { single: () => Promise<{ data: T | null; error: { message?: string } | null }> } } };
};

/**
 * Hardener Selection Repository
 * 
 * Handles all database operations for hardener selections.
 */
export class HardenerSelectionRepository {
  private static readonly SELECTIONS_TABLE = 'hardener_selections';
  private static readonly AUDIT_LOG_TABLE = 'hardener_audit_log';

  /**
   * Save hardener selection to database
   */
  static async saveSelection(
    windowUnitId: string,
    context: HardenerSelectionContext,
    result: HardenerSelectionResult,
    userId: string,
    projectId?: string,
    mode: 'sandbox' | 'production' | 'certified' = 'production'
  ): Promise<HardenerSelectionRow> {
    const selectionData = {
      window_unit_id: windowUnitId,
      project_id: projectId || null,
      user_id: userId,
      profile_system: context.profileSystem,
      material: context.material,
      glass_thickness_mm: context.glassThickness,
      sash_width_mm: context.sashWidth,
      sash_height_mm: context.sashHeight,
      opening_type: context.openingType,
      region: context.region || null,
      hardener_code: result.hardenerCode,
      rule_id: result.ruleId,
      validation_status: result.validation,
      system_stop_required: result.systemStopRequired,
      requires_human_intervention: result.requiresHumanIntervention,
      validation_details: {
        profileSystemMatch: result.validationDetails.profileSystemMatch,
        glassThicknessMatch: result.validationDetails.glassThicknessMatch,
        sashSizeMatch: result.validationDetails.sashSizeMatch,
        openingTypeMatch: result.validationDetails.openingTypeMatch,
        egyptianCodeCompliant: result.validationDetails.egyptianCodeCompliant,
        constraintViolations: result.validationDetails.constraintViolations,
      },
      justification: result.justification || null,
      constitutional_disclaimer: result.constitutionalDisclaimer || null,
      system_mode: mode,
    };

    // hardener_selections not in generated Database schema - cast needed for insert chain
    const { data, error } = await (supabase.from(this.SELECTIONS_TABLE) as unknown as SupabaseTableBuilder<HardenerSelectionRow>)
      .insert([selectionData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save hardener selection: ${error.message}`);
    }

    return data as HardenerSelectionRow;
  }

  /**
   * Get hardener selection by window unit ID
   */
  static async getSelectionByWindowUnit(
    windowUnitId: string,
    userId?: string
  ): Promise<HardenerSelectionRow | null> {
    let query = supabase
      .from(this.SELECTIONS_TABLE)
      .select('*')
      .eq('window_unit_id', windowUnitId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get hardener selection: ${error.message}`);
    }

    return data as HardenerSelectionRow | null;
  }

  /**
   * Get hardener selections by project ID
   */
  static async getSelectionsByProject(
    projectId: string,
    userId?: string
  ): Promise<HardenerSelectionRow[]> {
    let query = supabase
      .from(this.SELECTIONS_TABLE)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get hardener selections: ${error.message}`);
    }

    return (data || []) as HardenerSelectionRow[];
  }

  /**
   * Get hardener selections by user ID
   */
  static async getSelectionsByUser(
    userId: string,
    limit: number = 100
  ): Promise<HardenerSelectionRow[]> {
    const { data, error } = await supabase
      .from(this.SELECTIONS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get hardener selections: ${error.message}`);
    }

    return (data || []) as HardenerSelectionRow[];
  }

  /**
   * Update hardener selection
   */
  static async updateSelection(
    selectionId: string,
    updates: Partial<Omit<HardenerSelectionRow, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<HardenerSelectionRow> {
    const { data, error } = await (supabase.from(this.SELECTIONS_TABLE) as unknown as SupabaseTableBuilder<HardenerSelectionRow>)
      .update(updates)
      .eq('id', selectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update hardener selection: ${error.message}`);
    }

    return data as HardenerSelectionRow;
  }

  /**
   * Save audit log entry
   */
  static async saveAuditLog(
    selectionId: string,
    windowUnitId: string,
    context: HardenerSelectionContext,
    result: HardenerSelectionResult,
    userId?: string,
    auditHash?: string,
    mode: 'sandbox' | 'production' | 'certified' = 'production',
    ipAddress?: string,
    userAgent?: string
  ): Promise<HardenerAuditLogRow> {
    const auditData = {
      selection_id: selectionId,
      window_unit_id: windowUnitId,
      user_id: userId || null,
      selection_context: context,
      selection_result: result,
      audit_hash: auditHash || null,
      system_mode: mode,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    };

    const { data, error } = await (supabase.from(this.AUDIT_LOG_TABLE) as unknown as SupabaseTableBuilder<HardenerAuditLogRow>)
      .insert([auditData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save audit log: ${error.message}`);
    }

    return data as HardenerAuditLogRow;
  }

  /**
   * Get audit logs by selection ID
   */
  static async getAuditLogsBySelection(
    selectionId: string
  ): Promise<HardenerAuditLogRow[]> {
    const { data, error } = await supabase
      .from(this.AUDIT_LOG_TABLE)
      .select('*')
      .eq('selection_id', selectionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return (data || []) as HardenerAuditLogRow[];
  }

  /**
   * Get audit logs by window unit ID
   */
  static async getAuditLogsByWindowUnit(
    windowUnitId: string,
    limit: number = 100
  ): Promise<HardenerAuditLogRow[]> {
    const { data, error } = await supabase
      .from(this.AUDIT_LOG_TABLE)
      .select('*')
      .eq('window_unit_id', windowUnitId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return (data || []) as HardenerAuditLogRow[];
  }

  /**
   * Delete hardener selection (soft delete - marks as deleted)
   * Note: Hard deletes should be avoided for audit trail integrity
   */
  static async deleteSelection(selectionId: string): Promise<void> {
    // In production, prefer soft deletes or archival
    // For now, we'll use hard delete but this should be reviewed
    const { error } = await supabase
      .from(this.SELECTIONS_TABLE)
      .delete()
      .eq('id', selectionId);

    if (error) {
      throw new Error(`Failed to delete hardener selection: ${error.message}`);
    }
  }
}
