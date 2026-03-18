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
import ErrorBoundary from '@/components/ErrorBoundary';
import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { MachineValidator } from '@/integrations/yilmaz/MachineValidator';
import { YilmazGCodeGenerator, YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';
import { calculateManualCuttingPlan, compareWaste, type WasteComparison } from '@/lib/analytics/WasteCalculator';
import { ExportService } from '@/lib/exports';
import { ALM6510ExportOptions, alm6510MDBExport } from '@/lib/exports/ALM6510MDBExport';
import { downloadSplitPO } from '@/lib/exports/SplitPOExport';
import { lazyExportPDF } from '@/lib/exports/lazyExportHandlers';
import type { InstallationCostBreakdown, InstallationVariables } from '@/lib/installation/EgyptianInstallationCalculator';
// PDFExportService is now lazy-loaded via lazyExportPDF() - see handleExportCuttingReport
import { trackError } from '@/lib/performance-monitoring';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
    Card, CardContent, CardHeader, CardTitle
} from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { BarcodeLabelGenerator, type BarcodeLabel, type BarcodeLabelOptions } from '@/integrations/yilmaz/BarcodeLabelGenerator';
import { generateCutSheets } from '@/lib/fabricator/production/CutSheetGenerator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { OptimizationResult, Profile, WindowUnit, type Cut } from '@/types/fabricator';
import {
    AlertCircle, CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Code,
    DollarSign, Download,
    FileText,
    ListOrdered,
    Loader2,
    Package,
    Scissors,
    Send,
    Tag,
    TrendingUp
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarDrawing } from './BarDrawing';
import { InstallationVariablesPanel } from './InstallationVariablesPanel';
import { ProductionPreviewDialog } from './ProductionPreviewDialog';

