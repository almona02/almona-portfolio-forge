/**
 * Pattern Library Audit Tool
 * 
 * Audits all Egyptian window patterns for completeness and data quality.
 * Identifies missing fields, calculates quality scores, and generates recommendations.
 * 
 * Usage: npx ts-node scripts/audit-patterns.ts
 * 
 * @since Phase 2B: Dual-Output Engine (Week 2 - Day 8)
 */

import * as fs from 'fs';
import * as path from 'path';
import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '../src/data/egyptian-window-patterns';

interface PatternAuditResult {
  patternId: string;
  patternName: string;
  status: 'complete' | 'partial' | 'incomplete';
  missingFields: string[];
  warnings: string[];
  recommendations: string[];
  dataQualityScore: number; // 0-100
}

export class PatternAuditor {
  private requiredFields = [
    'id',
    'name',
    'gridSpec',
  ] as const;
  
  private recommendedFields = [
    'frameProfile',
    'cuttingRules',
    'glazingSpec',
    'accessories',
    'constraints',
    'openingMechanism',
    'systemPack',
    'material',
    'recommendedMaterials',
  ] as const;
  
  auditAll(): PatternAuditResult[] {
    return EGYPTIAN_PATTERNS.map(pattern => this.auditPattern(pattern));
  }
  
  auditPattern(pattern: EgyptianPattern): PatternAuditResult {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const patternAny = pattern as any;
    
    // Check required fields
    this.requiredFields.forEach(field => {
      if (!this.hasValue(patternAny[field])) {
        missingFields.push(field);
      }
    });
    
    // Check recommended fields
    this.recommendedFields.forEach(field => {
      if (!this.hasValue(patternAny[field])) {
        warnings.push(`Missing recommended field: ${field}`);
      }
    });
    
    // Validate gridSpec
    if (pattern.gridSpec) {
      const gridIssues = this.validateGridSpec(pattern.gridSpec);
      warnings.push(...gridIssues);
    } else {
      missingFields.push('gridSpec');
    }
    
    // Validate frameProfile (if exists)
    if (patternAny.frameProfile) {
      const frameIssues = this.validateFrameProfile(patternAny.frameProfile);
      warnings.push(...frameIssues);
    }
    
    // Validate constraints (if exists)
    if (pattern.constraints) {
      const constraintIssues = this.validateConstraints(pattern.constraints);
      warnings.push(...constraintIssues);
    }
    
    // Generate recommendations
    if (missingFields.length === 0 && warnings.length === 0) {
      recommendations.push('Pattern is complete and ready for production use');
    } else if (missingFields.length > 0) {
      recommendations.push(
        `Add missing fields: ${missingFields.join(', ')}`
      );
    }
    
    if (!patternAny.frameProfile) {
      recommendations.push('Add frameProfile with width, depth, material, weightPerMeter, costPerMeter');
    }
    
    if (!patternAny.cuttingRules) {
      recommendations.push('Add cuttingRules with kerf, barTrim, miterAllowance');
    }
    
    if (!patternAny.glazingSpec) {
      recommendations.push('Add glazingSpec with edgeClearance, maxThickness');
    }
    
    // Calculate data quality score
    const dataQualityScore = this.calculateQualityScore(
      pattern,
      missingFields,
      warnings.length
    );
    
    // Determine status
    let status: 'complete' | 'partial' | 'incomplete';
    if (missingFields.length === 0 && warnings.length === 0) {
      status = 'complete';
    } else if (missingFields.length === 0 && warnings.length > 0) {
      status = 'partial';
    } else {
      status = 'incomplete';
    }
    
    return {
      patternId: pattern.id,
      patternName: pattern.name,
      status,
      missingFields,
      warnings,
      recommendations,
      dataQualityScore
    };
  }
  
  private validateGridSpec(gridSpec: any): string[] {
    const issues: string[] = [];
    
    if (!gridSpec.rows || gridSpec.rows < 1) {
      issues.push('gridSpec.rows must be at least 1');
    }
    
    if (!gridSpec.cols || gridSpec.cols < 1) {
      issues.push('gridSpec.cols must be at least 1');
    }
    
    if (!gridSpec.cells || gridSpec.cells.length === 0) {
      issues.push('gridSpec.cells is required and cannot be empty');
    } else {
      const expectedCells = gridSpec.rows * gridSpec.cols;
      if (gridSpec.cells.length !== expectedCells) {
        issues.push(`gridSpec.cells count (${gridSpec.cells.length}) should match rows × cols (${expectedCells})`);
      }
      
      // Check for valid cell types
      gridSpec.cells.forEach((cell: any, index: number) => {
        const validTypes = ['fixed', 'sash', 'sliding', 'panel', 'empty'];
        if (!validTypes.includes(cell.type)) {
          issues.push(`Cell ${index}: Invalid type "${cell.type}"`);
        }
      });
    }
    
    return issues;
  }
  
