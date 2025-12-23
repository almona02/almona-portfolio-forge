/**
 * GlassReport - Specialized glass workshop report
 * Phase 2: Professional Report Generation System
 * 
 * Features:
 * - Display glass specifications per window component
 * - Support single, double, triple glazing types
 * - Calculate total glass area and pane quantities
 * - Show dimensions, thickness, and special requirements
 * - Glass cutting optimization visualization
 * - Export to PDF, CSV, and DXF formats
 * - Multi-language support
 * - Shop-floor ready formatting
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { ExportFormat, ExportProgress, ExportService, PDFExportOptions } from '@/lib/exports';
import { deriveGlassSize } from '@/lib/glass/glassSizing';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { WindowComponent, WindowUnit } from '@/types/fabricator';
import {
  AlertCircle,
  CheckCircle,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Printer,
  Square,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompanyBranding } from './PDFExportService';

interface GlassReportProps {
  project: WindowUnit;
  branding?: CompanyBranding;
  language?: 'en' | 'tr' | 'ar';
  onExport?: (format: ExportFormat) => void;
}

interface GlassSpecification {
  componentId: string;
  componentType: string;
  width: number;
  height: number;
  allowRotation90: boolean;
  glazingType: 'single' | 'double' | 'triple';
  paneCount: number;
  totalArea: number; // m²
  glassThickness: number; // mm
  spacerThickness?: number; // mm
  spacerMaterial?: string;
  gasFill?: string;
  specialRequirements?: string[];
  cuttingDimensions: {
    width: number;
    height: number;
    tolerance: number;
  };
  weight?: number; // kg
}

interface GlassReportData {
  project: WindowUnit;
  specifications: GlassSpecification[];
  summary: {
    totalComponents: number;
    totalPanes: number;
    totalArea: number; // m²
    totalWeight: number; // kg
    glazingTypes: {
      single: number;
      double: number;
      triple: number;
    };
    specialRequirements: string[];
  };
  cuttingOptimization?: {
    sheets: CuttingSheet[];
    wastePercentage: number;
    utilization: number;
  };
}

interface CuttingSheet {
  id: string;
  width: number; // Standard sheet width (e.g., 3210mm)
  height: number; // Standard sheet height (e.g., 2250mm)
  panes: {
    componentId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }[];
  waste: number;
  utilization: number;
}

export const GlassReport: React.FC<GlassReportProps> = ({
  project,
  branding,
  language = 'en',
  onExport,
}) => {
  const { t } = useTranslation('reports');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const exportService = new ExportService();

  // Process glass data
  const reportData = useMemo<GlassReportData>(() => {
    const specifications: GlassSpecification[] = [];
    const glazingTypes = { single: 0, double: 0, triple: 0 };
    const specialRequirementsSet = new Set<string>();
    let totalArea = 0;
    let totalPanes = 0;
    let totalWeight = 0;

    // Resolve system pack glass allowances (if available)
    const systemPack =
      project.systemPackId && SYSTEM_PACKS.find((p) => p.meta.id === project.systemPackId);
    const glassAllowances = systemPack?.glassAllowances;

    // Process each component
    project.components.forEach((component: WindowComponent) => {
      const glazingType = (component.glazingType || project.glazing?.type || 'double') as 'single' | 'double' | 'triple';
      const paneCount = glazingType === 'single' ? 1 : glazingType === 'double' ? 2 : 3;
      
      // Calculate glass dimensions (accounting for system-pack edge clearance when configured)
      let glassWidth = component.width;
      let glassHeight = component.height;

      if (glassAllowances) {
        const derived = deriveGlassSize(component.width, component.height, glassAllowances);
        glassWidth = derived.size.widthMm;
        glassHeight = derived.size.heightMm;
        // If invalid, we still proceed but this could be surfaced in UI later via derived.errors
      } else {
        // Fallback: fixed 10mm clearance each side
        glassWidth = component.width - 20;
        glassHeight = component.height - 20;
      }

      const area = (glassWidth * glassHeight) / 1_000_000; // Convert to m²
      const totalComponentArea = area * paneCount;
      
      // Glass thickness: 5mm for single glazing, 4mm per pane for double/triple
      const defaultThickness = glazingType === 'single' ? 5 : 4; // 5mm for single glazing bead system
      const glassThickness = project.glazing?.thickness || defaultThickness;
      
      // Spacer information
      const spacerThickness = project.glazing?.spacer || 12;
      const spacerMaterial = project.glazing?.spacerMaterial || 'warm_edge';
      const gasFill = project.glazing?.gasFill || 'argon';
      
      // Calculate weight (glass density ~2.5 kg/m² per mm thickness)
      const weight = totalComponentArea * glassThickness * 2.5;
      
      // Special requirements
      const specialReqs: string[] = [];
      if (project.glazing?.tinted) specialReqs.push(t('glass.tinted', 'Tinted'));
      if (project.glazing?.laminated) specialReqs.push(t('glass.laminated', 'Laminated'));
      if (project.glazing?.tempered) specialReqs.push(t('glass.tempered', 'Tempered'));
      if (project.glazing?.lowE) specialReqs.push(t('glass.lowE', 'Low-E Coating'));
      specialReqs.forEach(req => specialRequirementsSet.add(req));
      
      glazingTypes[glazingType]++;
      totalArea += totalComponentArea;
      totalPanes += paneCount;
      totalWeight += weight;

      specifications.push({
        componentId: component.id,
        componentType: component.type,
        width: glassWidth,
        height: glassHeight,
        allowRotation90: glassAllowances?.allowRotation90 ?? true,
        glazingType,
        paneCount,
        totalArea: totalComponentArea,
        glassThickness,
        spacerThickness,
        spacerMaterial,
        gasFill,
        specialRequirements: specialReqs,
        cuttingDimensions: {
          width: glassWidth,
          height: glassHeight,
          tolerance: 2, // ±2mm tolerance
        },
        weight,
      });
    });

    // Simple cutting optimization (can be enhanced)
    const cuttingOptimization = optimizeGlassCutting(specifications);

    return {
      project,
      specifications,
      summary: {
        totalComponents: specifications.length,
        totalPanes,
        totalArea,
        totalWeight,
        glazingTypes,
        specialRequirements: Array.from(specialRequirementsSet),
      },
      cuttingOptimization,
    };
  }, [project, t]);

  const handleExport = async (format: ExportFormat) => {
    if (!project) return;

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
        includeGlazing: true,
        includeCuttingList: false,
        includeAccessories: false,
      };

      const exportId = `export_${Date.now()}`;
      exportService.onProgress(exportId, (progress) => {
        setExportProgress(progress);
      });

      // Create mock optimization for export
      const mockOptimization = {
        materialUsage: 0,
        wastePercentage: reportData.cuttingOptimization?.wastePercentage || 0,
        estimatedProductionTime: 0,
        cuttingPlan: [],
        nestingEfficiency: reportData.cuttingOptimization?.utilization || 0,
        costBreakdown: {
          materialCost: 0,
          laborCost: 0,
          hardwareCost: 0,
          glazingCost: 0,
          totalCost: 0,
        },
      };

      const result = await exportService.exportProject(project, mockOptimization, format, options);

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

  const getGlazingTypeLabel = (type: string) => {
    switch (type) {
      case 'single':
        return t('glass.single', 'Single Glazing');
      case 'double':
        return t('glass.double', 'Double Glazing');
      case 'triple':
        return t('glass.triple', 'Triple Glazing');
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 print:space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header with Export Buttons - Responsive */}
      <Card className="print:hidden">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Square className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">{t('glass.title', 'Glass & Glazing Report')}</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                <span className="block sm:inline">{t('glass.order', 'Order')}: {project.orderNumber}</span>
                <span className="hidden sm:inline"> | </span>
                <span className="block sm:inline">{t('glass.type', 'Type')}: {project.type}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden text-xs sm:text-sm">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.print', 'Print')}</span>
                <span className="sm:hidden">Print</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="text-xs sm:text-sm"
              >
                {isExporting && exportProgress?.format === 'pdf' ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="text-xs sm:text-sm"
              >
                {isExporting && exportProgress?.format === 'csv' ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('dxf')}
                disabled={isExporting}
                className="text-xs sm:text-sm"
              >
                {isExporting && exportProgress?.format === 'dxf' ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <FileCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('glass.components', 'Components')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalComponents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('glass.totalPanes', 'Total Panes')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalPanes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('glass.totalArea', 'Total Area')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalArea.toFixed(2)} m²</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('glass.totalWeight', 'Total Weight')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalWeight.toFixed(1)} kg</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Glazing Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t('glass.glazingTypes', 'Glazing Type Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{reportData.summary.glazingTypes.single}</div>
              <div className="text-sm text-muted-foreground">{t('glass.single', 'Single')}</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{reportData.summary.glazingTypes.double}</div>
              <div className="text-sm text-muted-foreground">{t('glass.double', 'Double')}</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{reportData.summary.glazingTypes.triple}</div>
              <div className="text-sm text-muted-foreground">{t('glass.triple', 'Triple')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Glass Specifications */}
      <div className="space-y-4">
        {reportData.specifications.map((spec, index) => (
          <Card key={index} className="print:break-inside-avoid">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {t('glass.component', 'Component')} {spec.componentId}
                  </CardTitle>
                  <CardDescription>
                    {spec.componentType} | {getGlazingTypeLabel(spec.glazingType)}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {spec.totalArea.toFixed(2)} m²
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">{t('glass.width', 'Width')}</div>
                  <div className="font-medium">{spec.width} mm</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('glass.height', 'Height')}</div>
                  <div className="font-medium">{spec.height} mm</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('glass.thickness', 'Thickness')}</div>
                  <div className="font-medium">{spec.glassThickness} mm</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{t('glass.panes', 'Panes')}</div>
                  <div className="font-medium">{spec.paneCount}</div>
                </div>
              </div>

              {spec.spacerThickness && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">{t('glass.spacerInfo', 'Spacer Information')}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('glass.spacerThickness', 'Thickness')}: </span>
                      {spec.spacerThickness} mm
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('glass.spacerMaterial', 'Material')}: </span>
                      {spec.spacerMaterial}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('glass.gasFill', 'Gas Fill')}: </span>
                      {spec.gasFill}
                    </div>
                  </div>
                </div>
              )}

              {spec.specialRequirements && spec.specialRequirements.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">{t('glass.specialRequirements', 'Special Requirements')}</div>
                  <div className="flex flex-wrap gap-2">
                    {spec.specialRequirements.map((req, reqIndex) => (
                      <Badge key={reqIndex} variant="secondary">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">{t('glass.cuttingDimensions', 'Cutting Dimensions')}</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('glass.width', 'Width')}: </span>
                    {spec.cuttingDimensions.width} mm (±{spec.cuttingDimensions.tolerance} mm)
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('glass.height', 'Height')}: </span>
                    {spec.cuttingDimensions.height} mm (±{spec.cuttingDimensions.tolerance} mm)
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('glass.weight', 'Weight')}: </span>
                    {spec.weight?.toFixed(1)} kg
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cutting Optimization */}
      {reportData.cuttingOptimization && (
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle>{t('glass.cuttingOptimization', 'Cutting Optimization')}</CardTitle>
            <CardDescription>
              {t('glass.utilization', 'Utilization')}: {reportData.cuttingOptimization.utilization.toFixed(1)}% |{' '}
              {t('glass.waste', 'Waste')}: {reportData.cuttingOptimization.wastePercentage.toFixed(1)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.cuttingOptimization.sheets.map((sheet, sheetIndex) => (
                <div key={sheetIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {t('glass.sheet', 'Sheet')} #{sheetIndex + 1}
                    </div>
                    <Badge variant={sheet.utilization >= 90 ? 'default' : 'secondary'}>
                      {sheet.utilization.toFixed(1)}% {t('glass.utilized', 'Utilized')}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {sheet.width} × {sheet.height} mm
                  </div>
                  <div className="text-sm">
                    {t('glass.panesOnSheet', 'Panes on sheet')}: {sheet.panes.length} |{' '}
                    {t('glass.waste', 'Waste')}: {sheet.waste.toFixed(2)} m²
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Control Checklist */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>{t('glass.qualityControl', 'Quality Control Checklist')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="print:hidden" />
              <span>{t('glass.qc1', 'Verify all dimensions match specifications')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="print:hidden" />
              <span>{t('glass.qc2', 'Check for scratches, chips, or defects')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="print:hidden" />
              <span>{t('glass.qc3', 'Verify spacer alignment and gas fill')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="print:hidden" />
              <span>{t('glass.qc4', 'Confirm special requirements (tinting, coating, etc.)')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="print:hidden" />
              <span>{t('glass.qc5', 'Test fit in frame before final installation')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Simple glass cutting optimization algorithm
 * Can be enhanced with more sophisticated nesting algorithms
 */
function optimizeGlassCutting(specifications: GlassSpecification[]): {
  sheets: CuttingSheet[];
  wastePercentage: number;
  utilization: number;
} {
  // Standard glass sheet sizes (can be configured)
  const STANDARD_SHEET_WIDTH = 3210; // mm
  const STANDARD_SHEET_HEIGHT = 2250; // mm

  const sheets: CuttingSheet[] = [];
  let totalSheetArea = 0;
  let totalUsedArea = 0;

  // Simple largest-first, bottom-left style guillotine-friendly packing.
  const remainingPanes = [...specifications].sort((a, b) => {
    const areaA = a.width * a.height * a.paneCount;
    const areaB = b.width * b.height * b.paneCount;
    return areaB - areaA;
  });
  let currentSheet: CuttingSheet | null = null;

  remainingPanes.forEach((spec) => {
    for (let pane = 0; pane < spec.paneCount; pane++) {
      if (!currentSheet) {
        currentSheet = {
          id: `sheet_${sheets.length + 1}`,
          width: STANDARD_SHEET_WIDTH,
          height: STANDARD_SHEET_HEIGHT,
          panes: [],
          waste: 0,
          utilization: 0,
        };
      }

      // If it doesn't fit in the current sheet (even with rotation), start a new one.
      const canFit = canFitInSheet(
        spec,
        currentSheet,
        STANDARD_SHEET_WIDTH,
        STANDARD_SHEET_HEIGHT,
      );
      if (!canFit) {
        sheets.push(currentSheet);
        totalSheetArea += currentSheet.width * currentSheet.height;
        totalUsedArea += calculateUsedArea(currentSheet);
        currentSheet = {
          id: `sheet_${sheets.length + 1}`,
          width: STANDARD_SHEET_WIDTH,
          height: STANDARD_SHEET_HEIGHT,
          panes: [],
          waste: 0,
          utilization: 0,
        };
      }

      if (currentSheet) {
        const placement = findBestPositionWithRotation(
          spec,
          currentSheet,
          STANDARD_SHEET_WIDTH,
          STANDARD_SHEET_HEIGHT,
        );
        if (!placement) {
          // Should be rare given canFitInSheet check; if it happens, start a new sheet.
          sheets.push(currentSheet);
          totalSheetArea += currentSheet.width * currentSheet.height;
          totalUsedArea += calculateUsedArea(currentSheet);
          currentSheet = {
            id: `sheet_${sheets.length + 1}`,
            width: STANDARD_SHEET_WIDTH,
            height: STANDARD_SHEET_HEIGHT,
            panes: [],
            waste: 0,
            utilization: 0,
          };
        }

        if (currentSheet && placement) {
          currentSheet.panes.push({
            componentId: spec.componentId,
            x: placement.x,
            y: placement.y,
            width: placement.rotated ? spec.height : spec.width,
            height: placement.rotated ? spec.width : spec.height,
            rotation: placement.rotated ? 90 : 0,
          });
        }
      }
    }
  });

  if (currentSheet) {
    sheets.push(currentSheet);
    totalSheetArea += currentSheet.width * currentSheet.height;
    totalUsedArea += calculateUsedArea(currentSheet);
  }

  // Calculate waste and utilization
  sheets.forEach((sheet) => {
    const usedArea = calculateUsedArea(sheet);
    const sheetArea = sheet.width * sheet.height;
    sheet.waste = (sheetArea - usedArea) / 1_000_000; // Convert to m²
    sheet.utilization = (usedArea / sheetArea) * 100;
  });

  const totalWaste = sheets.reduce((sum, s) => sum + s.waste, 0);
  const totalArea = sheets.reduce((sum, s) => (s.width * s.height) / 1_000_000, 0);
  const wastePercentage = totalArea > 0 ? (totalWaste / totalArea) * 100 : 0;
  const utilization = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

  return {
    sheets,
    wastePercentage,
    utilization,
  };
}

function canFitInSheet(
  spec: GlassSpecification,
  sheet: CuttingSheet,
  maxWidth: number,
  maxHeight: number,
): boolean {
  // Try to find any feasible placement with or without rotation.
  const placement = findBestPositionWithRotation(spec, sheet, maxWidth, maxHeight);
  return placement !== null;
}

function findBestPositionWithRotation(
  spec: GlassSpecification,
  sheet: CuttingSheet,
  maxWidth: number,
  maxHeight: number,
): { x: number; y: number; rotated: boolean } | null {
  const candidates = spec.allowRotation90
    ? [
        { w: spec.width, h: spec.height, rotated: false },
        { w: spec.height, h: spec.width, rotated: true },
      ]
    : [{ w: spec.width, h: spec.height, rotated: false }];

  // Bottom-left style scan; step size is coarse (10mm) for performance.
  for (const c of candidates) {
    for (let testY = 0; testY <= maxHeight - c.h; testY += 10) {
      for (let testX = 0; testX <= maxWidth - c.w; testX += 10) {
        if (!overlapsWithExisting(sheet.panes, testX, testY, c.w, c.h)) {
          return { x: testX, y: testY, rotated: c.rotated };
        }
      }
    }
  }

  return null;
}

function overlapsWithExisting(
  panes: CuttingSheet['panes'],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return panes.some(
    (p) =>
      x < p.x + p.width &&
      x + width > p.x &&
      y < p.y + p.height &&
      y + height > p.y
  );
}

function calculateUsedArea(sheet: CuttingSheet): number {
  return sheet.panes.reduce((sum, pane) => sum + pane.width * pane.height, 0);
}

