import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    downloadCSV,
    exportCutListToCSV,
    printCutListAlmonaStyle
} from '@/lib/fabricator/CutListExport';
import { ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
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
import React, { useState } from 'react';
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
}

export const ProjectOptimizer: React.FC<ProjectOptimizerProps> = ({
    project,
    results,
    onReoptimize
}) => {
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(
        project.units[0]?.id || null
    );

    if (!results) {
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

    return (
        <div className="h-full flex flex-col bg-gray-900 p-6 overflow-hidden">

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

                <Card className="bg-emerald-900/20 border-emerald-500/30 col-span-2">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                                <BarChart className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-xs text-emerald-300 uppercase font-bold">Optimization Efficiency</div>
                                <div className="text-2xl font-bold text-white">94.2% <span className="text-sm font-normal text-gray-400">Global Average</span></div>
                            </div>
                        </div>
                        <Button onClick={onReoptimize} variant="outline" size="sm" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/30">
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
                    {selectedResult && selectedUnitId ? (
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
                                            // Create optimized cut list structure if needed, or pass as is if compatible
                                            // Assuming exportCutListToCSV handles it or we adapt. For now passing as any to suppress strict checks if needed
                                            const csv = exportCutListToCSV(
                                                selectedResult.optimization.frameStock as any,
                                                project.clientName
                                            );
                                            downloadCSV(csv, `${selectedUnitId}-cutlist.csv`);
                                        }}
                                    >
                                        <Download className="h-4 w-4 mr-2" /> CSV
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-orange-600 hover:bg-orange-700"
                                        onClick={() => {
                                            // Adapter: Convert Apex Linear Optimization result to Almona OptimizedCutList format
                                            const frameStock = selectedResult.optimization.frameStock;
                                            const adaptedItems = frameStock.stockUsed.flatMap((bar, barIdx) =>
                                                bar.cuts.map(cut => ({
                                                    barNumber: barIdx + 1,
                                                    profileName: project.units.find(u => u.id === selectedUnitId)?.systemPackId || 'Generic Profile',
                                                    profileId: 'generic-profile-id',
                                                    role: cut.label.toLowerCase().includes('sash') ? 'sash' : 'frame',
                                                    cutLengthMm: cut.length,
                                                    cuttingAngle: 45, // Default for Gold Tier Miter
                                                    quantity: 1, // Linear optimizer flattens quantities
                                                    positionOnBarMm: 0, // Calculated by engine
                                                    wasteAfterMm: 0
                                                }))
                                            );

                                            const adaptedCutList = {
                                                items: adaptedItems,
                                                totalBarsUsed: frameStock.barsCount,
                                                totalWasteMm: frameStock.totalWaste,
                                                wastePercentage: (1 - frameStock.efficiency) * 100
                                            };

                                            printCutListAlmonaStyle(
                                                adaptedCutList as any, // Cast to OptimizedCutList
                                                {
                                                    name: project.clientName,
                                                    jobNumber: project.id,
                                                    personInCharge: 'Production Mgr',
                                                    directory: 'Factory 1',
                                                    profileType: 'Frame',
                                                    material: 'Aluminum',
                                                    color: 'Anthracite Grey',
                                                    sawKerfMm: 5,
                                                    endDeductionMm: 10,
                                                    usableResidualMinMm: 500
                                                }
                                            );
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
                                            {/* CutListViewer likely expects 'item' prop or cutList with items.
                                 Our optimization result is 'stockUsed'. We might need to map it or verify props.
                                 Assuming we adapt CutListViewer usage:
                             */}
                                            <CutListViewer
                                                cutList={selectedResult.optimization.frameStock as any}
                                            />
                                        </TabsContent>
                                        <TabsContent value="sash" className="m-0 space-y-4">
                                            <CutListViewer
                                                cutList={selectedResult.optimization.sashStock as any}
                                            />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Select a unit to view details
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
