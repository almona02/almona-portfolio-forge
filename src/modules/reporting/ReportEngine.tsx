/**
 * ReportEngine - Main reporting component
 * Orchestrates PDF generation with branding
 */

import { Quote } from '@/modules/commercial/QuotingEngine';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { FabricatorAccessory, OptimizationResult, WindowUnit } from '@/types/fabricator';
import { AlertCircle, CheckCircle, Download, FileCode, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
// PHASE 4: PDFExportService is now lazy-loaded - see handleGenerateReport
import { ExportFormat, PDFExportOptions as ExportPDFOptions, ExportProgress, ExportService } from '@/lib/exports';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { AccessoriesReport } from './AccessoriesReport';
import { CuttingListReport } from './CuttingListReport';
import { GlassReport } from './GlassReport';
import type { CompanyBranding, PDFOptions } from './PDFExportService';

interface ReportEngineProps {
  project: WindowUnit;
  optimization: OptimizationResult | null;
  quote: Quote | null;
  branding: CompanyBranding;
  accessories?: FabricatorAccessory[];
  language?: 'en' | 'tr' | 'ar';
  pricingEngine?: PricingEngine;
}

export type ReportType = 'quotation' | 'cutting_list' | 'accessories' | 'glass' | 'complete';

export const ReportEngine: React.FC<ReportEngineProps> = ({
  project,
  optimization,
  quote,
  branding,
  accessories = [],
  language = 'en',
  pricingEngine,
}) => {
  const [reportType, setReportType] = useState<ReportType>('complete');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const [options, setOptions] = useState<PDFOptions>({
    branding,
    includeCuttingList: true,
    includeAccessories: true,
    includeGlazing: true,
    includeAssemblyGuide: true,
    include3DPreview: false,
  });

  const handleGenerateReport = async () => {
    if (!project) {
      setError('No project available');
      return;
    }

    if (reportType === 'quotation' && !quote) {
      setError('Quote is required for quotation report');
      return;
    }

    if ((reportType === 'cutting_list' || reportType === 'complete') && !optimization) {
      setError('Optimization data is required for cutting list report');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);
    setExportProgress(null);

    try {
      const exportService = new ExportService();
      const exportId = `export_${Date.now()}`;
      
      exportService.onProgress(exportId, (progress) => {
        setExportProgress(progress);
      });

      // For new report types, use ExportService
      if (reportType === 'accessories' || reportType === 'glass') {
        const mockOptimization = optimization || {
          materialUsage: 0,
          wastePercentage: 0,
          estimatedProductionTime: 0,
          cuttingPlan: [],
          nestingEfficiency: 0,
          costBreakdown: {
            materialCost: 0,
            laborCost: 0,
            hardwareCost: 0,
            glazingCost: 0,
            totalCost: 0,
          },
        };

        const exportOptions: ExportPDFOptions = {
          branding,
          language,
          includeAccessories: reportType === 'accessories',
          includeGlazing: reportType === 'glass',
          includeCuttingList: false,
        };

        const result = await exportService.exportProject(project, mockOptimization, exportFormat, exportOptions);

        if (result.success && result.blob) {
          exportService.download(result);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError(result.error || 'Export failed');
        }
      } else {
        // PHASE 4: Lazy load PDF export library only when generating report
        const { PDFExportService } = await import('@/modules/reporting/PDFExportService');
        const pdfService = new PDFExportService(branding);
        let blob: Blob;

        switch (reportType) {
          case 'quotation':
            if (!quote) throw new Error('Quote required');
            blob = await pdfService.generateQuotationPDF(project, quote, options);
            break;
          case 'cutting_list':
            if (!optimization) throw new Error('Optimization required');
            blob = await pdfService.generateCuttingListPDF(project, optimization, options);
            break;
          case 'complete':
            if (!optimization || !quote) throw new Error('Optimization and quote required');
            blob = await pdfService.generateCompleteReport(project, optimization, quote, options);
            break;
          default:
            throw new Error('Invalid report type');
        }

        // Download the PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.orderNumber}_${reportType}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Report generated and downloaded successfully!</AlertDescription>
        </Alert>
      )}

      {exportProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {exportProgress.message} ({exportProgress.percentage}%)
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(value) => {
              setReportType(value as ReportType);
              setShowReportPreview(false);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quotation">Project Quotation</SelectItem>
                <SelectItem value="cutting_list">Cutting List</SelectItem>
                <SelectItem value="accessories">Accessories & Hardware</SelectItem>
                <SelectItem value="glass">Glass & Glazing</SelectItem>
                <SelectItem value="complete">Complete Project Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Format Selection (for new report types) */}
          {(reportType === 'accessories' || reportType === 'glass') && (
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('pdf')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('csv')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                {reportType === 'glass' && (
                  <Button
                    variant={exportFormat === 'dxf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportFormat('dxf')}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    DXF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Preview Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-preview"
              checked={showReportPreview}
              onCheckedChange={(checked) => setShowReportPreview(checked === true)}
            />
            <Label htmlFor="show-preview" className="typography-label text-sm">
              Show Report Preview
            </Label>
          </div>

          {/* Options for Complete Report */}
          {reportType === 'complete' && (
            <div className="space-y-3 p-4 bg-gray-700 rounded-lg">
              <Label className="typography-label text-sm font-semibold">Report Sections</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-cutting"
                    checked={options.includeCuttingList}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeCuttingList: checked === true })
                    }
                  />
                  <Label htmlFor="include-cutting" className="typography-label text-sm">
                    Include Cutting List
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-accessories"
                    checked={options.includeAccessories}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeAccessories: checked === true })
                    }
                  />
                  <Label htmlFor="include-accessories" className="typography-label text-sm">
                    Include Accessories & Hardware
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-glazing"
                    checked={options.includeGlazing}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeGlazing: checked === true })
                    }
                  />
                  <Label htmlFor="include-glazing" className="typography-label text-sm">
                    Include Glass & Glazing Report
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-assembly"
                    checked={options.includeAssemblyGuide}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeAssemblyGuide: checked === true })
                    }
                  />
                  <Label htmlFor="include-assembly" className="typography-label text-sm">
                    Include Assembly & Installation Guide
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || !project}
            className="btn-primary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download PDF
              </>
            )}
          </Button>

          {/* Info */}
          <div className="text-sm text-gray-400">
            <p>
              The report will include your company branding (logo, colors, contact information)
              and will be automatically downloaded when ready.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      {showReportPreview && (
        <div className="mt-6">
          {reportType === 'cutting_list' && optimization && (
            <CuttingListReport
              project={project}
              optimization={optimization}
              branding={branding}
              language={language}
            />
          )}
          {reportType === 'accessories' && (
            <AccessoriesReport
              project={project}
              accessories={accessories}
              branding={branding}
              language={language}
              pricingEngine={pricingEngine}
            />
          )}
          {reportType === 'glass' && (
            <GlassReport
              project={project}
              branding={branding}
              language={language}
            />
          )}
        </div>
      )}
    </div>
  );
};

