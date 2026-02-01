/**
 * Tax Exemption Handler
 * 
 * Gold-tier service for managing tax exemptions and certificates.
 * 
 * Features:
 * - Exemption certificate validation
 * - Customer exemption management
 * - Product exemption rules
 * - Exemption expiration tracking
 * - Audit trail
 * 
 * Usage:
 * ```typescript
 * const isExempt = await TaxExemptionHandler.isCustomerExempt(customerId, region);
 * ```
 */

import { supabase } from '@/lib/supabase';
import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import type { TaxRegion } from './TaxCalculationEngine';

/**
 * Exemption certificate
 */
export interface ExemptionCertificate {
  id: string;
  customerId: string;
  certificateNumber: string;
  region: TaxRegion;
  exemptionType: 'full' | 'partial';
  exemptionRate?: number; // For partial exemptions (0-1)
  validFrom: Date;
  validUntil: Date;
  status: 'active' | 'expired' | 'revoked';
  reason?: string;
  issuedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Exemption validation result
 */
export interface ExemptionValidationResult {
  isValid: boolean;
  isExempt: boolean;
  certificate?: ExemptionCertificate;
  error?: string;
  expirationDays?: number;
}

/**
 * Tax Exemption Handler
 */
export class TaxExemptionHandler {
  /**
   * Check if customer is tax exempt
   */
  static async isCustomerExempt(
    customerId: string,
    region: TaxRegion
  ): Promise<ExemptionValidationResult> {
    try {
      const { data, error } = await (supabase
        .from('tax_exemptions') as any)
        .select('*')
        .eq('customer_id', customerId)
        .eq('region', region)
        .eq('status', 'active')
        .gte('valid_until', new Date().toISOString())
        .single();

      if (error || !data) {
        return {
          isValid: true,
          isExempt: false,
        };
      }

      const certificate: ExemptionCertificate = {
        id: data.id,
        customerId: data.customer_id,
        certificateNumber: data.certificate_number,
        region: data.region,
        exemptionType: data.exemption_type,
        exemptionRate: data.exemption_rate,
        validFrom: new Date(data.valid_from),
        validUntil: new Date(data.valid_until),
        status: data.status,
        reason: data.reason,
        issuedBy: data.issued_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      const expirationDays = Math.floor(
        (certificate.validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        isValid: true,
        isExempt: true,
        certificate,
        expirationDays,
      };
    } catch (error) {
      console.error('Failed to check customer exemption:', error);
      return {
        isValid: false,
        isExempt: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate exemption certificate
   */
  static async validateCertificate(
    certificateNumber: string,
    region: TaxRegion
  ): Promise<ExemptionValidationResult> {
    try {
      const { data, error } = await (supabase
        .from('tax_exemptions') as any)
        .select('*')
        .eq('certificate_number', certificateNumber)
        .eq('region', region)
        .single();

      if (error || !data) {
        return {
          isValid: false,
          isExempt: false,
          error: 'Certificate not found',
        };
      }

      const certificate: ExemptionCertificate = {
        id: data.id,
        customerId: data.customer_id,
        certificateNumber: data.certificate_number,
        region: data.region,
        exemptionType: data.exemption_type,
        exemptionRate: data.exemption_rate,
        validFrom: new Date(data.valid_from),
        validUntil: new Date(data.valid_until),
        status: data.status,
        reason: data.reason,
        issuedBy: data.issued_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      // Check if certificate is expired
      const now = new Date();
      if (certificate.validUntil < now) {
        return {
          isValid: true,
          isExempt: false,
          certificate,
          error: 'Certificate expired',
        };
      }

      // Check if certificate is revoked
      if (certificate.status === 'revoked') {
        return {
          isValid: true,
          isExempt: false,
          certificate,
          error: 'Certificate revoked',
        };
      }

      const expirationDays = Math.floor(
        (certificate.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        isValid: true,
        isExempt: certificate.status === 'active',
        certificate,
        expirationDays,
      };
    } catch (error) {
      console.error('Failed to validate certificate:', error);
      return {
        isValid: false,
        isExempt: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create exemption certificate
   */
  static async createCertificate(
    certificate: Omit<ExemptionCertificate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ExemptionCertificate> {
    try {
      const now = new Date();
      const newCertificate: ExemptionCertificate = {
        id: `exempt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        ...certificate,
        createdAt: now,
        updatedAt: now,
      };

      // Store in database
      await (supabase.from('tax_exemptions') as any).insert({
        id: newCertificate.id,
        customer_id: certificate.customerId,
        certificate_number: certificate.certificateNumber,
        region: certificate.region,
        exemption_type: certificate.exemptionType,
        exemption_rate: certificate.exemptionRate,
        valid_from: certificate.validFrom.toISOString(),
        valid_until: certificate.validUntil.toISOString(),
        status: certificate.status,
        reason: certificate.reason,
        issued_by: certificate.issuedBy,
        created_at: newCertificate.createdAt.toISOString(),
        updated_at: newCertificate.updatedAt.toISOString(),
      });

      // Log activity
      await ActivityLogger.log({
        entityType: 'customer',
        entityId: certificate.customerId,
        eventType: ActivityEventTypes.CUSTOMER_UPDATED,
        metadata: {
          description: `Tax exemption certificate created: ${certificate.certificateNumber}`,
          certificate_id: newCertificate.id,
          region: certificate.region,
          exemption_type: certificate.exemptionType,
        },
      });

      return newCertificate;
    } catch (error) {
      console.error('Failed to create exemption certificate:', error);
      throw error;
    }
  }

  /**
   * Revoke exemption certificate
   */
  static async revokeCertificate(
    certificateId: string,
    reason?: string
  ): Promise<void> {
    try {
      await (supabase.from('tax_exemptions') as any)
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
          reason: reason || 'Revoked by administrator',
        })
        .eq('id', certificateId);

      // Log activity
      await ActivityLogger.log({
        entityType: 'customer',
        entityId: certificateId,
        eventType: ActivityEventTypes.CUSTOMER_UPDATED,
        metadata: {
          description: `Tax exemption certificate revoked: ${certificateId}`,
          reason: reason || 'Revoked by administrator',
        },
      });
    } catch (error) {
      console.error('Failed to revoke certificate:', error);
      throw error;
    }
  }

  /**
   * Get all exemptions for a customer
   */
  static async getCustomerExemptions(customerId: string): Promise<ExemptionCertificate[]> {
    try {
      const { data, error } = await (supabase
        .from('tax_exemptions') as any)
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        customerId: item.customer_id,
        certificateNumber: item.certificate_number,
        region: item.region,
        exemptionType: item.exemption_type,
        exemptionRate: item.exemption_rate,
        validFrom: new Date(item.valid_from),
        validUntil: new Date(item.valid_until),
        status: item.status,
        reason: item.reason,
        issuedBy: item.issued_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));
    } catch (error) {
      console.error('Failed to get customer exemptions:', error);
      return [];
    }
  }

  /**
   * Get expiring exemptions (within next N days)
   */
  static async getExpiringExemptions(days: number = 30): Promise<ExemptionCertificate[]> {
    try {
      const now = new Date();
      const expirationDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { data, error } = await (supabase
        .from('tax_exemptions') as any)
        .select('*')
        .eq('status', 'active')
        .gte('valid_until', now.toISOString())
        .lte('valid_until', expirationDate.toISOString())
        .order('valid_until', { ascending: true });

      if (error || !data) {
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        customerId: item.customer_id,
        certificateNumber: item.certificate_number,
        region: item.region,
        exemptionType: item.exemption_type,
        exemptionRate: item.exemption_rate,
        validFrom: new Date(item.valid_from),
        validUntil: new Date(item.valid_until),
        status: item.status,
        reason: item.reason,
        issuedBy: item.issued_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));
    } catch (error) {
      console.error('Failed to get expiring exemptions:', error);
      return [];
    }
  }
}