  private validateFrameProfile(frameProfile: any): string[] {
    const issues: string[] = [];
    
    if (!frameProfile.code) {
      issues.push('frameProfile.code is required');
    }
    
    if (!frameProfile.width || frameProfile.width <= 0) {
      issues.push('frameProfile.width must be positive');
    }
    
    if (!frameProfile.depth || frameProfile.depth <= 0) {
      issues.push('frameProfile.depth must be positive');
    }
    
    if (!frameProfile.weightPerMeter || frameProfile.weightPerMeter <= 0) {
      issues.push('frameProfile.weightPerMeter must be positive');
    }
    
    if (!frameProfile.costPerMeter || frameProfile.costPerMeter <= 0) {
      issues.push('frameProfile.costPerMeter must be positive');
    }
    
    return issues;
  }
  
  private validateConstraints(constraints: any): string[] {
    const issues: string[] = [];
    
    if (constraints.maxWidth && constraints.minWidth) {
      if (constraints.maxWidth < constraints.minWidth) {
        issues.push('constraints.maxWidth must be >= minWidth');
      }
    }
    
    if (constraints.maxSashArea && constraints.maxSashArea <= 0) {
      issues.push('constraints.maxSashArea must be positive');
    }
    
    return issues;
  }
  
  private calculateQualityScore(
    pattern: EgyptianPattern,
    missingFields: string[],
    warningCount: number
  ): number {
    const totalFields = this.requiredFields.length + this.recommendedFields.length;
    const missingFieldPenalty = missingFields.length * 10; // 10 points per missing required field
    const warningPenalty = warningCount * 2; // 2 points per warning
    
    let score = 100;
    score -= missingFieldPenalty;
    score -= warningPenalty;
    
    // Bonus for complete patterns
    if (missingFields.length === 0 && warningCount === 0) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  private hasValue(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  }
  
  generateReport(): void {
    const results = this.auditAll();
    
    console.log('=== PATTERN LIBRARY AUDIT REPORT ===\n');
    
    // Summary statistics
    const completePatterns = results.filter(r => r.status === 'complete');
    const partialPatterns = results.filter(r => r.status === 'partial');
    const incompletePatterns = results.filter(r => r.status === 'incomplete');
    
    console.log(`Total Patterns: ${results.length}`);
    console.log(`Complete: ${completePatterns.length} (${Math.round(completePatterns.length/results.length*100)}%)`);
    console.log(`Partial: ${partialPatterns.length} (${Math.round(partialPatterns.length/results.length*100)}%)`);
    console.log(`Incomplete: ${incompletePatterns.length} (${Math.round(incompletePatterns.length/results.length*100)}%)`);
    console.log(`\nAverage Quality Score: ${
      Math.round(results.reduce((sum, r) => sum + r.dataQualityScore, 0) / results.length)
    }/100\n`);
    
    // Detailed report for incomplete patterns
    if (incompletePatterns.length > 0) {
      console.log('=== INCOMPLETE PATTERNS (PRIORITY) ===');
      incompletePatterns.forEach(result => {
        console.log(`\n${result.patternName} (${result.patternId})`);
        console.log(`  Quality: ${result.dataQualityScore}/100`);
        console.log(`  Missing: ${result.missingFields.join(', ')}`);
        result.recommendations.forEach(rec => {
          console.log(`  → ${rec}`);
        });
      });
    }
    
    // Top recommendations
    console.log('\n=== TOP RECOMMENDATIONS ===');
    const allRecommendations = results.flatMap(r => r.recommendations);
    const recommendationCounts = new Map<string, number>();
    
    allRecommendations.forEach(rec => {
      recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
    });
    
    Array.from(recommendationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rec, count]) => {
        console.log(`  ${count}x: ${rec}`);
      });
    
    // Export to JSON
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        complete: completePatterns.length,
        partial: partialPatterns.length,
        incomplete: incompletePatterns.length,
        averageQualityScore: Math.round(results.reduce((sum, r) => sum + r.dataQualityScore, 0) / results.length)
      },
      patterns: results
    };
    
    const reportPath = path.join(process.cwd(), 'pattern-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Report saved to ${reportPath}`);
  }
}

// Run the audit if executed directly
if (require.main === module) {
  const auditor = new PatternAuditor();
  auditor.generateReport();
}

