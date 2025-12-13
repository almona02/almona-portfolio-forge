/**
 * CuttingListReport - Enhanced cutting list report component
 * Phase 2: Professional Report Generation System
 * 
 * Features:
 * - Visual cutting diagrams (SVG)
 * - Profile information display
 * - Cut sequence visualization
 * - Waste calculation per stock piece
 * - Utilization percentage
 * - QR code for tracking
 * - Multi-format export buttons (PDF, CSV, DXF)
 * - Print preview
 * - Multi-language support
 */

import { ExportFormat, ExportProgress, ExportService, PDFExportOptions } from '@/lib/exports';
import { formatDate, formatNumber, formatUnit, getRTLClass, getTextAlign } from '@/lib/localization/formatUtils';
import { injectPrintStyles } from '@/lib/localization/printStyles';
import { cuttingListGenerator } from '@/lib/reports/CuttingListGenerator';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { OptimizationResult, WindowUnit } from '@/types/fabricator';
import {
  AlertCircle,
  CheckCircle,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  QrCode,
  Scissors
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompanyBranding } from './PDFExportService';

interface CuttingListReportProps {
  project: WindowUnit;
  optimization: OptimizationResult;
  branding?: CompanyBranding;
  language?: 'en' | 'tr' | 'ar';
  onExport?: (format: ExportFormat) => void;
}

