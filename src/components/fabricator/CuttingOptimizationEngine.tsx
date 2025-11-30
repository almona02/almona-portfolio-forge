
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { 
  Scissors, 
  TrendingUp, 
  Package, 
  Clock, 
  DollarSign, 
  Download, 
  Send, 
  Code, 
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { WindowUnit, Profile, OptimizationResult, WindowComponent, CuttingPlan } from '@/types/fabricator';
import { YilmazGCodeGenerator, YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import { MachineValidator } from '@/integrations/yilmaz/MachineValidator';
import { YilmazCNC } from '@/integrations/yilmaz/YilmazCNC';
import { ReportEngine } from '@/modules/reporting';
import { PDFExportService } from '@/modules/reporting';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { calculateManualCuttingPlan, compareWaste } from '@/lib/analytics/WasteCalculator';
import { ProductionPreviewDialog } from './ProductionPreviewDialog';

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
    const stockLength = plan.stockLength || 6000;
    const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const utilization = (totalCutLength / stockLength) * 100;
    const totalWaste = stockLength - totalCutLength;

    return {
      ...plan,
      utilization: Number(utilization.toFixed(2)),
      totalWaste: Number(totalWaste.toFixed(2)),
    };
  });
}

export const CuttingOptimizationEngine: React.FC<CuttingOptimizationEngineProps> = ({
  project,
  optimization,
  isGenerating,
  profiles = [],
}) => {
  const [selectedMachine, setSelectedMachine] = useState<YilmazMachineModel>('AIM-3410');
  const [isGeneratingGCode, setIsGeneratingGCode] = useState(false);
  const [isSendingToMachine, setIsSendingToMachine] = useState(false);
  const [gCodePreview, setGCodePreview] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showWasteComparison, setShowWasteComparison] = useState(false);
  const [wasteComparison, setWasteComparison] = useState<any>(null);
  const [showProductionPreview, setShowProductionPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState<'gcode' | 'report' | null>(null);
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
              profileId: comp.profileId,
              length: comp.cuttingLength || comp.length,
              quantity: 1,
            });
          }
          return cuts;
        });

        // Calculate manual plan
        const manualPlan = calculateManualCuttingPlan(requiredCuts, [], 6000);

        // Calculate comparison
        const comparison = compareWaste(manualPlan, optimization.cuttingPlan, 500); // 500 EGP per bar estimate
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
      const pdfService = new PDFExportService(branding);
      const blob = await pdfService.generateCuttingListPDF(project, optimization, { branding });

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
      const networkConfig = {
        host: '192.168.1.100', // Example IP - would come from machine settings
        port: 8080,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      };

      // Note: In production, you would instantiate YilmazCNC and send the G-code
      // const cnc = new YilmazCNC('machine-1', selectedMachine, selectedMachine, networkConfig);
      // await cnc.connect();
      // const commands = parseGCodeString(gCodePreview);
      // await cnc.sendGCode(commands);

      // Simulate success
      await new Promise(resolve => setTimeout(resolve, 2000));
      setExportSuccess(true);
      alert(`G-code sent successfully to ${selectedMachine}`);
    } catch (error) {
      console.error('Machine send error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to send to machine');
    } finally {
      setIsSendingToMachine(false);
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
              {validationResult.errors.length > 0 && (
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
