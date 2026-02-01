import ErrorBoundary from '@/components/ErrorBoundary';
import { track } from '@/lib/analytics';
import { ExportService } from '@/lib/exports';
import { trackError } from '@/lib/performance-monitoring';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { AccessoriesReport } from '@/modules/reporting/AccessoriesReport';
import { GlassReport } from '@/modules/reporting/GlassReport';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { OptimizationResult, WindowUnit } from '@/types/fabricator';
import { FileCode, FileSpreadsheet, FileText, Loader2, Package, Scissors, Zap } from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface QuickReportsPanelProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
}

const QuickReportsPanelComponent: React.FC<QuickReportsPanelProps> = ({
  project,
  optimization,
}) => {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showAccessoriesReport, setShowAccessoriesReport] = useState(false);
  const [showGlassReport, setShowGlassReport] = useState(false);
  
  // ✅ PERFORMANCE: Memoize pricing engine instance
  const pricingEngine = useMemo(() => new PricingEngine(), []);

  // ✅ PERFORMANCE: Memoize handlers to prevent unnecessary re-renders
  const handleGenerateCuttingList = useCallback(async () => {
    if (!project || !optimization || generatingReport) return;

    setGeneratingReport('cutting');
    try {
      const { PDFExportGenerator } = await import('@/lib/exports/PDFExportGenerator');
      const generator = new PDFExportGenerator();

      const pdfBlob = await generator.generate(project, optimization, {
        includeCuttingList: true,
        includeAccessories: false,
        includeGlazing: false,
        includeAssemblyGuide: false,
        include3DPreview: false,
        includeQRCode: true,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cutting_list_${project.orderNumber}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Cutting list generated successfully');
      track('fabricator_report_generated', {
        type: 'cutting_list',
        jobId: project.id,
        orderNumber: project.orderNumber,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('QuickReportsPanel', 'generate_cutting_list', err.message);
      toast.error('Failed to generate cutting list');
    } finally {
      setGeneratingReport(null);
    }
  }, [project, optimization, generatingReport]);

  const handleGenerateGlassReport = useCallback(async () => {
    if (!project || generatingReport) return;

    setGeneratingReport('glass');
    try {
      // Open glass report in modal
      setShowGlassReport(true);
      track('fabricator_report_triggered', {
        type: 'glass',
        jobId: project.id,
        orderNumber: project.orderNumber,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('QuickReportsPanel', 'open_glass_report', err.message);
      toast.error('Failed to open glass report');
    } finally {
      setGeneratingReport(null);
    }
  }, [project, generatingReport]);

  const handleGenerateAccessoriesList = useCallback(async () => {
    if (!project || generatingReport) return;

    setGeneratingReport('accessories');
    try {
      // Open accessories report in modal
      setShowAccessoriesReport(true);
      track('fabricator_report_triggered', {
        type: 'accessories',
        jobId: project.id,
        orderNumber: project.orderNumber,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('QuickReportsPanel', 'open_accessories_list', err.message);
      toast.error('Failed to open accessories list');
    } finally {
      setGeneratingReport(null);
    }
  }, [project, generatingReport]);

  const handleGenerateMachineCsv = useCallback(async () => {
    if (!project || !optimization || generatingReport) return;

    setGeneratingReport('machine_csv');
    try {
      const exportService = new ExportService();
      const result = await exportService.exportProject(project, optimization, 'csv', {
        machineProfileId: 'generic_saw_csv_v1',
        includeHeaders: true,
        includeQRCode: false,
      });

      if (result.success) {
        exportService.download(result);
        toast.success('Machine CSV (saw) generated successfully');
        track('fabricator_report_generated', {
          type: 'machine_csv',
          jobId: project.id,
          orderNumber: project.orderNumber,
        });
      } else {
        throw new Error(result.error || 'Machine CSV export failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('QuickReportsPanel', 'generate_machine_csv', err.message);
      toast.error('Failed to generate machine CSV');
    } finally {
      setGeneratingReport(null);
    }
  }, [project, optimization, generatingReport]);

  const handleGenerateMachineDxf = useCallback(async () => {
    if (!project || !optimization || generatingReport) return;

    setGeneratingReport('machine_dxf');
    try {
      const exportService = new ExportService();
      const result = await exportService.exportProject(project, optimization, 'dxf', {
        machineProfileId: 'generic_saw_dxf_v1',
        includeQRCode: true,
      });

      if (result.success) {
        exportService.download(result);
        toast.success('Machine DXF (saw) generated successfully');
        track('fabricator_report_generated', {
          type: 'machine_dxf',
          jobId: project.id,
          orderNumber: project.orderNumber,
        });
      } else {
        throw new Error(result.error || 'Machine DXF export failed');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('QuickReportsPanel', 'generate_machine_dxf', err.message);
      toast.error('Failed to generate machine DXF');
    } finally {
      setGeneratingReport(null);
    }
  }, [project, optimization, generatingReport]);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          Quick Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={handleGenerateCuttingList}
          disabled={!optimization || generatingReport !== null}
        >
          {generatingReport === 'cutting' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Scissors className="h-4 w-4 mr-2" />
          )}
          Cutting List
          {!optimization && (
            <span className="ml-auto text-[10px] text-gray-500">Need optimization</span>
          )}
          {generatingReport === 'cutting' && (
            <span className="ml-auto text-[10px] text-gray-500">Generating...</span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={handleGenerateMachineCsv}
          disabled={!optimization || generatingReport !== null}
        >
          {generatingReport === 'machine_csv' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Machine CSV (Saw)
          {generatingReport === 'machine_csv' && (
            <span className="ml-auto text-[10px] text-gray-500">Generating...</span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={handleGenerateMachineDxf}
          disabled={!optimization || generatingReport !== null}
        >
          {generatingReport === 'machine_dxf' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileCode className="h-4 w-4 mr-2" />
          )}
          Machine DXF (Saw)
          {generatingReport === 'machine_dxf' && (
            <span className="ml-auto text-[10px] text-gray-500">Generating...</span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={handleGenerateGlassReport}
          disabled={!project || generatingReport !== null}
        >
          {generatingReport === 'glass' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Glass Report
          {generatingReport === 'glass' && (
            <span className="ml-auto text-[10px] text-gray-500">Generating...</span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={handleGenerateAccessoriesList}
          disabled={!project || generatingReport !== null}
        >
          {generatingReport === 'accessories' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Package className="h-4 w-4 mr-2" />
          )}
          Accessories List
          {generatingReport === 'accessories' && (
            <span className="ml-auto text-[10px] text-gray-500">Generating...</span>
          )}
        </Button>

        {project && optimization && (
          <div className="pt-2 border-t border-gray-700">
            <p className="text-[11px] text-gray-400 text-center">
              Optimization ready – job can be sent to production.
            </p>
          </div>
        )}
      </CardContent>

      {/* Accessories Report Modal - Responsive */}
      {project && (
        <Dialog open={showAccessoriesReport} onOpenChange={setShowAccessoriesReport}>
          <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] p-0 sm:p-6 flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-0 pb-2 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Accessories & Hardware Report
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Complete list of all hardware, screws, gaskets, and accessories for {project.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 -mx-4 sm:-mx-6">
              <div className="min-h-full">
                <AccessoriesReport
                  project={project}
                  accessories={[]} // Will extract from project.hardware
                  language="en"
                  pricingEngine={pricingEngine}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Glass Report Modal - Responsive */}
      {project && (
        <Dialog open={showGlassReport} onOpenChange={setShowGlassReport}>
          <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] p-0 sm:p-6 flex flex-col overflow-hidden">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-0 pb-2 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                Glass & Glazing Report
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Detailed glass specifications and cutting plan for {project.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 -mx-4 sm:-mx-6">
              <div className="min-h-full">
                <GlassReport
                  project={project}
                  language="en"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

QuickReportsPanelComponent.displayName = 'QuickReportsPanel';

// ✅ HARDENING: Memoize component for performance
const QuickReportsPanelMemo = memo(QuickReportsPanelComponent);

// ✅ HARDENING: Export with error boundary for production
export const QuickReportsPanel: React.FC<QuickReportsPanelProps> = (props) => (
  <ErrorBoundary level="component">
    <QuickReportsPanelMemo {...props} />
  </ErrorBoundary>
);

QuickReportsPanel.displayName = 'QuickReportsPanel';

export default QuickReportsPanel;


