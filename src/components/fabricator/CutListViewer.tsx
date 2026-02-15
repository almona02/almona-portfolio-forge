/**
 * Cut List Viewer - Market-Leader Quality UI
 * 
 * Visual representation of optimized UPVC cutting for Yılmaz single-head machines.
 * Inspired by: Kliess SchüCal, Orgadata LogiKal cutting modules
 * 
 * Features:
 * - Visual 6m bar representation with cuts
 * - Traffic light waste indicators (<5% green, 5-10% amber, >10% red)
 * - Remnant tracking for Remnant Marketplace
 * - Print-ready workshop format
 * - Export to CSV/PDF
 * - Responsive tablet layout (workshop floor usage)
 * 
 * @since January 2026 (Gold Tier Production)
 */

import { downloadCSV, exportCutListToCSV, printCutList } from '@/lib/fabricator/CutListExport';
import { OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    AlertCircle,
    CheckCircle2,
    FileDown,
    Info,
    PackageOpen,
    Printer,
    Scissors
} from 'lucide-react';
import React from 'react';
import { VisualCuttingPlan } from './VisualCuttingPlan';

interface CutListViewerProps {
  cutList: OptimizedCutList;
  barLengthMm?: number;
  showRemnants?: boolean;
  projectInfo?: {
    name: string;
    width: number;
    height: number;
    systemPack: string;
  };
}

const CutListViewerInner: React.FC<CutListViewerProps> = ({
  cutList,
  barLengthMm = 6000,
  showRemnants = true,
  projectInfo = {
    name: 'Window Project',
    width: 1200,
    height: 1400,
    systemPack: 'Katra PRO RED'
  },
}) => {
  const handleExportCSV = () => {
    const csvContent = exportCutListToCSV(cutList, projectInfo.name);
    const filename = `${projectInfo.name.replace(/\s+/g, '-')}-cut-list.csv`;
    downloadCSV(csvContent, filename);
  };

  const handlePrint = () => {
    printCutList(cutList, projectInfo);
  };
  // Waste indicator color

  // Waste indicator color
  const getWasteColor = (percentage: number): string => {
    if (percentage < 5) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage < 10) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getWasteIcon = (percentage: number) => {
    if (percentage < 5) return <CheckCircle2 className="h-5 w-5" />;
    if (percentage < 10) return <Info className="h-5 w-5" />;
    return <AlertCircle className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Scissors className="h-6 w-6" />
              Optimized Cut List - Yılmaz Single-Head
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Bars */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total Bars (6m)
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {cutList.totalBarsUsed}
              </div>
            </div>

            {/* Total Waste */}
            <div className={`p-4 rounded-lg border-2 ${getWasteColor(cutList.wastePercentage)}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium">Waste</div>
                {getWasteIcon(cutList.wastePercentage)}
              </div>
              <div className="text-3xl font-bold">
                {cutList.wastePercentage.toFixed(1)}%
              </div>
              <div className="text-xs mt-1">
                {(cutList.totalWasteMm / 1000).toFixed(2)}m total
              </div>
            </div>

            {/* Cutting Efficiency */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                Efficiency
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {(100 - cutList.wastePercentage).toFixed(1)}%
              </div>
            </div>

            {/* Remnants */}
            {showRemnants && (
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-amber-600 dark:text-amber-400">
                    Remnants
                  </div>
                  <PackageOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {cutList.totalBarsUsed}
                </div>
                <div className="text-xs mt-1 text-amber-600 dark:text-amber-400">
                  For marketplace
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <VisualCuttingPlan cutList={cutList} barLengthMm={barLengthMm} />

      {/* Cutting Sequence (for single-head machine) */}
      <Card>
        <CardHeader>
          <CardTitle>Sequential Cutting Order</CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Follow this order for optimal workflow on Yılmaz single-head machine
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cutList.cuttingSequence.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div className="font-mono text-sm">{step}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const CutListViewer = React.memo(CutListViewerInner);
CutListViewer.displayName = 'CutListViewer';
