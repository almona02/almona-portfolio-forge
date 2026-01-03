
import { ConsequenceAlert } from '@/components/authority/ConsequenceAlert';
import { MachineValidator } from '@/integrations/yilmaz/MachineValidator';
import { YilmazGCodeGenerator, YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { CuttingPlan, OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Code,
    DollarSign,
    Download,
    FileText,
    Loader2,
    Package,
    Scissors,
    Send,
    TrendingUp
} from 'lucide-react';
import React, { useState } from 'react';
// PHASE 4: PDFExportService is now lazy-loaded - see handleExportReport
import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { calculateManualCuttingPlan, compareWaste } from '@/lib/analytics/WasteCalculator';
import { ALM6510ExportOptions, alm6510MDBExport } from '@/lib/exports/ALM6510MDBExport';
import { lazyExportPDF } from '@/lib/exports/lazyExportHandlers';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { ProductionPreviewDialog } from './ProductionPreviewDialog';
import {
    CUTTING_OPTIMIZATION_CONSTANTS,
    DEFAULT_MACHINE_MODEL,
    MACHINE_CONSTANTS,
} from './cuttingOptimizationConstants';

interface CuttingOptimizationEngineProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
  isGenerating: boolean;
  profiles?: Profile[]; // Profiles for preview dialog
}

// Simple bin packing algorithm to optimize cutting
function optimizeCuttingPlan(cuttingPlan: CuttingPlan[]): CuttingPlan[] {
  // This is a placeholder for actual bin-packing or nesting algorithm
  // For each plan, calculate total cuts length, utilization, waste

  return cuttingPlan.map(plan => {
    const stockLength = plan.stockLength || CUTTING_OPTIMIZATION_CONSTANTS.STANDARD_STOCK_LENGTH_MM;
    const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const utilization = (totalCutLength / stockLength) * CUTTING_OPTIMIZATION_CONSTANTS.PERCENTAGE_MULTIPLIER;
    const totalWaste = stockLength - totalCutLength;

    return {
      ...plan,
      utilization: Number(utilization.toFixed(CUTTING_OPTIMIZATION_CONSTANTS.DECIMAL_PLACES)),
      totalWaste: Number(totalWaste.toFixed(CUTTING_OPTIMIZATION_CONSTANTS.DECIMAL_PLACES)),
    };
  });
}

