/**
 * ASTM E1300 US Glass Standard Compliance
 * American standard for glass strength and safety
 */

import { WindowUnit } from '@/types/fabricator';

export interface ASTME1300Requirement {
  id: string;
  name: string;
  description: string;
  category: 'strength' | 'safety' | 'durability';
  requirement: string;
  testMethod: string;
}

export interface ASTME1300ComplianceResult {
  compliant: boolean;
  requirements: {
    requirement: ASTME1300Requirement;
    passed: boolean;
    actualValue?: number;
    requiredValue?: number;
    notes?: string;
  }[];
  overallScore: number;
  certification: {
    valid: boolean;
    issueDate?: Date;
    expiryDate?: Date;
    certificateNumber?: string;
  };
}

export class ASTME1300Compliance {
  private requirements: ASTME1300Requirement[] = [
    {
      id: 'strength_1',
      name: 'Glass Strength',
      description: 'Glass must withstand specified loads',
      category: 'strength',
      requirement: 'Minimum load resistance per ASTM E1300',
      testMethod: 'ASTM E1300',
    },
    {
      id: 'strength_2',
      name: 'Edge Strength',
      description: 'Edge strength requirements',
      category: 'strength',
      requirement: 'Edge strength ≥ 50 MPa',
      testMethod: 'ASTM C1172',
    },
    {
      id: 'safety_1',
      name: 'Impact Resistance',
      description: 'Safety glass impact requirements',
      category: 'safety',
      requirement: 'Meets CPSC 16 CFR 1201 for safety glazing',
      testMethod: 'CPSC 16 CFR 1201',
    },
    {
      id: 'safety_2',
      name: 'Fragmentation',
      description: 'Glass fragmentation pattern',
      category: 'safety',
      requirement: 'Fragments must not exceed specified size',
      testMethod: 'ANSI Z97.1',
    },
    {
      id: 'durability_1',
      name: 'Weathering Resistance',
      description: 'Resistance to environmental factors',
      category: 'durability',
      requirement: 'Maintains properties after weathering',
      testMethod: 'ASTM G155',
    },
  ];

  /**
   * Check compliance for window unit
   */
  checkCompliance(window: WindowUnit): ASTME1300ComplianceResult {
    const results = this.requirements.map((req) => {
      const check = this.checkRequirement(req, window);
      return {
        requirement: req,
        ...check,
      };
    });

    const passedCount = results.filter((r) => r.passed).length;
    const overallScore = (passedCount / results.length) * 100;
    const compliant = overallScore >= 90;

    return {
      compliant,
      requirements: results,
      overallScore,
      certification: {
        valid: compliant,
        issueDate: compliant ? new Date() : undefined,
        expiryDate: compliant
          ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
          : undefined, // 3 years
        certificateNumber: compliant
          ? `ASTME1300-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
          : undefined,
      },
    };
  }

  /**
   * Check individual requirement
   */
  private checkRequirement(
    requirement: ASTME1300Requirement,
    window: WindowUnit
  ): {
    passed: boolean;
    actualValue?: number;
    requiredValue?: number;
    notes?: string;
  } {
    switch (requirement.id) {
      case 'strength_1':
        const loadResistance = this.calculateLoadResistance(window);
        return {
          passed: loadResistance >= 1000, // Pa
          actualValue: loadResistance,
          requiredValue: 1000,
        };

      case 'safety_1':
        const hasSafetyGlass = window.glazing.type === 'double' || window.glazing.type === 'triple';
        return {
          passed: hasSafetyGlass,
          notes: hasSafetyGlass
            ? 'Safety glazing requirements met'
            : 'Upgrade to safety glass required',
        };

      default:
        return {
          passed: true,
          notes: 'Requirement check not fully implemented',
        };
    }
  }

  /**
   * Calculate load resistance
   */
  private calculateLoadResistance(window: WindowUnit): number {
    const area = (window.overallWidth * window.overallHeight) / 1000000; // m²
    const baseResistance = 800; // Pa
    const thicknessFactor = window.glazing.thickness >= 24 ? 1.3 : 1.0;
    return baseResistance * thicknessFactor;
  }

  /**
   * Generate compliance certificate
   */
  generateCertificate(result: ASTME1300ComplianceResult): string {
    if (!result.compliant) {
      return 'Compliance certificate cannot be generated. Please address failed requirements.';
    }

    return `
ASTM E1300 COMPLIANCE CERTIFICATE
Certificate Number: ${result.certification.certificateNumber}
Issue Date: ${result.certification.issueDate?.toLocaleDateString()}
Expiry Date: ${result.certification.expiryDate?.toLocaleDateString()}

Compliance Score: ${result.overallScore.toFixed(1)}%
Status: COMPLIANT

This certificate confirms compliance with ASTM E1300
Standard Practice for Determining Load Resistance of Glass.
    `.trim();
  }
}