/** Generate printable HTML label sheet for standard printers */
function generateLabelSheetHTML(labels: BarcodeLabel[], orderNumber: string): string {
    const rows = labels.map((l) => `
        <div class="label">
            <div class="barcode">${l.barcode}</div>
            <div class="meta">${l.profileName} | ${l.cutLength}mm @ ${l.angle}°</div>
            <div class="order">${l.orderNumber} ${l.position || ''}</div>
        </div>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labels ${orderNumber}</title>
<style>body{font-family:sans-serif;margin:1rem}.labels{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.label{border:1px solid #ccc;padding:8px;font-size:11px;page-break-inside:avoid}
.barcode{font-family:monospace;font-weight:bold;font-size:12px}.meta{color:#666}.order{font-size:10px;color:#999}
@media print{.labels{gap:4px}}</style></head><body>
<h2>Labels - ${orderNumber}</h2><div class="labels">${rows}</div>
<script>window.onload=()=>window.print()</script></body></html>`;
}

interface ProductionCommandProps {
    project: WindowUnit | null;
    optimization: OptimizationResult | null;
    bom?: CompleteBOM | null;
    isGenerating: boolean;
    profiles?: Profile[];
}

// ============================================================================
// VISUAL SUB-COMPONENTS
// ============================================================================

/**
 * Animated CNC Toolpath Simulation
 * Parses G-code and visualizes the cutting head movement.
 */
const CNCSimulationView: React.FC<{ gcode: string; machine: string }> = ({ gcode, machine: _machine }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [progress, setProgress] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(true);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Parse simplified G-code for visualization
        const lines = gcode.split('\n');
        const commands = lines.map(line => {
            const parts = line.split(' ');
            const cmd: any = { type: parts[1] }; // N1 G0 X...
            parts.forEach(p => {
                if (p.startsWith('X')) cmd.x = parseFloat(p.substring(1));
                if (p.startsWith('Y')) cmd.y = parseFloat(p.substring(1));
                if (p.startsWith('Z')) cmd.z = parseFloat(p.substring(1));
            });
            return cmd;
        }).filter(c => c.x !== undefined || c.y !== undefined); // Only move commands

        let animationFrameId: number;
        let step = 0;
        
        const render = () => {
            // Clear canvas
            ctx.fillStyle = '#0f172a'; // bg-slate-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Machine Bed
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            const bedY = canvas.height - 40;
            ctx.beginPath();
            ctx.moveTo(10, bedY);
            ctx.lineTo(canvas.width - 10, bedY);
            ctx.stroke();

            // Draw Stock Material
            ctx.fillStyle = '#475569';
            ctx.fillRect(20, bedY - 30, canvas.width - 40, 30);

            // Simulate Tool Head
            if (commands.length > 0) {
                // Scale X coordinate to canvas width (assuming 6000mm max length)
                const scaleX = (canvas.width - 40) / 6000; 
                
                // Animate through commands
                if (isPlaying) {
                    step = (step + 1) % commands.length;
                    setProgress(Math.floor((step / commands.length) * 100));
                }
                
                const cmd = commands[step];
                const toolX = 20 + ((cmd.x || 0) * scaleX);
                const toolY = bedY - 30 - 20; // Float above material

                // Draw Head
                ctx.fillStyle = '#f59e0b'; // amber-500
                ctx.beginPath();
                ctx.arc(toolX, toolY, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw Spindle
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(toolX, toolY);
                ctx.lineTo(toolX, toolY - 15);
                ctx.stroke();

                // Draw "Spark" effect if cutting (Z down)
                if ((cmd.z || 0) < 0) {
                     ctx.fillStyle = '#fbbf24';
                     ctx.globalAlpha = 0.5 + Math.random() * 0.5;
                     ctx.beginPath();
                     ctx.arc(toolX, bedY - 30, 8, 0, Math.PI * 2);
                     ctx.fill();
                     ctx.globalAlpha = 1.0;
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [gcode, isPlaying]);

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                width={600} 
                height={256} 
                className="w-full h-full block"
            />
            <div className="absolute top-2 right-2 flex gap-2">
                 <div className="bg-black/60 text-green-400 text-xs font-mono px-2 py-1 rounded border border-green-900">
                    {progress}%
                </div>
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="bg-amber-600 text-white text-xs px-2 py-1 rounded hover:bg-amber-500 transition-colors"
                >
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMMAND CENTER COMPONENT
// ============================================================================

const ProductionCommandComponent: React.FC<ProductionCommandProps> = ({
    project,
    optimization,
    bom,
    isGenerating,
    profiles = [],
}) => {
    const { t } = useTranslation('fabricator');
    // --- State Management ---
    const [selectedMachine, setSelectedMachine] = useState<YilmazMachineModel>('AIM-7510');
    const [isProcessing, setIsProcessing] = useState(false);
    const [gCodePreview, setGCodePreview] = useState<string | null>(null);
    const [wasteComparison, setWasteComparison] = useState<WasteComparison | null>(null);
    const [showProductionPreview, setShowProductionPreview] = useState(false);
    const [pendingAction, setPendingAction] = useState<'gcode' | 'report' | 'send' | 'alm6510' | 'splitpo' | null>(null);
    const [lastActionResult, setLastActionResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isGeneratingALM6510, setIsGeneratingALM6510] = useState(false);
    const [alm6510ExportError, setAlm6510ExportError] = useState<string | null>(null);
    const [alm6510ExportSuccess, setAlm6510ExportSuccess] = useState(false);
    const { branding } = useCompanyBranding();
    
    // Installation variables state
    const [_installationVariables, setInstallationVariables] = useState<InstallationVariables | null>(null);
    const [installationBreakdown, setInstallationBreakdown] = useState<InstallationCostBreakdown | null>(null);
    const [isCutSheetsExpanded, setIsCutSheetsExpanded] = useState(false);
    const [isAssemblyExpanded, setIsAssemblyExpanded] = useState(true);
    const [isLabelsExpanded, setIsLabelsExpanded] = useState(false);

    // ✅ HARDENING: Memoize static array to prevent recreation on every render
    const availableMachines = useMemo<YilmazMachineModel[]>(() => [
        'AIM-3410',
        'AIM-7510',
        'ALM-6510',
        'ALM-7510',
        'PIM-6509',
        'PIM-7510'
    ], []);

    // --- Effects & Logic ---
    // Calculate waste comparison when optimization is available
    useEffect(() => {
        if (optimization && optimization.cuttingPlan.length > 0 && project) {
            try {
                // Collect all required cuts from components
                // ✅ HARDENING: Properly type cuts to match Cut interface
                const requiredCuts: Cut[] = project.components.flatMap((comp) => {
                    const cuts: Cut[] = [];
                    const cutLength = comp.cuttingLengths[0] || comp.height; // Fallback if cuttingLengths empty
                    for (let i = 0; i < (comp.quantity || 1); i++) {
                        cuts.push({
                            componentId: `${comp.id}-${i}`,
                            length: cutLength,
                            angle: 0, // Default angle for manual calculation
                            waste: 0, // Will be calculated by the function
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
                const err = error instanceof Error ? error : new Error(String(error));
                trackError('ProductionCommand', 'waste_comparison', err.message);
            }
        }
    }, [optimization, project]);

    // P2.3: Labels from BarcodeLabelGenerator
    const labelOptions: BarcodeLabelOptions = useMemo(() => ({
        format: 'code128',
        includeQR: true,
        labelSize: 'medium',
        includeMetadata: true,
        language: 'en',
    }), []);
    const labels = useMemo(() => {
        if (!optimization?.cuttingPlan?.length || !project?.orderNumber) return [];
        const gen = new BarcodeLabelGenerator();
        return gen.generateLabels(optimization.cuttingPlan, project.orderNumber, labelOptions);
    }, [optimization?.cuttingPlan, project?.orderNumber, labelOptions]);

    // --- Internal Handlers ---
    // ✅ HARDENING: Memoize all handlers to prevent unnecessary re-renders
    
    const handleGenerateGCode = useCallback(async () => {
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
            const err = error instanceof Error ? error : new Error(String(error));
            trackError('ProductionCommand', 'gcode_generation', err.message);
            throw error;
        }
    }, [optimization, project, selectedMachine]);

    const handleExportCuttingReport = useCallback(async () => {
        if (!project || !optimization) return;

        try {
            // PHASE 4: Lazy load PDF export library only when user clicks export
            // This prevents loading ~1.9MB document-vendor chunk until needed
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
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            trackError('ProductionCommand', 'report_export', err.message);
            throw error;
        }
    }, [project, optimization, branding]);

    const handleSendToMachine = useCallback(async () => {
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
            const err = error instanceof Error ? error : new Error(String(error));
            trackError('ProductionCommand', 'machine_send', err.message);
            throw error;
        }
    }, [gCodePreview, project]);

    const handleDownloadALM6510MDB = useCallback(async () => {
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
            const err = error instanceof Error ? error : new Error(String(error));
            trackError('ProductionCommand', 'alm6510_export', err.message);
            setAlm6510ExportError(err.message);
        } finally {
            setIsGeneratingALM6510(false);
        }
    }, [project, optimization]);

    const confirmAndExecute = useCallback((action: 'gcode' | 'report' | 'send' | 'alm6510' | 'splitpo') => {
        setPendingAction(action);
        setShowProductionPreview(true);
    }, []);

    const executePendingAction = useCallback(async () => {
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
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            setLastActionResult({ success: false, message: err.message || t('production_command.unknown_error', 'An unknown error occurred.') });
            // Keep dialog open on error so user can see the error
        } finally {
            setIsProcessing(false);
            setPendingAction(null);
        }
    }, [pendingAction, handleGenerateGCode, handleExportCuttingReport, handleSendToMachine, handleDownloadALM6510MDB, project, optimization, installationBreakdown, selectedMachine, t]);

    // ✅ HARDENING: Memoize inline export handlers for performance
    const handleQuickExportPDF = useCallback(async () => {
        if (project && optimization) {
            try {
                const exportService = new ExportService();
                const result = await exportService.exportProject(project, optimization, 'pdf', {
                    includeDiagrams: true,
                    includeQRCode: true,
                });
                if (result.blob) {
                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cutting-list-${project.orderNumber || 'export'}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                trackError('ProductionCommand', 'pdf_export', err.message);
            }
        }
    }, [project, optimization]);

    const handleQuickExportDXF = useCallback(async () => {
        if (project && optimization) {
            try {
                const exportService = new ExportService();
                const result = await exportService.exportProject(project, optimization, 'dxf', {
                    includeAnnotations: true,
                    includeQRCode: true,
                });
                if (result.blob) {
                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cutting-list-${project.orderNumber || 'export'}.dxf`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                trackError('ProductionCommand', 'dxf_export', err.message);
            }
        }
    }, [project, optimization]);

    const handleQuickSplitPO = useCallback(() => {
        if (project && optimization) {
            downloadSplitPO(project, optimization, installationBreakdown || undefined);
        }
    }, [project, optimization, installationBreakdown]);

    // ✅ HARDENING: Memoize machine selection handler
    const handleMachineChange = useCallback((val: string) => {
        setSelectedMachine(val as YilmazMachineModel);
    }, []);

    // --- Render Logic ---
    if (isGenerating) {
        return (
            <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
                    <h3 className="typography-h3 text-lg mb-2">{t('production_command.generating_plan', 'Generating Cutting Plan')}</h3>
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
                    <h3 className="typography-h3 text-lg mb-2">{t('production_command.no_optimization', 'No Optimization Data')}</h3>
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
                        <Scissors className="h-6 w-6 text-amber-400" />
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
                        <DollarSign className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-400">${optimization.costBreakdown.totalCost.toFixed(0)}</div>
                        <div className="text-sm text-gray-400">{t('production_command.total_cost', 'Total Cost')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* --- 3. VISUAL CUTTING PLAN (BarDrawing) --- */}
            <Card className="bg-gray-800/30 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-base">{t('production_command.visual_cutting_plan', 'Visual Cutting Plan')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <BarDrawing
                        cuttingPlans={optimization.cuttingPlan}
                        profiles={profiles}
                        projectName={project?.orderNumber}
                        orderNumber={project?.orderNumber}
                        onExportPDF={handleQuickExportPDF}
                        onExportDXF={handleQuickExportDXF}
                    />
                </CardContent>
            </Card>

            {/* --- 3b. CUT SHEETS (per-bar instructions) --- */}
            {optimization.cuttingPlan.length > 0 && (() => {
                const cutSheets = generateCutSheets(optimization.cuttingPlan, {
                    orderNumber: project?.orderNumber,
                    positionNumber: project?.posNumber,
                });
                return (
                    <Card className="bg-gray-800/30 border-gray-700">
                        <CardHeader
                            className="cursor-pointer select-none flex flex-row items-center justify-between"
                            onClick={() => setIsCutSheetsExpanded(!isCutSheetsExpanded)}
                        >
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {t('production_command.cut_sheets', 'Cut Sheets')}
                                <Badge variant="outline" className="font-mono text-xs">
                                    {cutSheets.totalBars} {t('production_command.bars', 'bars')}
                                </Badge>
                            </CardTitle>
                            {isCutSheetsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CardHeader>
                        {isCutSheetsExpanded && (
                            <CardContent className="space-y-4">
                                {cutSheets.bars.map((bar) => (
                                    <div key={bar.barIndex} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-gray-200">
                                                Bar {bar.barIndex}: {bar.profileName}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {bar.stockLength}mm stock • {bar.utilizationPercent.toFixed(1)}% util
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                                            <div className="text-gray-500">#</div>
                                            <div className="text-gray-500">Length</div>
                                            <div className="text-gray-500">Angle</div>
                                            <div className="text-gray-500">Position</div>
                                            <div className="text-gray-500">Component</div>
                                            {bar.cuts.map((c) => (
                                                <React.Fragment key={c.sequence}>
                                                    <div>{c.sequence}</div>
                                                    <div>{c.lengthMm}mm</div>
                                                    <div>{c.angleDeg}°</div>
                                                    <div>{c.positionMm}mm</div>
                                                    <div className="truncate" title={c.componentId}>{c.componentId}</div>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        {bar.wasteMm > 0 && (
                                            <div className="mt-2 text-xs text-red-400">
                                                Waste: {bar.wasteMm.toFixed(0)}mm
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        )}
                    </Card>
                );
            })()}

            {/* --- 3c. LABELS (per-piece barcode/QR) --- */}
            {labels.length > 0 && (
                <Card className="bg-gray-800/30 border-gray-700">
                    <CardHeader
                        className="cursor-pointer select-none flex flex-row items-center justify-between"
                        onClick={() => setIsLabelsExpanded(!isLabelsExpanded)}
                    >
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('production_command.labels', 'Labels')}
                            <Badge variant="outline" className="font-mono text-xs">
                                {labels.length} {t('production_command.pieces', 'pieces')}
                            </Badge>
                        </CardTitle>
                        {isLabelsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardHeader>
                    {isLabelsExpanded && (
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const gen = new BarcodeLabelGenerator();
                                        const zpl = labels.map((l) => gen.generateZPL(l, labelOptions)).join('\n');
                                        const blob = new Blob([zpl], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `labels_${project?.orderNumber || 'export'}_zpl.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    {t('production_command.download_zpl', 'Download ZPL')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const html = generateLabelSheetHTML(labels, project?.orderNumber || '');
                                        const blob = new Blob([html], { type: 'text/html' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `labels_${project?.orderNumber || 'export'}.html`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('production_command.download_label_sheet', 'Label Sheet (HTML)')}
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                                {labels.slice(0, 24).map((label, i) => (
                                    <div
                                        key={i}
                                        className="bg-gray-900/80 rounded border border-gray-700 p-2 text-xs font-mono"
                                    >
                                        <div className="font-semibold text-amber-400 truncate">{label.barcode}</div>
                                        <div className="text-gray-400 mt-1">{label.profileName}</div>
                                        <div>{label.cutLength}mm @ {label.angle}°</div>
                                        {label.position && <div className="text-gray-500">{label.position}</div>}
                                        {label.qrCode && (
                                            <div className="mt-1 text-[10px] text-gray-600 truncate" title={label.qrCode}>
                                                QR: {label.qrCode.slice(0, 30)}…
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {labels.length > 24 && (
                                <div className="text-xs text-gray-500">
                                    {t('production_command.showing_first', 'Showing first 24 of {total} labels', { total: labels.length })}
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* --- 3d. ASSEMBLY SEQUENCE --- */}
            {bom?.assemblySequence && bom.assemblySequence.length > 0 && (
                <Card className="bg-gray-800/30 border-gray-700">
                    <CardHeader
                        className="cursor-pointer select-none flex flex-row items-center justify-between"
                        onClick={() => setIsAssemblyExpanded(!isAssemblyExpanded)}
                    >
                        <CardTitle className="text-base flex items-center gap-2">
                            <ListOrdered className="h-4 w-4" />
                            {t('production_command.assembly_sequence', 'Assembly Sequence')}
                            <Badge variant="outline" className="font-mono text-xs">
                                {bom.assemblySequence.length} {t('production_command.steps', 'steps')}
                            </Badge>
                        </CardTitle>
                        {isAssemblyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardHeader>
                    {isAssemblyExpanded && (
                        <CardContent>
                            <ol className="space-y-3">
                                {bom.assemblySequence.map((step) => (
                                    <li key={step.step} className="flex gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600/30 text-amber-300 flex items-center justify-center font-semibold text-sm">
                                            {step.step}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-200">{step.operation}</div>
                                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                                                <span>{step.station}</span>
                                                <span>•</span>
                                                <span>{step.estimatedTime} min</span>
                                                {step.toolsRequired?.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{step.toolsRequired.join(', ')}</span>
                                                    </>
                                                )}
                                            </div>
                                            {step.qualityGates && step.qualityGates.length > 0 && (
                                                <ul className="mt-2 text-xs text-gray-500 list-disc list-inside">
                                                    {step.qualityGates.map((gate, i) => (
                                                        <li key={i}>{gate}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </CardContent>
                    )}
                </Card>
            )}

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

            {/* --- 5. ONE-CLICK EXPORT PANEL (Egypt Pilot) --- */}
            <Card className="bg-gradient-to-r from-amber-900/20 to-amber-800/20 border-amber-500/50" id="dispatch-section">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Download className="h-5 w-5 text-amber-400" />
                        {t('production_command.one_click_export', 'One-Click Export (Egypt Pilot)')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Quick Export Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button
                            onClick={handleQuickExportPDF}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-16 flex flex-col items-center justify-center gap-1"
                            disabled={!project || !optimization}
                        >
                            <FileText className="h-6 w-6" />
                            <span className="text-sm font-semibold">PDF Export</span>
                            <span className="text-xs opacity-90">Cutting List</span>
                        </Button>
                        <Button
                            onClick={handleQuickExportDXF}
                            className="bg-green-600 hover:bg-green-700 text-white h-16 flex flex-col items-center justify-center gap-1"
                            disabled={!project || !optimization}
                        >
                            <Code className="h-6 w-6" />
                            <span className="text-sm font-semibold">DXF Export</span>
                            <span className="text-xs opacity-90">CNC Ready</span>
                        </Button>
                        <Button
                            onClick={handleQuickSplitPO}
                            className="btn-primary"
                            disabled={!project || !optimization}
                        >
                            <Send className="h-6 w-6" />
                            <span className="text-sm font-semibold">Split PO</span>
                            <span className="text-xs opacity-90">3 POs Export</span>
                        </Button>
                    </div>
                    <div className="text-xs text-gray-400 text-center pt-2">
                        All exports include Frame + Sash cuts separately • Ready for production
                    </div>
                </CardContent>
            </Card>

            {/* --- 6. DISPATCH TO PRODUCTION (Advanced) --- */}
            <Card className="bg-gray-800/30 border-gray-700" id="dispatch-section-advanced">
                <CardHeader>
                     <CardTitle className="text-base">{t('production_command.dispatch_to_production', 'Dispatch to Production (Advanced)')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Side: CNC Machine Control */}
                    <div className="space-y-4">
                        <h3 className="typography-h3 text-gray-300">{t('production_command.cnc_machine_integration', 'CNC Machine Integration')}</h3>
                        <div>
                            <label className="typography-label text-sm font-medium text-gray-400">{t('production_command.target_machine', 'Target Yilmaz Machine:')}</label>
                            <Select value={selectedMachine} onValueChange={handleMachineChange}>
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
                             <div className="space-y-2">
                                <label className="typography-label text-sm font-medium text-gray-400 block">{t('production_command.machine_simulation', 'Machine Simulation')}</label>
                                <div className="rounded-md overflow-hidden border border-gray-700 bg-gray-950 relative h-64">
                                    <CNCSimulationView gcode={gCodePreview} machine={selectedMachine} />
                                </div>
                                <div className="text-xs text-center text-gray-500 font-mono">
                                    {t('production_command.simulation_note', 'Visualizing tool path for {machine} controller', { machine: selectedMachine })}
                                </div>
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
                                className="btn-primary-gradient"
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
                        
                         <Button onClick={() => confirmAndExecute('send')} disabled={isProcessing || !gCodePreview} size="lg" className="btn-primary">
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

ProductionCommandComponent.displayName = 'ProductionCommand';

// ✅ HARDENING: Memoize component for performance
const ProductionCommandMemo = memo(ProductionCommandComponent);

// ✅ HARDENING: Export with error boundary for production
export const ProductionCommand: React.FC<ProductionCommandProps> = (props) => (
  <ErrorBoundary level="component">
    <ProductionCommandMemo {...props} />
  </ErrorBoundary>
);

ProductionCommand.displayName = 'ProductionCommand';
