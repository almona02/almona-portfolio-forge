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
import { CutListItem, OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';
import { Badge } from '@/shared/ui/ui/badge';
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
import React, { useMemo } from 'react';

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

export const CutListViewer: React.FC<CutListViewerProps> = ({
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
  // Export handlers
  const handleExportCSV = () => {
    const csvContent = exportCutListToCSV(cutList, projectInfo.name);
    const filename = `${projectInfo.name.replace(/\s+/g, '-')}-cut-list.csv`;
    downloadCSV(csvContent, filename);
  };

  const handlePrint = () => {
    printCutList(cutList, projectInfo);
  };
  // Group cuts by bar number
  const barGroups = useMemo(() => {
    const groups: Record<number, CutListItem[]> = {};
    cutList.items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        const barNum = item.barNumber;
        if (!groups[barNum]) groups[barNum] = [];
        groups[barNum].push(item);
      }
    });
    return groups;
  }, [cutList.items]);

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
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    Remnants
                  </div>
                  <PackageOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {cutList.totalBarsUsed}
                </div>
                <div className="text-xs mt-1 text-purple-600 dark:text-purple-400">
                  For marketplace
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Bar Representation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Visual Cutting Plan</h3>
        {Object.entries(barGroups).map(([barNum, cuts]) => {
          const barNumber = parseInt(barNum);
          const totalUsed = cuts.reduce((sum, cut) => sum + cut.cutLengthMm + 3, 0); // +3mm kerf
          const wasteMm = barLengthMm - totalUsed;
          const wastePercent = (wasteMm / barLengthMm) * 100;

          return (
            <Card key={barNumber}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-base px-3 py-1">
                      Bar {barNumber}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {cuts[0].profileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Used: </span>
                      <span className="font-mono font-semibold">
                        {(totalUsed / 1000).toFixed(2)}m
                      </span>
                    </div>
                    <div className={`text-sm px-2 py-1 rounded ${
                      wastePercent < 5 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      wastePercent < 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      <span className="font-mono font-semibold">
                        {wastePercent.toFixed(1)}%
                      </span> waste
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Visual Bar with Cuts */}
                <div className="mb-4">
                  <div className="relative h-16 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden">
                    {/* 6m scale markers */}
                    <div className="absolute inset-x-0 bottom-0 h-2 flex justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      <span>0m</span>
                      <span>1m</span>
                      <span>2m</span>
                      <span>3m</span>
                      <span>4m</span>
                      <span>5m</span>
                      <span>6m</span>
                    </div>

                    {/* Cuts visualization */}
                    {cuts.map((cut, idx) => {
                      const startPercent = (cut.positionOnBarMm / barLengthMm) * 100;
                      const widthPercent = ((cut.cutLengthMm + 3) / barLengthMm) * 100; // +3mm kerf

                      return (
                        <div
                          key={idx}
                          className="absolute top-2 h-10 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 border-2 border-blue-700 dark:border-blue-500 rounded flex items-center justify-center text-white text-xs font-semibold shadow-lg hover:scale-105 transition-transform cursor-pointer group"
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          title={`${cut.cutLengthMm}mm @ ${cut.cuttingAngle}°`}
                        >
                          <div className="text-center px-1 truncate">
                            <div className="font-mono">{cut.cutLengthMm}mm</div>
                            <div className="text-[10px] opacity-75">45°</div>
                          </div>
                          
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            Cut: {cut.cutLengthMm}mm @ {cut.cuttingAngle}°
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Waste visualization */}
                    {wasteMm > 100 && (
                      <div
                        className="absolute top-2 h-10 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600 border-2 border-dashed border-slate-500 rounded flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        style={{
                          left: `${((barLengthMm - wasteMm) / barLengthMm) * 100}%`,
                          width: `${(wasteMm / barLengthMm) * 100}%`,
                        }}
                      >
                        <div className="text-center px-1 truncate">
                          <div className="font-mono">{wasteMm.toFixed(0)}mm</div>
                          <div className="text-[10px]">remnant</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cutting Instructions Table */}
                <div className="space-y-2">
                  {cuts.map((cut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="font-mono">
                          #{idx + 1}
                        </Badge>
                        <div>
                          <div className="font-semibold text-sm">
                            {cut.role.toUpperCase()} - {cut.profileName}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Position: {cut.positionOnBarMm}mm from start
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Cut Length
                          </div>
                          <div className="text-lg font-mono font-bold">
                            {cut.cutLengthMm}mm
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Angle
                          </div>
                          <div className="text-lg font-mono font-bold">
                            {cut.cuttingAngle}°
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
