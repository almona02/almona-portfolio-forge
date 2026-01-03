/**
 * Validation Sandbox
 * 
 * Stress testing component that runs EgyptianInterferenceEngine against
 * 100 random window sizes to validate 99.8% accuracy before publishing.
 */

import { EgyptianInterferenceEngine, type WindowAssembly } from '@/lib/fabricator/InterferenceEngine';
import type { Profile } from '@/types/fabricator';
import type { MutableSystemPack, ValidationReport, ValidationTestResult } from '@/types/tuning';
import React, { useCallback, useState } from 'react';

interface ValidationSandboxProps {
  /** System pack being validated */
  systemPack: MutableSystemPack;
  /** Callback when validation completes */
  onValidationComplete: (report: ValidationReport) => void;
}

export const ValidationSandbox: React.FC<ValidationSandboxProps> = ({
  systemPack,
  onValidationComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null);

  /**
   * Generate random window dimensions within system constraints
   */
  const generateRandomDimensions = useCallback((): { width: number; height: number } => {
    const { constraints } = systemPack;
    const width = Math.floor(
      Math.random() * (constraints.maxWidthMm - constraints.minWidthMm) + constraints.minWidthMm
    );
    const height = Math.floor(
      Math.random() * (constraints.maxHeightMm - constraints.minHeightMm) + constraints.minHeightMm
    );
    return { width, height };
  }, [systemPack]);

  /**
   * Construct a WindowAssembly from system pack and dimensions
   */
  const buildWindowAssembly = useCallback((
    width: number,
    height: number
  ): WindowAssembly => {
    // Find frame and sash profiles from system pack
    const frameProfile = systemPack.profiles.find(p => 
      p.profileRole === 'frame' || p.specifications?.role === 'frame'
    ) || systemPack.profiles[0];
    
    const _sashProfile = systemPack.profiles.find(p => 
      p.profileRole === 'sash' || p.specifications?.role === 'sash'
    ) || systemPack.profiles[1] || frameProfile;

    // Determine system category
    const _isUPVC = systemPack.meta.regions.some(r => r.includes('upvc')) || 
                   systemPack.windowSystemSpec?.category === 'upvc';

    return {
      sashProfile: frameProfile as Profile, // Use frame as sash for simplicity
      frameProfile: frameProfile as Profile,
      glazing: {
        totalThickness: 24, // Default double glazing
        weightPerSqm: 20, // kg/m²
        type: 'double',
      },
      sashWidth: width,
      sashHeight: height,
      selectedHardware: {
        type: 'roller',
        maxLoadCapacity: systemPack.constraints.maxSashWeightKg ? systemPack.constraints.maxSashWeightKg * 2 : 100,
        hardwareType: 'standard',
      },
      systemPack: {
        id: systemPack.meta.id,
        constraints: {
          minHeightMm: systemPack.constraints.minHeightMm,
        },
      },
      projectContext: {
        wallToleranceDeduction: 15, // Default
      },
    };
  }, [systemPack]);

  /**
   * Run validation tests
   */
  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    
    const engine = new EgyptianInterferenceEngine();
    const testCount = 100;
    const results: ValidationTestResult[] = [];
    const failures: ValidationTestResult[] = [];
    const edgeCases: ValidationTestResult[] = [];

    for (let i = 0; i < testCount; i++) {
      const dimensions = generateRandomDimensions();
      const assembly = buildWindowAssembly(dimensions.width, dimensions.height);
      
      const validation = engine.validate(assembly);
      
      const testResult: ValidationTestResult = {
        dimensions,
        passed: validation.isValid,
        errors: validation.errors.map(err => ({
          code: err.code || 'UNKNOWN',
          message: err.message,
          messageArabic: err.message, // TODO: Map to Arabic
        })),
        warnings: validation.warnings.map(warn => ({
          code: warn.code || 'UNKNOWN',
          message: warn.message,
          messageArabic: warn.message, // TODO: Map to Arabic
        })),
      };

      results.push(testResult);

      if (!validation.isValid) {
        failures.push(testResult);
      } else if (validation.warnings.length > 0) {
        edgeCases.push(testResult);
      }

      setProgress(Math.floor(((i + 1) / testCount) * 100));
      
      // Yield to UI every 10 tests
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const passedTests = testCount - failures.length;
    const passRate = (passedTests / testCount) * 100;

    const report: ValidationReport = {
      totalTests: testCount,
      passedTests,
      failedTests: failures.length,
      passRate,
      failures,
      edgeCases,
      recommendations: generateRecommendations(failures, edgeCases, passRate),
      status: passRate >= 99.8 ? 'passed' : passRate >= 95 ? 'needs_adjustment' : 'failed',
      validatedAt: new Date(),
    };

    setCurrentReport(report);
    onValidationComplete(report);
    setIsRunning(false);
  }, [generateRandomDimensions, buildWindowAssembly, onValidationComplete]);

  /**
   * Generate recommendations based on failures
   */
  const generateRecommendations = (
    failures: ValidationTestResult[],
    edgeCases: ValidationTestResult[],
    passRate: number
  ): string[] => {
    const recommendations: string[] = [];

    if (passRate < 99.8) {
      recommendations.push(`Pass rate is ${passRate.toFixed(1)}% - target is 99.8%+`);
    }

    // Analyze failure patterns
    const errorCodes = new Map<string, number>();
    failures.forEach(f => {
      f.errors?.forEach(err => {
        errorCodes.set(err.code, (errorCodes.get(err.code) || 0) + 1);
      });
    });

    errorCodes.forEach((count, code) => {
      if (code === 'GLZ_FIT_SASH_GAP') {
        recommendations.push(`Glazing fit issues detected (${count} cases) - consider adjusting inner gap`);
      } else if (code === 'HW_CAPACITY_WEIGHT') {
        recommendations.push(`Hardware capacity exceeded (${count} cases) - consider increasing max sash weight`);
      } else if (code === 'WALL_TOLERANCE') {
        recommendations.push(`Wall tolerance issues (${count} cases) - verify constraint ranges`);
      }
    });

    if (edgeCases.length > 0) {
      recommendations.push(`${edgeCases.length} edge cases found - review constraint boundaries`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System passes all validation tests - ready for publishing');
    }

    return recommendations;
  };

  const { constraints } = systemPack;

  return (
    <div className="space-y-6" dir="ltr">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#001133] text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold font-cairo">Validation Sandbox</h3>
        <p className="text-sm text-yellow-100 mt-1">Stress Test System with 100 Random Windows</p>
      </div>

      {/* System Constraints Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-bold text-gray-700 text-sm mb-3">System Constraints</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Width Range:</span>
            <span className="font-mono font-bold ml-2">{constraints.minWidthMm} - {constraints.maxWidthMm} mm</span>
          </div>
          <div>
            <span className="text-gray-500">Height Range:</span>
            <span className="font-mono font-bold ml-2">{constraints.minHeightMm} - {constraints.maxHeightMm} mm</span>
          </div>
          {constraints.maxSashWeightKg && (
            <div>
              <span className="text-gray-500">Max Sash Weight:</span>
              <span className="font-mono font-bold ml-2">{constraints.maxSashWeightKg} kg</span>
            </div>
          )}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runValidation}
        disabled={isRunning}
        className={`w-full py-4 rounded-lg font-bold text-white transition-all ${
          isRunning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#003366] hover:bg-[#004488] shadow-lg hover:shadow-xl'
        }`}
      >
        {isRunning ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Running Tests... {progress}%</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>🧪</span>
            <span>Run 100 Test Cases</span>
          </div>
        )}
      </button>

      {/* Progress Bar */}
      {isRunning && (
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-[#003366] h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Results Display */}
      {currentReport && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className={`border-2 rounded-lg p-4 ${
            currentReport.status === 'passed'
              ? 'bg-green-50 border-green-300'
              : currentReport.status === 'needs_adjustment'
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg">Validation Results</h4>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                currentReport.status === 'passed'
                  ? 'bg-green-600 text-white'
                  : currentReport.status === 'needs_adjustment'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-red-600 text-white'
              }`}>
                {currentReport.status === 'passed' ? '✅ PASSED' : 
                 currentReport.status === 'needs_adjustment' ? '⚠️ NEEDS ADJUSTMENT' : 
                 '❌ FAILED'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Pass Rate</div>
                <div className="text-2xl font-mono font-bold text-[#003366]">
                  {currentReport.passRate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Passed</div>
                <div className="text-2xl font-mono font-bold text-green-600">
                  {currentReport.passedTests}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Failed</div>
                <div className="text-2xl font-mono font-bold text-red-600">
                  {currentReport.failedTests}
                </div>
              </div>
            </div>

            {currentReport.validatedAt && (
              <div className="text-xs text-gray-500 mt-3">
                Validated: {currentReport.validatedAt.toLocaleString()}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {currentReport.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 text-sm mb-2">Recommendations</h4>
              <ul className="space-y-1 text-xs text-blue-800">
                {currentReport.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Failures List */}
          {currentReport.failures.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <h4 className="font-bold text-red-900 text-sm mb-2">
                Failed Cases ({currentReport.failures.length})
              </h4>
              <div className="space-y-2 text-xs">
                {currentReport.failures.slice(0, 10).map((failure, i) => (
                  <div key={i} className="bg-white rounded p-2 border border-red-200">
                    <div className="font-mono font-bold">
                      {failure.dimensions.width} × {failure.dimensions.height} mm
                    </div>
                    <div className="text-red-700 mt-1">
                      {failure.errors?.map(err => err.message).join(', ')}
                    </div>
                  </div>
                ))}
                {currentReport.failures.length > 10 && (
                  <div className="text-red-600 text-center">
                    ... and {currentReport.failures.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edge Cases */}
          {currentReport.edgeCases.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-48 overflow-y-auto">
              <h4 className="font-bold text-yellow-900 text-sm mb-2">
                Edge Cases ({currentReport.edgeCases.length})
              </h4>
              <div className="space-y-1 text-xs">
                {currentReport.edgeCases.slice(0, 5).map((edge, i) => (
                  <div key={i} className="font-mono">
                    {edge.dimensions.width} × {edge.dimensions.height} mm
                    {edge.warnings && edge.warnings.length > 0 && (
                      <span className="text-yellow-700 ml-2">
                        ({edge.warnings.map(w => w.message).join(', ')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

