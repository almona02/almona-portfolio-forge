import React, { useState } from 'react';
import { WindowUnit, OptimizationResult } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { FileText, Scissors, Package, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

interface QuickReportsPanelProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
}

export const QuickReportsPanel: React.FC<QuickReportsPanelProps> = ({
  project,
  optimization,
}) => {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const handleGenerateCuttingList = async () => {
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
      console.error('Failed to generate cutting list:', error);
      toast.error('Failed to generate cutting list');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleGenerateGlassReport = async () => {
    if (!project || generatingReport) return;

    setGeneratingReport('glass');
    try {
      // Placeholder – hook into real glass report generator when available
      toast.info('Glass report generator coming soon');
      if (project) {
        track('fabricator_report_triggered', {
          type: 'glass',
          jobId: project.id,
          orderNumber: project.orderNumber,
        });
      }
    } catch (error) {
      console.error('Failed to generate glass report:', error);
      toast.error('Failed to generate glass report');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleGenerateAccessoriesList = async () => {
    if (!project || generatingReport) return;

    setGeneratingReport('accessories');
    try {
      // Placeholder – hook into real accessories report generator when available
      toast.info('Accessories report generator coming soon');
      if (project) {
        track('fabricator_report_triggered', {
          type: 'accessories',
          jobId: project.id,
          orderNumber: project.orderNumber,
        });
      }
    } catch (error) {
      console.error('Failed to generate accessories list:', error);
      toast.error('Failed to generate accessories list');
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-400" />
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
    </Card>
  );
};

export default QuickReportsPanel;