export const CuttingOptimizationEngine: React.FC<CuttingOptimizationEngineProps> = ({
  project,
  optimization,
  isGenerating,
  profiles = [],
}) => {
  const [selectedMachine, setSelectedMachine] = useState<YilmazMachineModel>(DEFAULT_MACHINE_MODEL);
  const [isGeneratingGCode, setIsGeneratingGCode] = useState(false);
  const [isSendingToMachine, setIsSendingToMachine] = useState(false);
  const [gCodePreview, setGCodePreview] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [_showReportGenerator, _setShowReportGenerator] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showWasteComparison, setShowWasteComparison] = useState(false);
  const [wasteComparison, setWasteComparison] = useState<any>(null);
  const [showProductionPreview, setShowProductionPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState<'gcode' | 'report' | 'alm6510' | null>(null);
  const [isGeneratingALM6510, setIsGeneratingALM6510] = useState(false);
  const { branding } = useCompanyBranding();

  // Calculate waste comparison when optimization is available
  React.useEffect(() => {
    if (optimization && optimization.cuttingPlan.length > 0 && project) {
      try {
        // Collect all required cuts from components
        const requiredCuts = project.components.flatMap((comp) => {
          const cuts: any[] = [];
          for (let i = 0; i < (comp.quantity || 1); i++) {
            cuts.push({
              id: `${comp.id}-${i}`,
              profileId: comp.profile?.id || '',
              length: comp.cuttingLengths?.[0] || comp.width || 0,
              quantity: 1,
            });
          }
          return cuts;
        });

        // Calculate manual plan
        const manualPlan = calculateManualCuttingPlan(
          requiredCuts, 
          [], 
          CUTTING_OPTIMIZATION_CONSTANTS.STANDARD_STOCK_LENGTH_MM
        );

        // Calculate comparison
        const comparison = compareWaste(
          manualPlan, 
          optimization.cuttingPlan, 
          CUTTING_OPTIMIZATION_CONSTANTS.DEFAULT_COST_PER_BAR_EGP
        );
        setWasteComparison(comparison);
      } catch (error) {
        console.error('Failed to calculate waste comparison:', error);
      }
    }
  }, [optimization, project]);

  const availableMachines: YilmazMachineModel[] = [
    'AIM-3410',
    'AIM-7510',
    'ALM-6510',
    'ALM-7510',
    'PIM-6509',
    'PIM-7510'
  ];

  // Wrapper to show preview before generating G-code
  const handleGenerateGCodeClick = () => {
    if (!optimization || !project) return;
    setPendingAction('gcode');
    setShowProductionPreview(true);
  };

  // Actual G-code generation (called after preview confirmation)
  const handleGenerateGCode = async () => {
    if (!optimization || !project) return;

    setIsGeneratingGCode(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      // Validate cutting plan
      const validator = new MachineValidator(selectedMachine);
      const validation = validator.validateCuttingPlan(optimization.cuttingPlan);

      setValidationResult(validation);

      if (!validation.valid) {
        setExportError(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`);
        setIsGeneratingGCode(false);
        return;
      }

      // Generate G-code
      const gCodeGenerator = new YilmazGCodeGenerator(selectedMachine, {
        optimizeToolChanges: true,
        minimizeWaste: true,
        safetyZones: true,
        includeComments: true
      });

      const gCodeCommands = gCodeGenerator.generateGCode(optimization.cuttingPlan);
      const gCodeString = YilmazGCodeGenerator.commandsToString(gCodeCommands);

      setGCodePreview(gCodeString);
      setExportSuccess(true);
    } catch (error) {
      console.error('G-code generation error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to generate G-code');
    } finally {
      setIsGeneratingGCode(false);
    }
  };

  const handleDownloadGCode = () => {
    if (!gCodePreview) return;

    const blob = new Blob([gCodePreview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yilmaz_${selectedMachine}_${project?.orderNumber || 'program'}_${Date.now()}.nc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Wrapper to show preview before exporting report
  const handleExportCuttingReportClick = () => {
    if (!project || !optimization) return;
    setPendingAction('report');
    setShowProductionPreview(true);
  };

  // Actual report export (called after preview confirmation)
  const handleExportCuttingReport = async () => {
    if (!project || !optimization) return;

    setIsGeneratingReport(true);
    setExportError(null);

    try {
      // PHASE 4: Lazy load PDF export library only when user clicks export
      const blob = await lazyExportPDF(project, optimization, { branding });

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cutting_list_${project.orderNumber}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
    } catch (error) {
      console.error('Report export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendToMachine = async () => {
    if (!gCodePreview || !project) return;

    setIsSendingToMachine(true);
    setExportError(null);

    try {
      // In a real implementation, this would connect to the actual machine
      // For now, we'll simulate the connection
      // const networkConfig = {
      //   host: '192.168.1.100', // Example IP - would come from machine settings
      //   port: 8080,
      //   timeout: 30000,
      //   retryAttempts: 3,
      //   retryDelay: 1000
      // };

      // Note: In production, you would instantiate YilmazCNC and send the G-code
      // const cnc = new YilmazCNC('machine-1', selectedMachine, selectedMachine, networkConfig);
      // await cnc.connect();
      // const commands = parseGCodeString(gCodePreview);
      // await cnc.sendGCode(commands);

      // Simulate success
      await new Promise(resolve => setTimeout(resolve, MACHINE_CONSTANTS.SIMULATION_DELAY_MS));
      setExportSuccess(true);
      alert(`G-code sent successfully to ${selectedMachine}`);
    } catch (error) {
      console.error('Machine send error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to send to machine');
    } finally {
      setIsSendingToMachine(false);
    }
  };

  const handleDownloadALM6510MDB = async () => {
    if (!project || !optimization) return;

    setIsGeneratingALM6510(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const options: ALM6510ExportOptions = {
        orderNumber: project.orderNumber || `ORDER-${Date.now()}`,
        customerCode: project.customer || '',
        customerName: project.customer || '',
        project: {
          positionNumber: parseInt(project.posNumber || String(MACHINE_CONSTANTS.DEFAULT_POSITION_NUMBER)),
        },
      };

      await alm6510MDBExport.downloadMDB(project, optimization, options);
      setExportSuccess(true);
    } catch (error) {
      console.error('ALM 6510 MDB export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to generate ALM 6510 MDB file');
    } finally {
      setIsGeneratingALM6510(false);
    }
  };

  if (isGenerating) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Generating Cutting Plan</h3>
          <p className="text-gray-400">AI is optimizing your material usage...</p>
        </CardContent>
      </Card>
    );
  }

  if (!optimization) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Optimization Data</h3>
          <p className="text-gray-400">Complete the design phase to generate cutting optimization.</p>
        </CardContent>
      </Card>
    );
  }

  const optimizedPlans = optimizeCuttingPlan(optimization.cuttingPlan);

  return (
    <div className="space-y-6">
      {/* Waste Comparison Button */}
      {wasteComparison && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowWasteComparison(!showWasteComparison)}
            variant="outline"
            className="bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
          >
            {showWasteComparison ? 'Hide' : 'View'} Savings Report
          </Button>
        </div>
      )}

      {/* Waste Comparison Report */}
      {showWasteComparison && wasteComparison && (
        <WasteComparisonReport
          comparison={wasteComparison}
          currency="EGP"
          onExportPDF={() => {
            // TODO: Implement PDF export
            console.log('Export PDF');
          }}
        />
      )}

      {/* Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">{optimization.nestingEfficiency.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Efficiency</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{optimization.wastePercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Waste</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">{optimization.estimatedProductionTime.toFixed(1)}m</div>
            <div className="text-sm text-gray-400">Production Time</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-400">${optimization.costBreakdown.totalCost.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Cutting Plans */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-orange-400" />
            Cutting Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimizedPlans.map((plan, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{plan.profile.name}</h4>
                    <p className="text-sm text-gray-400">
                      Stock Length: {plan.stockLength}mm
                    </p>
                  </div>
                  <Badge variant="outline">
                    {plan.utilization.toFixed(1)}% Utilization
                  </Badge>
                </div>

                <Progress value={plan.utilization} className="mb-3" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {plan.cuts.map((cut, cutIndex) => (
                    <div key={cutIndex} className="p-2 bg-gray-700 rounded text-center">
                      <div className="font-medium">{cut.length}mm</div>
                      <div className="text-gray-400">{cut.angle}°</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Material Cost:</span>
              <span>${optimization.costBreakdown.materialCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Labor Cost:</span>
              <span>${optimization.costBreakdown.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Hardware Cost:</span>
              <span>${optimization.costBreakdown.hardwareCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Glazing Cost:</span>
              <span>${optimization.costBreakdown.glazingCost.toFixed(2)}</span>
            </div>
            <hr className="border-gray-600" />
            <div className="flex justify-between font-semibold">
              <span>Total Cost:</span>
              <span>${optimization.costBreakdown.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Export Section */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-400" />
            Export Cutting Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportCuttingReportClick}
            disabled={isGeneratingReport || !project || !optimization}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Export Cutting Report (PDF)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* G-code Export Section */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-orange-400" />
            G-code Export for Yilmaz Machines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Machine Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Yilmaz Machine:</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value as YilmazMachineModel)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white"
            >
              {availableMachines.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-2">
              {validationResult.errorsWithConsequences && validationResult.errorsWithConsequences.length > 0 && (
                <div className="space-y-3">
                  {validationResult.errorsWithConsequences.map((errorWithConsequences: any, idx: number) => (
                    errorWithConsequences.consequences && errorWithConsequences.consequences.length > 0 && (
                      <ConsequenceAlert
                        key={idx}
                        consequences={errorWithConsequences.consequences}
                        compact={validationResult.errorsWithConsequences.length > 1}
                      />
                    )
                  ))}
                </div>
              )}
              {validationResult.errors.length > 0 && !validationResult.errorsWithConsequences && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {validationResult.errors.map((error: any, idx: number) => (
                        <li key={idx}>{error.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.warnings.length > 0 && (
                <Alert className="bg-yellow-900/20 border-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {validationResult.warnings.map((warning: any, idx: number) => (
                        <li key={idx}>{warning.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.valid && validationResult.errors.length === 0 && (
                <Alert className="bg-green-900/20 border-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Validation Passed</AlertTitle>
                  <AlertDescription>
                    Cutting plan is valid for {selectedMachine}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateGCodeClick}
              disabled={isGeneratingGCode}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {isGeneratingGCode ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Generate G-code
                </>
              )}
            </Button>

            {gCodePreview && (
              <>
                <Button
                  onClick={handleDownloadGCode}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  onClick={handleSendToMachine}
                  disabled={isSendingToMachine}
                  variant="outline"
                  className="flex-1 border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  {isSendingToMachine ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Machine
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Success/Error Messages */}
          {exportError && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Export Error</AlertTitle>
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}

          {exportSuccess && !exportError && (
            <Alert className="bg-green-900/20 border-green-500">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                G-code generated successfully for {selectedMachine}
              </AlertDescription>
            </Alert>
          )}

          {/* G-code Preview */}
          {gCodePreview && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">G-code Preview:</label>
              <pre className="p-4 bg-gray-900 rounded-md text-xs text-green-400 font-mono overflow-auto max-h-64">
                {gCodePreview.substring(0, 2000)}
                {gCodePreview.length > 2000 && '\n... (truncated, download to see full code)'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ALM 6510 MDB Export Section - Turkish Pilot */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-orange-400" />
            ALM 6510 Machine Export (Turkish Pilot)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <strong>🇹🇷 Turkish Pilot Program:</strong> Download MDB file for Yılmaz ALM 6510 machine.
              The file is 100% aligned with the machine's software requirements.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Machine: <span className="text-orange-400 font-bold">ALM 6510</span>
              </label>
              <p className="text-xs text-gray-400">
                8-axis CNC machining center with operation codes (P1-P7). 
                MDB file contains Table1 with 37 columns matching machine software.
              </p>
            </div>

            <Button
              onClick={handleDownloadALM6510MDB}
              disabled={isGeneratingALM6510 || !project || !optimization}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
            >
              {isGeneratingALM6510 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating MDB File...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download ALM 6510 MDB File
                </>
              )}
            </Button>

            {exportSuccess && !exportError && (
              <Alert className="bg-green-900/20 border-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  ALM 6510 MDB file downloaded successfully. Ready for machine import.
                </AlertDescription>
              </Alert>
            )}

            {exportError && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Export Error</AlertTitle>
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MANDATORY Production Preview Dialog */}
      {project && (
        <ProductionPreviewDialog
          open={showProductionPreview}
          onOpenChange={setShowProductionPreview}
          components={project.components || []}
          profiles={profiles}
          optimizationResult={optimization}
          onConfirm={() => {
            // Execute the pending action after confirmation
            if (pendingAction === 'gcode') {
              void handleGenerateGCode();
            } else if (pendingAction === 'report') {
              void handleExportCuttingReport();
            } else if (pendingAction === 'alm6510') {
              void handleDownloadALM6510MDB();
            }
            setPendingAction(null);
          }}
          onAdjustCalibration={() => {
            // Navigate to calibration wizard or show it
            // This would be handled by parent component
          }}
        />
      )}
    </div>
  );
};
