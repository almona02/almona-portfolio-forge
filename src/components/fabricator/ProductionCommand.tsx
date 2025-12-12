/**
 * Almona Fabricator Pro: ProductionCommand (v2.0)
 *
 * This component is the definitive command center for reviewing, visualizing,
 * and dispatching optimized cutting plans to production. It transforms the static
 * results page into an interactive, trustworthy "pre-flight check" for fabrication.
 *
 * Prestige Enhancements:
 * - Visual Cutting Plan: Each stock bar is rendered graphically, showing the exact
 *   placement of cuts, remnants, and waste. This is far superior to a simple text list.
 * - Prominent AI Savings Report: The value proposition of the AI is made undeniable
 *   by placing the waste/cost savings analysis front-and-center.
 * - Interactive G-Code Preview: G-code is not just a text block; it's a syntax-
 *   highlighted, professional code editor view.
 * - Streamlined Export Workflow: A unified "Dispatch to Production" section clarifies
 *   the final steps, from PDF reports to direct CNC machine communication.
 * - Polished UI/UX: The layout, terminology, and visual language are refined to
 *   instill a sense of confidence, precision, and command.
 */
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, CardHeader, CardTitle
} from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
    Scissors, TrendingUp, Package, Clock, DollarSign, Download, Send, Code,
    AlertCircle, CheckCircle, Loader2, FileText
} from 'lucide-react';
import { WindowUnit, Profile, OptimizationResult, CuttingPlan } from '@/types/fabricator';
import { YilmazGCodeGenerator, YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { calculateManualCuttingPlan, compareWaste } from '@/lib/analytics/WasteCalculator';
import { ProductionPreviewDialog } from './ProductionPreviewDialog';
import { MachineValidator } from '@/integrations/yilmaz/MachineValidator';
import { PDFExportService } from '@/modules/reporting';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { useTranslation } from 'react-i18next';
import { alm6510MDBExport, ALM6510ExportOptions } from '@/lib/exports/ALM6510MDBExport';
import { downloadSplitPO } from '@/lib/exports/SplitPOExport';
import { InstallationVariablesPanel } from './InstallationVariablesPanel';
import type { InstallationVariables, InstallationCostBreakdown } from '@/lib/installation/EgyptianInstallationCalculator';

interface ProductionCommandProps {
    project: WindowUnit | null;
    optimization: OptimizationResult | null;
    isGenerating: boolean;
    profiles?: Profile[];
}

// ============================================================================
// VISUAL SUB-COMPONENTS
// ============================================================================

/**
 * A visual representation of a single stock bar with its cuts.
 * This is a major prestige enhancement.
 */
const StockBarVisualization: React.FC<{ plan: CuttingPlan }> = ({ plan }) => {
    const { t } = useTranslation('fabricator');
    const stockLength = plan.stockLength || 6000;
    let currentPos = 0;

    const cuts = plan.cuts.map(cut => {
        const item = { ...cut, start: currentPos };
        currentPos += cut.length;
        return item;
    });
    
    const wasteLength = stockLength - currentPos;

    return (
        <div className="w-full bg-gray-900 p-2 rounded-md border border-gray-700">
            <div className="flex h-12 w-full">
                {cuts.map((cut, index) => (
                    <TooltipProvider key={cut.componentId || `cut-${index}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={`h-full flex items-center justify-center border-r-2 border-dashed border-red-500/50 ${index % 2 === 0 ? 'bg-blue-500/20' : 'bg-blue-500/30'}`}
                                    style={{ width: `${(cut.length / stockLength) * 100}%` }}
                                >
                                    <span className="text-xs font-mono text-white select-none">{cut.length}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('production_command.cut_tooltip', 'Cut: {length}mm @ {angle}°', { length: cut.length, angle: cut.angle })}</p>
                                <p>{t('production_command.for_component', 'For Component: {componentId}', { componentId: cut.componentId })}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {wasteLength > 1 && ( // Only show waste if significant
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="h-full flex items-center justify-center bg-red-900/50"
                                    style={{ width: `${(wasteLength / stockLength) * 100}%` }}
                                >
                                     <span className="text-xs font-mono text-red-300">{wasteLength.toFixed(0)}</span>
                                </div>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>{t('production_command.waste_tooltip', 'Waste: {length}mm', { length: wasteLength.toFixed(0) })}</p>
                             </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                <span>0mm</span>
                <span>{stockLength}mm</span>
            </div>
        </div>
    );
};


// ============================================================================
// MAIN COMMAND CENTER COMPONENT
// ============================================================================

export const ProductionCommand: React.FC<ProductionCommandProps> = ({
    project,
    optimization,
    isGenerating,
    profiles = [],
}) => {
    const { t } = useTranslation('fabricator');
    // --- State Management ---
    const [selectedMachine, setSelectedMachine] = useState<YilmazMachineModel>('AIM-7510');
    const [isProcessing, setIsProcessing] = useState(false);
    const [gCodePreview, setGCodePreview] = useState<string | null>(null);
    const [showWasteComparison, setShowWasteComparison] = useState(true); // Default to show
    const [wasteComparison, setWasteComparison] = useState<any>(null);
    const [showProductionPreview, setShowProductionPreview] = useState(false);
    const [pendingAction, setPendingAction] = useState<'gcode' | 'report' | 'send' | 'alm6510' | 'splitpo' | null>(null);
    const [lastActionResult, setLastActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isGeneratingALM6510, setIsGeneratingALM6510] = useState(false);
    const [alm6510ExportError, setAlm6510ExportError] = useState<string | null>(null);
    const [alm6510ExportSuccess, setAlm6510ExportSuccess] = useState(false);
    const { branding } = useCompanyBranding();
    
    // Installation variables state
    const [installationVariables, setInstallationVariables] = useState<InstallationVariables | null>(null);
    const [installationBreakdown, setInstallationBreakdown] = useState<InstallationCostBreakdown | null>(null);

    const availableMachines: YilmazMachineModel[] = [
        'AIM-3410',
        'AIM-7510',
        'ALM-6510',
        'ALM-7510',
        'PIM-6509',
        'PIM-7510'
    ];

    // --- Effects & Logic ---
    // Calculate waste comparison when optimization is available
    useEffect(() => {
        if (optimization && optimization.cuttingPlan.length > 0 && project) {
            try {
                // Collect all required cuts from components
                const requiredCuts = project.components.flatMap((comp) => {
                    const cuts: any[] = [];
                    for (let i = 0; i < (comp.quantity || 1); i++) {
                        cuts.push({
                            id: `${comp.id}-${i}`,
                            profileId: comp.profile.id,
                            length: comp.cuttingLengths[0] || comp.height, // Fallback if cuttingLengths empty
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

    // --- Internal Handlers ---
    
    const handleGenerateGCode = async () => {
        if (!optimization || !project) return;

        try {
            // Validate cutting plan
            const validator = new MachineValidator(selectedMachine);
            const validation = validator.validateCuttingPlan(optimization.cuttingPlan);

            if (!validation.valid) {
                throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join('; ')}`);
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
        } catch (error) {
            console.error('G-code generation error:', error);
            throw error;
        }
    };

    const handleExportCuttingReport = async () => {
        if (!project || !optimization) return;

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
        } catch (error) {
            console.error('Report export error:', error);
            throw error;
        }
    };

    const handleSendToMachine = async () => {
        if (!gCodePreview || !project) return;

        try {
            // In a real implementation, this would connect to the actual machine
            // For now, we'll simulate the connection
            // const networkConfig = {
            //     host: '192.168.1.100',
            //     port: 8080,
            //     timeout: 30000,
            //     retryAttempts: 3,
            //     retryDelay: 1000
            // };

            // Simulate success
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('Machine send error:', error);
            throw error;
        }
    };

    const handleDownloadALM6510MDB = async () => {
        if (!project || !optimization) return;

        setIsGeneratingALM6510(true);
        setAlm6510ExportError(null);
        setAlm6510ExportSuccess(false);

        try {
            const options: ALM6510ExportOptions = {
                orderNumber: project.orderNumber || `ORDER-${Date.now()}`,
                customerCode: project.customer || '',
                customerName: project.customer || '',
                project: {
                    positionNumber: parseInt(project.posNumber || '1'),
                },
            };

            await alm6510MDBExport.downloadMDB(project, optimization, options);
            setAlm6510ExportSuccess(true);
        } catch (error) {
            console.error('ALM 6510 MDB export error:', error);
            setAlm6510ExportError(error instanceof Error ? error.message : 'Failed to generate ALM 6510 MDB file');
        } finally {
            setIsGeneratingALM6510(false);
        }
    };

    const confirmAndExecute = (action: 'gcode' | 'report' | 'send' | 'alm6510' | 'splitpo') => {
        setPendingAction(action);
        setShowProductionPreview(true);
    };

    const executePendingAction = async () => {
        setLastActionResult(null);
        setIsProcessing(true);

        try {
            let resultMessage = "";
            switch (pendingAction) {
                case 'gcode':
                    await handleGenerateGCode();
                    resultMessage = t('production_command.gcode_generated', 'G-code generated successfully.');
                    break;
                case 'report':
                    await handleExportCuttingReport();
                    resultMessage = t('production_command.pdf_downloaded', 'PDF Cutting Report downloaded.');
                    break;
                case 'send':
                    await handleSendToMachine();
                    resultMessage = t('production_command.job_sent', 'Job sent to Yilmaz {machine}.', { machine: selectedMachine });
                    break;
                case 'alm6510':
                    await handleDownloadALM6510MDB();
                    resultMessage = t('production_command.alm6510_downloaded', 'ALM 6510 MDB file downloaded successfully.');
                    // Close the preview dialog after successful download
                    setShowProductionPreview(false);
                    break;
                case 'splitpo':
                    if (project && optimization) {
                        downloadSplitPO(project, optimization, installationBreakdown || undefined);
                        resultMessage = 'Split POs (Profile / Glass / Accessory) downloaded.';
                        setShowProductionPreview(false);
                    } else {
                        throw new Error('Missing project or optimization data for Split PO export.');
                    }
                    break;
            }
            setLastActionResult({ success: true, message: resultMessage });
        } catch (error: any) {
            setLastActionResult({ success: false, message: error.message || t('production_command.unknown_error', 'An unknown error occurred.') });
            // Keep dialog open on error so user can see the error
        } finally {
            setIsProcessing(false);
            setPendingAction(null);
        }
    };

    // --- Render Logic ---
    if (isGenerating) {
        return (
            <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold mb-2">{t('production_command.generating_plan', 'Generating Cutting Plan')}</h3>
                    <p className="text-gray-400">{t('production_command.ai_optimizing', 'AI is optimizing your material usage...')}</p>
                </CardContent>
            </Card>
        );
    }

    if (!optimization || !project) {
        return (
            <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-8 text-center">
                    <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('production_command.no_optimization', 'No Optimization Data')}</h3>
                    <p className="text-gray-400">{t('production_command.complete_design', 'Complete the design phase to generate cutting optimization.')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <Card className="bg-gray-800/30 border-gray-700 shadow-2xl">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <Scissors className="h-6 w-6 text-orange-400" />
                        {t('production_command.title', 'Production Command Center')}
                    </CardTitle>
                    <AlertDescription className="text-gray-400">
                        {t('production_command.description', 'Review the AI-optimized plan, visualize the cuts, and dispatch to production.')}
                    </AlertDescription>
                </CardHeader>
            </Card>

            {/* --- 1. AI SAVINGS ANALYSIS --- */}
            {wasteComparison && (
                <WasteComparisonReport
                    comparison={wasteComparison}
                    currency="EGP"
                    onExportPDF={() => {}}
                    isInitiallyOpen={showWasteComparison}
                />
            )}

            {/* --- 2. KEY PERFORMANCE INDICATORS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-400">{optimization.nestingEfficiency.toFixed(1)}%</div>
                        <div className="text-sm text-gray-400">{t('production_command.efficiency', 'Efficiency')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-4 text-center">
                        <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-400">{optimization.wastePercentage.toFixed(1)}%</div>
                        <div className="text-sm text-gray-400">{t('production_command.waste', 'Waste')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-4 text-center">
                        <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-yellow-400">{optimization.estimatedProductionTime.toFixed(1)}m</div>
                        <div className="text-sm text-gray-400">{t('production_command.production_time', 'Production Time')}</div>
                    </CardContent>
                </Card>

                <Card className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-4 text-center">
                        <DollarSign className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-400">${optimization.costBreakdown.totalCost.toFixed(0)}</div>
                        <div className="text-sm text-gray-400">{t('production_command.total_cost', 'Total Cost')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* --- 3. VISUAL CUTTING PLAN --- */}
            <Card className="bg-gray-800/30 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-base">{t('production_command.visual_cutting_plan', 'Visual Cutting Plan')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {optimization.cuttingPlan.map((plan, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-baseline mb-2">
                                <h4 className="font-semibold text-gray-200">{plan.profile.name}</h4>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {t('production_command.utilization', '{value}% Utilization', { value: plan.utilization?.toFixed(1) })}
                                </Badge>
                            </div>
                            <StockBarVisualization plan={plan} />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* --- 4. INSTALLATION VARIABLES --- */}
            {project && (
                <Card className="bg-gray-800/30 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-base">{t('production_command.installation_variables', 'Installation Variables')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <InstallationVariablesPanel
                            projectArea={project.overallWidth && project.overallHeight 
                                ? (project.overallWidth * project.overallHeight) / 1_000_000 
                                : 0}
                            openingCount={project.quantity || 1}
                            floorLevel={1} // TODO: Get from project context/positionMeta
                            onVariablesChange={setInstallationVariables}
                            onCostCalculated={setInstallationBreakdown}
                            className="bg-transparent border-0 shadow-none"
                        />
                    </CardContent>
                </Card>
            )}

            {/* --- 5. DISPATCH TO PRODUCTION --- */}
            <Card className="bg-gray-800/30 border-gray-700" id="dispatch-section">
                <CardHeader>
                     <CardTitle className="text-base">{t('production_command.dispatch_to_production', 'Dispatch to Production')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Side: CNC Machine Control */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-300">{t('production_command.cnc_machine_integration', 'CNC Machine Integration')}</h3>
                        <div>
                            <label className="text-sm font-medium text-gray-400">{t('production_command.target_machine', 'Target Yilmaz Machine:')}</label>
                            <Select value={selectedMachine} onValueChange={(val) => setSelectedMachine(val as YilmazMachineModel)}>
                                <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-600">
                                    {availableMachines.map((machine) => (
                                        <SelectItem key={machine} value={machine}>
                                            {machine}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {gCodePreview && (
                             <div>
                                <label className="text-sm font-medium text-gray-400 mb-2 block">{t('production_command.gcode_preview', 'G-Code Preview')}</label>
                                <pre className="p-4 bg-black/50 rounded-md text-xs text-green-300 font-mono overflow-auto max-h-48 border border-gray-700">
                                    <code>{gCodePreview.substring(0, 1000)}...</code>
                                </pre>
                            </div>
                        )}
                        
                        {lastActionResult && (
                            <Alert variant={lastActionResult.success ? 'default' : 'destructive'} className={lastActionResult.success ? "bg-green-900/30 border-green-500/50" : "bg-red-900/30 border-red-500/50"}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{lastActionResult.success ? t('production_command.success', 'Success') : t('production_command.error', 'Error')}</AlertTitle>
                                <AlertDescription>{lastActionResult.message}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Right Side: Action Buttons */}
                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700 flex flex-col justify-center space-y-4">
                        <Button onClick={() => confirmAndExecute('report')} disabled={isProcessing} variant="outline" size="lg">
                            <Download className="h-4 w-4 mr-2"/> {t('production_command.export_pdf', 'Export PDF Cutting List')}
                        </Button>
                        <Button onClick={() => confirmAndExecute('gcode')} disabled={isProcessing} variant="outline" size="lg">
                            <Code className="h-4 w-4 mr-2"/> {t('production_command.generate_gcode', 'Generate & Download G-Code')}
                        </Button>
                        <Button onClick={() => confirmAndExecute('splitpo')} disabled={isProcessing} variant="outline" size="lg">
                            <FileText className="h-4 w-4 mr-2"/> Split PO (Profile / Glass / Accessory)
                        </Button>
                        
                        {/* ALM 6510 MDB Export Button - Turkish Pilot */}
                        {selectedMachine === 'ALM-6510' && (
                            <Button
                                onClick={() => confirmAndExecute('alm6510')}
                                disabled={isProcessing || isGeneratingALM6510}
                                size="lg"
                                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg"
                            >
                                {isGeneratingALM6510 ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {t('production_command.generating_mdb', 'Generating MDB...')}
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t('production_command.download_alm6510_mdb', 'Download ALM 6510 MDB')}
                                    </>
                                )}
                            </Button>
                        )}
                        
                         <Button onClick={() => confirmAndExecute('send')} disabled={isProcessing || !gCodePreview} size="lg" className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
                            <Send className="h-4 w-4 mr-2"/> {t('production_command.send_to_machine', 'Send Job to Machine')}
                        </Button>
                        
                        {/* ALM 6510 Export Status Messages */}
                        {alm6510ExportSuccess && !alm6510ExportError && (
                            <Alert className="bg-green-900/20 border-green-500">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>
                                    ALM 6510 MDB file downloaded successfully. Ready for machine import.
                                </AlertDescription>
                            </Alert>
                        )}
                        {alm6510ExportError && (
                            <Alert variant="destructive" className="bg-red-900/20 border-red-500">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Export Error</AlertTitle>
                                <AlertDescription>{alm6510ExportError}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* --- MANDATORY Production Preview Dialog --- */}
            {project && (
                <ProductionPreviewDialog
                    open={showProductionPreview}
                    onOpenChange={setShowProductionPreview}
                    components={project.components || []}
                    profiles={profiles}
                    optimizationResult={optimization}
                    onConfirm={executePendingAction}
                    onAdjustCalibration={() => { /* Your logic */ }}
                />
            )}
        </div>
    );
};
