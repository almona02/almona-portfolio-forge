import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OptimizationResult } from '@/lib/algorithms/LinearOptimizer';
import {
    downloadCSV,
    exportCutListToCSV,
    printCutListAlmonaStyle
} from '@/lib/fabricator/CutListExport';
import { ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
import type { CutListItem, OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { WindowUnit } from '@/types/fabricator';
import {
    BarChart,
    Download,
    Layers,
    RefreshCw,
    Scissors
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CutListViewer } from '../CutListViewer'; // Assuming this exists or I should reuse the logic

interface ProjectOptimizerProps {
    project: {
        id: string;
        clientName: string;
        units: WindowUnit[];
    };
    results: {
        projectSummary: any;
        unitResults: Map<string, ApexV6Output>;
    } | null;
    onReoptimize: () => void;
    optimizationProgress?: {
        isRunning: boolean;
        processed: number;
        total: number;
        currentUnitLabel: string | null;
    };
}

const DEFAULT_SAW_KERF_MM = 5;

function inferRoleFromCutLabel(label: string): CutListItem['role'] {
    const normalized = label.toLowerCase();
    if (normalized.includes('sash')) return 'sash';
    if (normalized.includes('mullion')) return 'mullion';
    if (normalized.includes('transom')) return 'transom';
    return 'frame';
}

function getStrategyCutAngle(strategyUsed: string): number {
    return strategyUsed.toLowerCase().includes('miter') ? 45 : 90;
}

function mapStockToCutListItems(
    stock: OptimizationResult,
    barOffset: number,
    profileName: string,
    strategyAngle: number,
): CutListItem[] {
    const items: CutListItem[] = [];

    stock.stockUsed.forEach((bar, barIndex) => {
        let cursor = 0;
        bar.cuts.forEach((cut, cutIndex) => {
            if (cutIndex > 0) {
                cursor += DEFAULT_SAW_KERF_MM;
            }

            const role = inferRoleFromCutLabel(cut.label);
            const positionOnBarMm = cursor;
            cursor += cut.length;

            items.push({
                profileId: `${role}-${profileName.toLowerCase().replace(/\s+/g, '-')}`,
                profileName,
                role,
                cutLengthMm: cut.length,
                quantity: 1,
                cuttingAngle: strategyAngle,
                barNumber: barOffset + barIndex + 1,
                positionOnBarMm,
                wasteAfterMm: Math.max(0, bar.length - cursor),
            });
        });
    });

    return items;
}

/** Build OptimizedCutList from a single OptimizationResult (for Frame or Sash tab). */
function buildOptimizedCutListFromStock(
    stock: OptimizationResult,
    unit: WindowUnit,
    profileName: string,
    barOffset: number,
    strategyUsed: string,
): OptimizedCutList {
    const strategyAngle = getStrategyCutAngle(strategyUsed);
    const items = mapStockToCutListItems(stock, barOffset, profileName, strategyAngle);
    const totalBarsUsed = stock.barsCount;
    const totalWasteMm = stock.totalWaste;
    const totalStockLength = stock.totalStockLength;
    const wastePercentage = totalStockLength > 0 ? (totalWasteMm / totalStockLength) * 100 : 0;
    return {
        items,
        totalBarsUsed,
        totalWasteMm,
        wastePercentage,
        cuttingSequence: items.map(
            (item, idx) => `Step ${idx + 1}: Bar ${item.barNumber} - ${item.profileName} ${(item.cutLengthMm ?? 0).toFixed(1)}mm`,
        ),
    };
}

function buildOptimizedCutList(result: ApexV6Output, unit: WindowUnit): OptimizedCutList {
    const strategyAngle = getStrategyCutAngle(result.strategyUsed);
    const frameProfileName = `${unit.systemPackId || 'Generic'} Frame`;
    const sashProfileName = `${unit.systemPackId || 'Generic'} Sash`;

    const frameItems = mapStockToCutListItems(
        result.optimization.frameStock,
        0,
        frameProfileName,
        strategyAngle,
    );
    const sashItems = mapStockToCutListItems(
        result.optimization.sashStock,
        result.optimization.frameStock.barsCount,
        sashProfileName,
        strategyAngle,
    );

    const items = [...frameItems, ...sashItems].sort((a, b) => (
        a.barNumber - b.barNumber || a.positionOnBarMm - b.positionOnBarMm
    ));

    const totalBarsUsed =
        result.optimization.frameStock.barsCount + result.optimization.sashStock.barsCount;
    const totalWasteMm =
        result.optimization.frameStock.totalWaste + result.optimization.sashStock.totalWaste;
    const totalStockLength =
        result.optimization.frameStock.totalStockLength + result.optimization.sashStock.totalStockLength;
    const wastePercentage = totalStockLength > 0 ? (totalWasteMm / totalStockLength) * 100 : 0;

    return {
        items,
        totalBarsUsed,
        totalWasteMm,
        wastePercentage,
        cuttingSequence: items.map(
            (item, idx) => `Step ${idx + 1}: Bar ${item.barNumber} - ${item.profileName} ${(item.cutLengthMm ?? 0).toFixed(1)}mm`,
        ),
    };
}

export const ProjectOptimizer: React.FC<ProjectOptimizerProps> = ({
    project,
    results,
    onReoptimize,
    optimizationProgress,
}) => {
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
        project.units[0]?.id || null
    );

    useEffect(() => {
        if (selectedUnitId && project.units.some((unit) => unit.id === selectedUnitId)) {
            return;
        }
        setSelectedUnitId(project.units[0]?.id || null);
    }, [project.units, selectedUnitId]);

    const progressPercent = optimizationProgress && optimizationProgress.total > 0
        ? Math.round((optimizationProgress.processed / optimizationProgress.total) * 100)
        : 0;

    if (!results) {
        if (optimizationProgress?.isRunning) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-300">
                    <RefreshCw className="h-16 w-16 mb-4 animate-spin text-blue-400" />
                    <h3 className="text-xl font-medium mb-2">Optimization in Progress</h3>
                    <p className="max-w-md mb-6 text-gray-400">
                        Processing {optimizationProgress.processed} of {optimizationProgress.total} units
                        {optimizationProgress.currentUnitLabel ? ` (${optimizationProgress.currentUnitLabel})` : ''}.
                    </p>
                    <div className="w-full max-w-md rounded bg-gray-800 p-1">
                        <div
                            className="h-2 rounded bg-blue-500 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="mt-2 text-sm text-gray-400">{progressPercent}% complete</div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <Scissors className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-xl font-medium text-gray-300 mb-2">Optimization Required</h3>
                <p className="max-w-md mb-6">
                    Run the Apex Engine optimization to generate cut lists and material requirements for all {project.units.length} units.
                </p>
                <Button onClick={onReoptimize} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <RefreshCw className="h-4 w-4 mr-2" /> Run Optimization
                </Button>
            </div>
        );
    }

    const selectedResult = selectedUnitId ? results.unitResults.get(selectedUnitId) : null;
    const totalWaste = Array.from(results.unitResults.values()).reduce((acc, r) =>
        acc + (r.optimization.frameStock.totalWaste + r.optimization.sashStock.totalWaste), 0
    ) / 1000; // in meters

    const totalBars = Array.from(results.unitResults.values()).reduce((acc, r) =>
        acc + (r.optimization.frameStock.barsCount + r.optimization.sashStock.barsCount), 0
    );
    const totalCutLength = Array.from(results.unitResults.values()).reduce((acc, r) =>
        acc + (r.optimization.frameStock.totalCutLength + r.optimization.sashStock.totalCutLength), 0
    );
    const totalStockLength = Array.from(results.unitResults.values()).reduce((acc, r) =>
        acc + (r.optimization.frameStock.totalStockLength + r.optimization.sashStock.totalStockLength), 0
    );
    const globalEfficiency = totalStockLength > 0 ? (totalCutLength / totalStockLength) * 100 : 0;

    const totalProjectCost = project.units.reduce((acc, unit) => {
        const res = results.unitResults.get(unit.id);
        return acc + (res ? res.financials.totalCost : 0);
    }, 0);

    return (
        <div className="h-full flex flex-col bg-gray-900 p-6 overflow-hidden">
            {optimizationProgress?.isRunning && (
                <Card className="mb-4 bg-blue-900/20 border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between text-sm text-blue-200">
                            <span>
                                Re-optimizing {optimizationProgress.processed}/{optimizationProgress.total}
                                {optimizationProgress.currentUnitLabel ? ` • ${optimizationProgress.currentUnitLabel}` : ''}
                            </span>
                            <span className="font-mono">{progressPercent}%</span>
                        </div>
                        <div className="mt-2 rounded bg-gray-800 p-1">
                            <div
                                className="h-2 rounded bg-blue-500 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mb-6 flex-shrink-0">
                <Card className="bg-blue-900/20 border-blue-500/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-xs text-blue-300 uppercase font-bold">Total Material</div>
                            <div className="text-2xl font-bold text-white">{totalBars} <span className="text-sm font-normal text-gray-400">bars (6m)</span></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-900/20 border-red-500/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-full text-red-400">
                            <Scissors className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-xs text-red-300 uppercase font-bold">Total Waste</div>
                            <div className="text-2xl font-bold text-white">{totalWaste.toFixed(2)}m</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-900/20 border-emerald-500/30">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                            <BarChart className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="text-xs text-emerald-300 uppercase font-bold">Optimization Efficiency</div>
                            <div className="text-2xl font-bold text-white">
                                {globalEfficiency.toFixed(1)}%
                                <span className="text-sm font-normal text-gray-400"> Global Average</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-900/20 border-amber-500/30">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
                                <Layers className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-xs text-amber-300 uppercase font-bold">Project BOM Total</div>
                                <div className="text-2xl font-bold text-white">{project.units.length} poses</div>
                                <div className="text-sm text-amber-200/80">${totalProjectCost.toFixed(2)} total value</div>
                            </div>
                        </div>
                        <Button onClick={onReoptimize} variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-900/30">
                            <RefreshCw className="h-3 w-3 mr-2" /> Re-Run
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">

                {/* Left List of Units */}
                <Card className="w-64 flex flex-col bg-gray-950 border-gray-800">
                    <CardHeader className="py-3 px-4 border-b border-gray-800">
                        <CardTitle className="text-sm font-medium text-gray-400">Units</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {project.units.map((unit) => {
                                const res = results.unitResults.get(unit.id);
                                const efficiency = res
                                    ? (res.optimization.frameStock.efficiency + res.optimization.sashStock.efficiency) / 2 * 100
                                    : 0;

                                return (
                                    <button
                                        key={unit.id}
                                        onClick={() => setSelectedUnitId(unit.id)}
                                        className={`w-full text-left p-2 rounded text-sm flex justify-between items-center ${selectedUnitId === unit.id ? 'bg-blue-900/30 text-blue-200 border border-blue-800' : 'text-gray-400 hover:bg-gray-900'
                                            }`}
                                    >
                                        <span>{unit.posNumber}</span>
                                        <Badge variant="outline" className={`text-[10px] h-4 px-1 ${efficiency > 90 ? 'border-green-800 text-green-500' : 'border-amber-800 text-amber-500'}`}>
                                            {efficiency.toFixed(0)}%
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Main Cut List View */}
                <Card className="flex-1 flex flex-col bg-gray-950 border-gray-800 overflow-hidden">
                    {selectedResult && selectedUnitId ? (() => {
                        const selectedUnit = project.units.find(u => u.id === selectedUnitId)!;
                        const frameCutList = buildOptimizedCutListFromStock(
                            selectedResult.optimization.frameStock,
                            selectedUnit,
                            `${selectedUnit.systemPackId || 'Generic'} Frame`,
                            0,
                            selectedResult.strategyUsed,
                        );
                        const sashCutList = buildOptimizedCutListFromStock(
                            selectedResult.optimization.sashStock,
                            selectedUnit,
                            `${selectedUnit.systemPackId || 'Generic'} Sash`,
                            selectedResult.optimization.frameStock.barsCount,
                            selectedResult.strategyUsed,
                        );
                        return (
                            <>
                                <CardHeader className="py-3 px-6 border-b border-gray-800 flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">Cut Optimization: {project.units.find(u => u.id === selectedUnitId)?.posNumber}</CardTitle>
                                        <CardDescription>Apex V6 Algorithm • {selectedResult.strategyUsed} Strategy</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-gray-700 bg-gray-800"
                                            onClick={() => {
                                                const selectedUnit = project.units.find((u) => u.id === selectedUnitId);
                                                if (!selectedUnit) return;

                                                const optimizedCutList = buildOptimizedCutList(selectedResult, selectedUnit);
                                                const csv = exportCutListToCSV(optimizedCutList, project.clientName);
                                                downloadCSV(csv, `${selectedUnit.posNumber || selectedUnitId}-cutlist.csv`);
                                            }}
                                        >
                                            <Download className="h-4 w-4 mr-2" /> CSV
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-orange-600 hover:bg-orange-700"
                                            onClick={() => {
                                                const selectedUnit = project.units.find((u) => u.id === selectedUnitId);
                                                if (!selectedUnit) return;

                                                const optimizedCutList = buildOptimizedCutList(selectedResult, selectedUnit);
                                                printCutListAlmonaStyle(optimizedCutList, {
                                                    name: project.clientName,
                                                    jobNumber: selectedUnit.orderNumber || project.id,
                                                    personInCharge: 'Production Manager',
                                                    directory: 'Factory 1',
                                                    profileType: selectedUnit.systemPackId || 'Mixed',
                                                    material: selectedUnit.type.toLowerCase().includes('upvc') ? 'UPVC' : 'Aluminum',
                                                    color: selectedUnit.color || 'N/A',
                                                    sawKerfMm: DEFAULT_SAW_KERF_MM,
                                                    endDeductionMm: 10,
                                                    usableResidualMinMm: 500,
                                                });
                                            }}
                                        >
                                            Review Print
                                        </Button>
                                    </div>
                                </CardHeader>

                                <div className="flex-1 overflow-hidden p-0">
                                    <Tabs defaultValue="frame" className="h-full flex flex-col">
                                        <div className="px-6 py-2 border-b border-gray-800">
                                            <TabsList className="bg-gray-900 border border-gray-700">
                                                <TabsTrigger value="frame">Frame Profiles</TabsTrigger>
                                                <TabsTrigger value="sash">Sash Profiles</TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
                                            <TabsContent value="frame" className="m-0 space-y-4">
                                                <CutListViewer cutList={frameCutList} />
                                            </TabsContent>
                                            <TabsContent value="sash" className="m-0 space-y-4">
                                                <CutListViewer cutList={sashCutList} />
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>
                            </>
                        );
                    })() : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select a unit to view details
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
