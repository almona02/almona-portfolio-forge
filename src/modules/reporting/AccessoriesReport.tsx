/**
 * AccessoriesReport - Comprehensive accessories and hardware report
 * Phase 2: Professional Report Generation System
 * 
 * Features:
 * - Group hardware by category (locks, hinges, handles, seals, corners, etc.)
 * - Show quantities, unit prices, and total costs
 * - Include supplier information and SKU numbers
 * - Procurement checklist functionality
 * - Integration with Phase 1 PricingEngine for accurate pricing
 * - Export to PDF and CSV formats
 * - Multi-language support (EN, TR, AR)
 * - Print-optimized layout
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Label } from '@/shared/ui/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Printer,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Package,
  DollarSign,
  Building2,
  CheckSquare,
} from 'lucide-react';
import { WindowUnit, FabricatorAccessory } from '@/types/fabricator';
import { CompanyBranding } from './PDFExportService';
import { ExportService, ExportFormat, PDFExportOptions, ExportProgress } from '@/lib/exports';
import { PricingEngine, CalculatedPrice } from '@/lib/pricing/PricingEngine';
import { useTranslation } from 'react-i18next';

interface AccessoriesReportProps {
  project: WindowUnit;
  accessories?: FabricatorAccessory[];
  branding?: CompanyBranding;
  language?: 'en' | 'tr' | 'ar';
  onExport?: (format: ExportFormat) => void;
  pricingEngine?: PricingEngine;
}

interface AccessoryItem {
  accessory: FabricatorAccessory;
  quantity: number;
  calculatedPrice?: CalculatedPrice;
  componentId?: string;
  notes?: string;
}

interface CategoryGroup {
  category: string;
  type: FabricatorAccessory['type'];
  items: AccessoryItem[];
  subtotal: number;
  totalQuantity: number;
}

interface AccessoriesReportData {
  project: WindowUnit;
  categories: CategoryGroup[];
  summary: {
    totalCategories: number;
    totalItems: number;
    totalQuantity: number;
    totalCost: number;
    currency: string;
  };
  procurementChecklist: {
    item: string;
    supplier?: string;
    sku?: string;
    quantity: number;
    status: 'pending' | 'ordered' | 'received';
    notes?: string;
  }[];
}

export const AccessoriesReport: React.FC<AccessoriesReportProps> = ({
  project,
  accessories = [],
  branding,
  language = 'en',
  onExport,
  pricingEngine,
}) => {
  const { t } = useTranslation('reports');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [procurementStatus, setProcurementStatus] = useState<Record<string, 'pending' | 'ordered' | 'received'>>({});

  const exportService = new ExportService();
  const pricing = pricingEngine || new PricingEngine();
  const [calculatedPrices, setCalculatedPrices] = useState<Map<string, CalculatedPrice>>(new Map());

  // Process accessories data (synchronous part)
  const reportData = useMemo<AccessoriesReportData>(() => {
    // Extract hardware from project
    const projectHardware = project.hardware || [];
    
    // Combine project hardware with provided accessories
    const allAccessories = [...accessories];
    
    // Group by category
    const categoryMap = new Map<string, CategoryGroup>();
    
    // Process project hardware
    projectHardware.forEach((hw: any) => {
      const accessoryId = hw.accessoryId || hw.id;
      const accessory = allAccessories.find(a => a.id === accessoryId) || {
        id: accessoryId,
        name: hw.name || 'Unknown Accessory',
        type: hw.type || 'other',
        category: hw.category || 'General',
        unitPrice: hw.unitPrice || 0,
        baseCost: hw.baseCost || hw.unitPrice || 0,
        markupPercentage: hw.markupPercentage || 30,
        supplier: hw.supplier,
        sku: hw.sku,
        description: hw.description,
        compatibleMaterials: hw.compatibleMaterials || [],
        region: hw.region || ['global'],
      } as FabricatorAccessory;
      
      const quantity = hw.quantity || 1;
      const categoryKey = accessory.category || accessory.type;
      
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          category: categoryKey,
          type: accessory.type,
          items: [],
          subtotal: 0,
          totalQuantity: 0,
        });
      }
      
      const group = categoryMap.get(categoryKey)!;
      const priceKey = `${accessory.id}_${quantity}`;
      const calculatedPrice = calculatedPrices.get(priceKey);
      
      group.items.push({
        accessory,
        quantity,
        componentId: hw.componentId,
        notes: hw.notes,
        calculatedPrice,
      });
      group.totalQuantity += quantity;
      
      // Calculate subtotal
      if (calculatedPrice) {
        group.subtotal += calculatedPrice.total;
      } else {
        // Fallback to unit price
        const fallbackPrice = accessory.unitPrice * quantity;
        group.subtotal += fallbackPrice;
      }
    });
    
    // Calculate total cost
    const totalCost = Array.from(categoryMap.values()).reduce((sum, group) => sum + group.subtotal, 0);
    
    // Generate procurement checklist
    const checklist = Array.from(categoryMap.values()).flatMap((group) =>
      group.items.map((item) => ({
        item: item.accessory.name,
        supplier: item.accessory.supplier,
        sku: item.accessory.sku,
        quantity: item.quantity,
        status: procurementStatus[item.accessory.id] || 'pending',
        notes: item.notes,
      }))
    );
    
    return {
      project,
      categories: Array.from(categoryMap.values()),
      summary: {
        totalCategories: categoryMap.size,
        totalItems: Array.from(categoryMap.values()).reduce((sum, g) => sum + g.items.length, 0),
        totalQuantity: Array.from(categoryMap.values()).reduce((sum, g) => sum + g.totalQuantity, 0),
        totalCost,
        currency: pricing['config']?.currency || 'USD',
      },
      procurementChecklist: checklist,
    };
  }, [project, accessories, procurementStatus, calculatedPrices, pricing]);

  // Calculate prices asynchronously
  useEffect(() => {
    const calculatePrices = async () => {
      const projectHardware = project.hardware || [];
      const allAccessories = [...accessories];
      const priceMap = new Map<string, CalculatedPrice>();

      const pricePromises = projectHardware.map(async (hw: any) => {
        const accessoryId = hw.accessoryId || hw.id;
        const accessory = allAccessories.find(a => a.id === accessoryId) || {
          id: accessoryId,
          name: hw.name || 'Unknown Accessory',
          type: hw.type || 'other',
          category: hw.category || 'General',
          unitPrice: hw.unitPrice || 0,
          baseCost: hw.baseCost || hw.unitPrice || 0,
          markupPercentage: hw.markupPercentage || 30,
          supplier: hw.supplier,
          sku: hw.sku,
          description: hw.description,
          compatibleMaterials: hw.compatibleMaterials || [],
          region: hw.region || ['global'],
        } as FabricatorAccessory;

        const quantity = hw.quantity || 1;
        const priceKey = `${accessory.id}_${quantity}`;

        try {
          const price = await pricing.calculateAccessoryPrice(accessory, quantity);
          priceMap.set(priceKey, price);
        } catch (error) {
          console.error('Price calculation error:', error);
        }
      });

      await Promise.all(pricePromises);
      setCalculatedPrices(priceMap);
    };

    if (project.hardware && project.hardware.length > 0) {
      calculatePrices();
    }
  }, [project.hardware, accessories, pricing]);

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
        includeAccessories: true,
        includeCuttingList: false,
        includeGlazing: false,
      };

      const exportId = `export_${Date.now()}`;
      exportService.onProgress(exportId, (progress) => {
        setExportProgress(progress);
      });

      // For accessories report, we need to create a mock optimization
      const mockOptimization = {
        materialUsage: 0,
        wastePercentage: 0,
        estimatedProductionTime: 0,
        cuttingPlan: [],
        nestingEfficiency: 0,
        costBreakdown: {
          materialCost: 0,
          laborCost: 0,
          hardwareCost: reportData.summary.totalCost,
          glazingCost: 0,
          totalCost: reportData.summary.totalCost,
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

  const updateProcurementStatus = (itemId: string, status: 'pending' | 'ordered' | 'received') => {
    setProcurementStatus((prev) => ({ ...prev, [itemId]: status }));
  };

  const getCategoryIcon = (type: FabricatorAccessory['type']) => {
    switch (type) {
      case 'lock':
        return '🔒';
      case 'hinge':
        return '🔗';
      case 'handle':
        return '🚪';
      case 'seal':
        return '🔧';
      case 'corner':
        return '📐';
      default:
        return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-green-500';
      case 'ordered':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 print:space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header with Export Buttons */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('accessories.title', 'Accessories & Hardware Report')}
              </CardTitle>
              <CardDescription>
                {t('accessories.order', 'Order')}: {project.orderNumber} | {t('accessories.type', 'Type')}: {project.type}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                <Printer className="h-4 w-4 mr-2" />
                {t('common.print', 'Print')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
              >
                {isExporting && exportProgress?.format === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                CSV
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('accessories.categories', 'Categories')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalCategories}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('accessories.items', 'Items')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('accessories.totalQuantity', 'Total Quantity')}</CardDescription>
            <CardTitle className="text-2xl">{reportData.summary.totalQuantity}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('accessories.totalCost', 'Total Cost')}</CardDescription>
            <CardTitle className="text-2xl">
              {reportData.summary.totalCost.toFixed(2)} {reportData.summary.currency}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Category Groups */}
      <div className="space-y-4">
        {reportData.categories.map((category, index) => (
          <Card key={index} className="print:break-inside-avoid">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getCategoryIcon(category.type)}</span>
                  <div>
                    <CardTitle>{category.category}</CardTitle>
                    <CardDescription>
                      {t('accessories.type', 'Type')}: {category.type} | {t('accessories.items', 'Items')}: {category.items.length}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-lg">
                  {category.subtotal.toFixed(2)} {reportData.summary.currency}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('accessories.name', 'Name')}</th>
                      <th className="text-left p-2">{t('accessories.quantity', 'Qty')}</th>
                      <th className="text-left p-2">{t('accessories.unitPrice', 'Unit Price')}</th>
                      <th className="text-left p-2">{t('accessories.total', 'Total')}</th>
                      <th className="text-left p-2">{t('accessories.supplier', 'Supplier')}</th>
                      <th className="text-left p-2">{t('accessories.sku', 'SKU')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{item.accessory.name}</div>
                            {item.accessory.description && (
                              <div className="text-xs text-muted-foreground">{item.accessory.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{item.quantity}</td>
                        <td className="p-2">
                          {item.calculatedPrice
                            ? `${item.calculatedPrice.subtotal / item.quantity} ${item.calculatedPrice.currency}`
                            : `${item.accessory.unitPrice} ${reportData.summary.currency}`}
                        </td>
                        <td className="p-2">
                          {item.calculatedPrice
                            ? `${item.calculatedPrice.total} ${item.calculatedPrice.currency}`
                            : `${item.accessory.unitPrice * item.quantity} ${reportData.summary.currency}`}
                        </td>
                        <td className="p-2">{item.accessory.supplier || '-'}</td>
                        <td className="p-2">{item.accessory.sku || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={3} className="p-2 text-right">
                        {t('accessories.subtotal', 'Subtotal')}:
                      </td>
                      <td className="p-2">{category.subtotal.toFixed(2)} {reportData.summary.currency}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Procurement Checklist */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            {t('accessories.procurementChecklist', 'Procurement Checklist')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData.procurementChecklist.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 border rounded-lg print:break-inside-avoid"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    checked={procurementStatus[item.item] === 'received'}
                    onCheckedChange={(checked) =>
                      updateProcurementStatus(
                        item.item,
                        checked ? 'received' : 'pending'
                      )
                    }
                    className="print:hidden"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.item}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.supplier && `${t('accessories.supplier', 'Supplier')}: ${item.supplier} | `}
                      {item.sku && `SKU: ${item.sku} | `}
                      {t('accessories.quantity', 'Qty')}: {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <Badge
                    className={getStatusColor(procurementStatus[item.item] || 'pending')}
                    onClick={() => {
                      const current = procurementStatus[item.item] || 'pending';
                      const next =
                        current === 'pending'
                          ? 'ordered'
                          : current === 'ordered'
                          ? 'received'
                          : 'pending';
                      updateProcurementStatus(item.item, next);
                    }}
                  >
                    {t(`accessories.status.${procurementStatus[item.item] || 'pending'}`, procurementStatus[item.item] || 'pending')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Installation Notes */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>{t('accessories.installationNotes', 'Installation Notes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>{t('accessories.installationNote1', 'Ensure all hardware is compatible with the selected profile system.')}</p>
            <p>{t('accessories.installationNote2', 'Verify quantities match project requirements before installation.')}</p>
            <p>{t('accessories.installationNote3', 'Check supplier specifications for any special installation requirements.')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

