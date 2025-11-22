/**
 * Automated Quality Audit System
 * Tracks quality metrics and compliance
 */

import { WindowUnit } from '@/types/fabricator';
import { EN14351ComplianceResult } from './EN14351';
import { ASTME1300ComplianceResult } from './ASTME1300';

export interface QualityMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  timestamp: Date;
}

export interface QualityAudit {
  id: string;
  projectId: string;
  auditDate: Date;
  auditor?: string;
  metrics: QualityMetric[];
  en14351Result?: EN14351ComplianceResult;
  astme1300Result?: ASTME1300ComplianceResult;
  overallScore: number;
  status: 'passed' | 'failed' | 'conditional';
  issues: string[];
  recommendations: string[];
}

export interface AuditTrail {
  projectId: string;
  audits: QualityAudit[];
  firstAuditDate: Date;
  lastAuditDate: Date;
  averageScore: number;
}

export class QualityAudit {
  private audits: Map<string, QualityAudit[]> = new Map();

  /**
   * Perform quality audit on project
   */
  performAudit(
    project: WindowUnit,
    en14351Result?: EN14351ComplianceResult,
    astme1300Result?: ASTME1300ComplianceResult
  ): QualityAudit {
    const metrics: QualityMetric[] = [
      {
        id: 'dimension_accuracy',
        name: 'Dimension Accuracy',
        value: this.checkDimensionAccuracy(project),
        unit: '%',
        target: 98,
        status: this.checkDimensionAccuracy(project) >= 98 ? 'pass' : 'fail',
        timestamp: new Date(),
      },
      {
        id: 'profile_quality',
        name: 'Profile Quality',
        value: this.checkProfileQuality(project),
        unit: 'score',
        target: 8,
        status: this.checkProfileQuality(project) >= 8 ? 'pass' : 'warning',
        timestamp: new Date(),
      },
      {
        id: 'glazing_quality',
        name: 'Glazing Quality',
        value: this.checkGlazingQuality(project),
        unit: 'score',
        target: 8,
        status: this.checkGlazingQuality(project) >= 8 ? 'pass' : 'warning',
        timestamp: new Date(),
      },
      {
        id: 'hardware_installation',
        name: 'Hardware Installation',
        value: this.checkHardwareInstallation(project),
        unit: 'score',
        target: 8,
        status: this.checkHardwareInstallation(project) >= 8 ? 'pass' : 'warning',
        timestamp: new Date(),
      },
    ];

    const overallScore =
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    const failedMetrics = metrics.filter((m) => m.status === 'fail');
    const warningMetrics = metrics.filter((m) => m.status === 'warning');

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (failedMetrics.length > 0) {
      issues.push(
        `${failedMetrics.length} quality metric(s) failed inspection`
      );
      recommendations.push('Review and correct failed quality metrics');
    }

    if (warningMetrics.length > 0) {
      issues.push(
        `${warningMetrics.length} quality metric(s) below optimal level`
      );
      recommendations.push('Consider improvements for warning metrics');
    }

    if (en14351Result && !en14351Result.compliant) {
      issues.push('EN 14351 compliance not met');
      recommendations.push('Address EN 14351 compliance issues');
    }

    if (astme1300Result && !astme1300Result.compliant) {
      issues.push('ASTM E1300 compliance not met');
      recommendations.push('Address ASTM E1300 compliance issues');
    }

    const status: QualityAudit['status'] =
      failedMetrics.length === 0 && overallScore >= 85
        ? 'passed'
        : failedMetrics.length > 0
        ? 'failed'
        : 'conditional';

    const audit: QualityAudit = {
      id: `audit_${Date.now()}`,
      projectId: project.id,
      auditDate: new Date(),
      metrics,
      en14351Result,
      astme1300Result,
      overallScore,
      status,
      issues,
      recommendations,
    };

    // Store audit
    const projectAudits = this.audits.get(project.id) || [];
    projectAudits.push(audit);
    this.audits.set(project.id, projectAudits);

    return audit;
  }

  /**
   * Get audit trail for project
   */
  getAuditTrail(projectId: string): AuditTrail | null {
    const audits = this.audits.get(projectId);
    if (!audits || audits.length === 0) return null;

    const sortedAudits = audits.sort(
      (a, b) => a.auditDate.getTime() - b.auditDate.getTime()
    );
    const averageScore =
      audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length;

    return {
      projectId,
      audits: sortedAudits,
      firstAuditDate: sortedAudits[0].auditDate,
      lastAuditDate: sortedAudits[sortedAudits.length - 1].auditDate,
      averageScore,
    };
  }

  /**
   * Check dimension accuracy
   */
  private checkDimensionAccuracy(project: WindowUnit): number {
    // Simulate dimension check
    return 98.5; // 98.5% accuracy
  }

  /**
   * Check profile quality
   */
  private checkProfileQuality(project: WindowUnit): number {
    // Simulate profile quality check
    return 8.5; // Score out of 10
  }

  /**
   * Check glazing quality
   */
  private checkGlazingQuality(project: WindowUnit): number {
    // Simulate glazing quality check
    return 8.2; // Score out of 10
  }

  /**
   * Check hardware installation
   */
  private checkHardwareInstallation(project: WindowUnit): number {
    // Simulate hardware installation check
    return 8.8; // Score out of 10
  }

  /**
   * Get quality trends
   */
  getQualityTrends(days: number = 30): {
    date: string;
    averageScore: number;
    passRate: number;
  }[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const trends: Map<string, { scores: number[]; passed: number; total: number }> =
      new Map();

    for (const audits of this.audits.values()) {
      for (const audit of audits) {
        if (audit.auditDate < cutoffDate) continue;

        const dateKey = audit.auditDate.toISOString().split('T')[0];
        const existing = trends.get(dateKey) || {
          scores: [],
          passed: 0,
          total: 0,
        };

        existing.scores.push(audit.overallScore);
        existing.total += 1;
        if (audit.status === 'passed') existing.passed += 1;

        trends.set(dateKey, existing);
      }
    }

    return Array.from(trends.entries())
      .map(([date, data]) => ({
        date,
        averageScore:
          data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
        passRate: (data.passed / data.total) * 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