export const CuttingListReport: React.FC<CuttingListReportProps> = ({
  project,
  optimization,
  branding,
  language = 'en',
  onExport,
}) => {
  const { t } = useTranslation('reports');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'diagrams' | 'details'>('overview');

  const exportService = new ExportService();
  const reportData = cuttingListGenerator.generateReportData(project, optimization);

  // Inject print styles on mount
  useEffect(() => {
    injectPrintStyles();
  }, []);

  // Generate QR code on mount
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = {
          projectId: project.id,
          orderNumber: project.orderNumber,
          generatedAt: new Date().toISOString(),
          reportType: 'cutting_list',
        };
        const url = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };

    generateQRCode();
  }, [project]);

  const handleExport = async (format: ExportFormat) => {
    if (!project || !optimization) return;

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);
    setExportProgress(null);

    try {
      const options: PDFExportOptions = {
        branding: branding || {
          companyName: 'Almona',
          primaryColor: '#FF6B35',
        },
        language,
        includeQRCode: true,
        includeDiagrams: true,
        includeCuttingList: true,
        includeAccessories: false,
        includeGlazing: false,
      };

      // Track progress
      const exportId = `export_${Date.now()}`;
      exportService.onProgress(exportId, (progress) => {
        setExportProgress(progress);
      });

      const result = await exportService.exportProject(project, optimization, format, options);

      if (result.success && result.blob) {
        exportService.download(result);
        setExportSuccess(true);
        if (onExport) {
          onExport(format);
        }
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        setExportError(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <div className={`space-y-6 print:space-y-4 ${getRTLClass(language)}`} dir={dir}>
      {/* Header with Export Buttons */}
      <Card className="print:hidden">
        <CardHeader>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
            <div className={getTextAlign(language)}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Scissors className="h-5 w-5" />
                {t('cuttingList.title', 'Cutting List Report')}
              </CardTitle>
              <CardDescription>
                {t('cuttingList.order', 'Order')}: {project.orderNumber} | {t('cuttingList.type', 'Type')}: {project.type}
              </CardDescription>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="print:hidden"
              >
                <Printer className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('common.print', 'Print')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
              >
                {isExporting && exportProgress?.format === 'pdf' ? (
                  <Loader2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                ) : (
                  <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                {isExporting && exportProgress?.format === 'csv' ? (
                  <Loader2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                ) : (
                  <FileSpreadsheet className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('dxf')}
                disabled={isExporting}
              >
                {isExporting && exportProgress?.format === 'dxf' ? (
                  <Loader2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                ) : (
                  <FileCode className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                DXF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress and Status */}
      {exportProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {exportProgress.message} ({exportProgress.percentage}%)
          </AlertDescription>
        </Alert>
      )}

      {exportError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {exportSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{t('common.exportSuccess', 'Export completed successfully!')}</AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="print:block">
        <TabsList className={`print:hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TabsTrigger value="overview">{t('cuttingList.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="diagrams">{t('cuttingList.diagrams', 'Cutting Diagrams')}</TabsTrigger>
          <TabsTrigger value="details">{t('cuttingList.details', 'Detailed List')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className={`pb-2 ${getTextAlign(language)}`}>
                <CardDescription>{t('cuttingList.totalStockPieces', 'Total Stock Pieces')}</CardDescription>
                <CardTitle className="text-2xl">{reportData.summary.totalStockPieces}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className={`pb-2 ${getTextAlign(language)}`}>
                <CardDescription>{t('cuttingList.materialUsed', 'Material Used')}</CardDescription>
                <CardTitle className="text-2xl">
                  {formatUnit(reportData.summary.totalMaterialUsed, language, 2)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className={`pb-2 ${getTextAlign(language)}`}>
                <CardDescription>{t('cuttingList.totalWaste', 'Total Waste')}</CardDescription>
                <CardTitle className="text-2xl">
                  {formatUnit(reportData.summary.totalWaste, language, 2)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className={`pb-2 ${getTextAlign(language)}`}>
                <CardDescription>{t('cuttingList.avgUtilization', 'Avg Utilization')}</CardDescription>
                <CardTitle className="text-2xl">
                  {formatNumber(reportData.summary.averageUtilization, language, 1)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle className={getTextAlign(language)}>{t('cuttingList.projectInfo', 'Project Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className={getTextAlign(language)}>
                  <p className="text-sm text-muted-foreground">{t('cuttingList.orderNumber', 'Order Number')}</p>
                  <p className="font-medium">{project.orderNumber}</p>
                </div>
                <div className={getTextAlign(language)}>
                  <p className="text-sm text-muted-foreground">{t('cuttingList.type', 'Type')}</p>
                  <p className="font-medium">{project.type}</p>
                </div>
                <div className={getTextAlign(language)}>
                  <p className="text-sm text-muted-foreground">{t('cuttingList.dimensions', 'Dimensions')}</p>
                  <p className="font-medium">
                    {formatUnit(project.overallWidth, language)} x {formatUnit(project.overallHeight, language)}
                  </p>
                </div>
                <div className={getTextAlign(language)}>
                  <p className="text-sm text-muted-foreground">{t('cuttingList.estimatedTime', 'Estimated Time')}</p>
                  <p className="font-medium">
                    {formatNumber(reportData.summary.estimatedProductionTime, language, 1)} {t('cuttingList.hours', 'hours')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {qrCodeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <QrCode className="h-5 w-5" />
                  {t('cuttingList.reportTracking', 'Report Tracking')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 print:w-24 print:h-24" />
                  <div className={getTextAlign(language)}>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('cuttingList.scanQR', 'Scan to access report details')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('cuttingList.project', 'Project')}: {project.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('cuttingList.generated', 'Generated')}: {formatDate(new Date(), language)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Diagrams Tab */}
        <TabsContent value="diagrams" className="space-y-4">
          {reportData.cuttingPlans.map((plan, index) => (
            <Card key={index} className="print:break-inside-avoid">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cutting Plan #{plan.sequence}</CardTitle>
                    <CardDescription>
                      {plan.profile.name} | Stock: {plan.stockLength} mm
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        plan.utilization >= 90
                          ? 'default'
                          : plan.utilization >= 80
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {plan.utilization.toFixed(1)}% Utilized
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {plan.diagram && <CuttingDiagram diagram={plan.diagram} />}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Cuts</p>
                    <p className="font-medium">{plan.cuts.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Waste</p>
                    <p className="font-medium">{plan.waste.toFixed(2)} mm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {reportData.cuttingPlans.map((plan, planIndex) => {
            // Gold-tier: Group cuts by specific profile roles for accurate visualization
            const roleGroups = new Map<string, typeof plan.cuts>();
            
            plan.cuts.forEach(cut => {
              const role = cut.componentType || 'other';
              if (!roleGroups.has(role)) {
                roleGroups.set(role, []);
              }
              roleGroups.get(role)!.push(cut);
            });
            
            // Organize by category for better visualization
            const frameRoles = ['frame', 'frame_architrave', 'architrave', 'threshold', 'sill', 'head', 'jamb'];
            const sashRoles = ['sash', 'sash_sliding', 'sash_door', 'sash_flyscreen', 'sash_casement', 'screen_sash'];
            const structuralRoles = ['mullion', 'mullion_false', 'transom', 'reinforcement', 'corner_cleat'];
            const glazingRoles = ['glazing_bead', 'glazing_bead_inner', 'glazing_bead_outer'];
            const accessoryRoles = ['interlock', 'accessory', 'screen_adapter', 'panel', 'gasket', 'weather_strip'];
            
            const frameCuts = plan.cuts.filter(cut => {
              const role = cut.componentType || '';
              return frameRoles.includes(role) || 
                     cut.componentId?.toLowerCase().includes('frame') ||
                     cut.componentId?.toLowerCase().includes('architrave') ||
                     cut.componentId?.toLowerCase().includes('threshold') ||
                     cut.componentId?.toLowerCase().includes('sill') ||
                     cut.componentId?.toLowerCase().includes('head') ||
                     cut.componentId?.toLowerCase().includes('jamb');
            });
            
            const sashCuts = plan.cuts.filter(cut => {
              const role = cut.componentType || '';
              return sashRoles.includes(role) || 
                     (cut.componentId?.toLowerCase().includes('sash') && !cut.componentId?.toLowerCase().includes('frame'));
            });
            
            const structuralCuts = plan.cuts.filter(cut => {
              const role = cut.componentType || '';
              return structuralRoles.includes(role) ||
                     cut.componentId?.toLowerCase().includes('mullion') ||
                     cut.componentId?.toLowerCase().includes('transom') ||
                     cut.componentId?.toLowerCase().includes('reinforcement');
            });
            
            const glazingCuts = plan.cuts.filter(cut => {
              const role = cut.componentType || '';
              return glazingRoles.includes(role) ||
                     cut.componentId?.toLowerCase().includes('bead') ||
                     cut.componentId?.toLowerCase().includes('glazing');
            });
            
            const accessoryCuts = plan.cuts.filter(cut => {
              const role = cut.componentType || '';
              return accessoryRoles.includes(role) ||
                     cut.componentId?.toLowerCase().includes('interlock') ||
                     cut.componentId?.toLowerCase().includes('adapter') ||
                     cut.componentId?.toLowerCase().includes('panel');
            });
            
            const otherCuts = plan.cuts.filter(cut => 
              !frameCuts.includes(cut) && 
              !sashCuts.includes(cut) && 
              !structuralCuts.includes(cut) &&
              !glazingCuts.includes(cut) &&
              !accessoryCuts.includes(cut)
            );

            return (
              <Card key={planIndex} className="print:break-inside-avoid">
                <CardHeader>
                  <CardTitle>Plan #{plan.sequence} - {plan.profile.name}</CardTitle>
                  <CardDescription>
                    Stock Length: {plan.stockLength} mm | Utilization: {plan.utilization.toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Frame Cuts Section */}
                  {frameCuts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-blue-400">Frame Cuts ({frameCuts.length})</h4>
                      <div className="overflow-x-auto">
                        <table className={`w-full text-sm ${isRTL ? 'rtl' : ''}`} dir={dir}>
                          <thead>
                            <tr className="border-b">
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.seq', 'Seq')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.length', 'Length')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.angle', 'Angle')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.componentId', 'Component ID')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.position', 'Position')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.waste', 'Waste')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {frameCuts.map((cut, cutIndex) => (
                              <tr key={cutIndex} className="border-b">
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{cut.sequence}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.length, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.angle === 45
                                    ? `${formatNumber(cut.angle, language, 1)}° miter`
                                    : `${formatNumber(cut.angle, language, 1)}°`}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.componentId}
                                  {cut.componentType && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({cut.componentType})
                                    </span>
                                  )}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.position, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.waste, language, 2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sash Cuts Section */}
                  {sashCuts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-green-400">Sash Cuts ({sashCuts.length})</h4>
                      <div className="overflow-x-auto">
                        <table className={`w-full text-sm ${isRTL ? 'rtl' : ''}`} dir={dir}>
                          <thead>
                            <tr className="border-b">
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.seq', 'Seq')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.length', 'Length')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.angle', 'Angle')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.componentId', 'Component ID')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.position', 'Position')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.waste', 'Waste')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sashCuts.map((cut, cutIndex) => (
                              <tr key={cutIndex} className="border-b">
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{cut.sequence}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.length, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.angle === 45
                                    ? `${formatNumber(cut.angle, language, 1)}° miter`
                                    : `${formatNumber(cut.angle, language, 1)}°`}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.componentId}
                                  {cut.componentType && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({cut.componentType})
                                    </span>
                                  )}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.position, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.waste, language, 2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Other Cuts Section */}
                  {otherCuts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3 text-gray-400">Other Cuts ({otherCuts.length})</h4>
                      <div className="overflow-x-auto">
                        <table className={`w-full text-sm ${isRTL ? 'rtl' : ''}`} dir={dir}>
                          <thead>
                            <tr className="border-b">
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.seq', 'Seq')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.length', 'Length')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.angle', 'Angle')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.componentId', 'Component ID')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.position', 'Position')}</th>
                              <th className={`${getTextAlign(language, 'left')} p-2`}>{t('cuttingList.waste', 'Waste')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {otherCuts.map((cut, cutIndex) => (
                              <tr key={cutIndex} className="border-b">
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{cut.sequence}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.length, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.angle === 45
                                    ? `${formatNumber(cut.angle, language, 1)}° miter`
                                    : `${formatNumber(cut.angle, language, 1)}°`}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>
                                  {cut.componentId}
                                  {cut.componentType && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({cut.componentType})
                                    </span>
                                  )}
                                </td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.position, language, 2)}</td>
                                <td className={`p-2 ${getTextAlign(language, 'left')}`}>{formatUnit(cut.waste, language, 2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Cutting Diagram Component
 * Renders SVG visualization of cutting plan
 */
interface CuttingDiagramProps {
  diagram: any;
}

const CuttingDiagram: React.FC<CuttingDiagramProps> = ({ diagram }) => {
  return (
    <div className="w-full overflow-x-auto border rounded-lg p-4 bg-muted/50">
      <svg
        width={diagram.width}
        height={diagram.height}
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        className="w-full"
      >
        {/* Stock piece outline */}
        <rect
          x="0"
          y={diagram.height * 0.1}
          width={diagram.width}
          height={diagram.height * 0.8}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Cuts */}
        {diagram.cuts.map((cut: any, index: number) => (
          <g key={index}>
            <rect
              x={cut.x}
              y={cut.y}
              width={cut.width}
              height={cut.height}
              fill={cut.color || '#3B82F6'}
              fillOpacity="0.7"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              x={cut.x + cut.width / 2}
              y={cut.y + cut.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-foreground"
            >
              {cut.label}
            </text>
          </g>
        ))}

        {/* Waste segments */}
        {diagram.waste.map((waste: any, index: number) => (
          <rect
            key={`waste-${index}`}
            x={waste.x}
            y={waste.y}
            width={waste.width}
            height={waste.height}
            fill="#EF4444"
            fillOpacity="0.3"
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
      </svg>
    </div>
  );
};

