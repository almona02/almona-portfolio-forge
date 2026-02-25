import { CutSheetGenerator } from '@/lib/fabricator/production/CutSheetGenerator';
import { LabelGenerator } from '@/lib/fabricator/production/LabelGenerator';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useWorkflowStore } from '@/store/workflowStore';
import type { CutSheetItem, LabelData } from '@/store/workflowStore';
import {
  ClipboardList,
  QrCode,
  Ruler,
  Scissors,
} from 'lucide-react';
import React, { useEffect, useMemo } from 'react';

/**
 * ProductionDocumentsPanel - Displays cut sheets, labels, and bar drawings
 * generated from the optimization result. Wires CutSheetGenerator and
 * LabelGenerator into the workflow.
 *
 * @since Phase 1: Core Pipeline Wiring
 */
export const ProductionDocumentsPanel: React.FC = () => {
  const {
    currentProject,
    optimizationResult,
    productionDocuments,
    setProductionDocuments,
  } = useWorkflowStore();

  const cutSheets = useMemo<CutSheetItem[]>(() => {
    if (productionDocuments?.cutSheets) return productionDocuments.cutSheets;
    if (!optimizationResult?.cuttingPlan) return [];
    return CutSheetGenerator.generate(optimizationResult.cuttingPlan);
  }, [optimizationResult?.cuttingPlan, productionDocuments?.cutSheets]);

  const labels = useMemo<LabelData[]>(() => {
    if (productionDocuments?.labels) return productionDocuments.labels;
    if (cutSheets.length === 0) return [];
    const projectCode = currentProject?.projectCode || currentProject?.orderNumber || 'PRJ';
    return LabelGenerator.generate(cutSheets, projectCode);
  }, [cutSheets, productionDocuments?.labels, currentProject]);

  const barGroups = useMemo(() => {
    const groups = new Map<string, CutSheetItem[]>();
    for (const cs of cutSheets) {
      const existing = groups.get(cs.stockBarId) || [];
      existing.push(cs);
      groups.set(cs.stockBarId, existing);
    }
    return groups;
  }, [cutSheets]);

  useEffect(() => {
    if (cutSheets.length > 0 && !productionDocuments) {
      setProductionDocuments({
        cutSheets,
        labels,
        generatedAt: new Date().toISOString(),
      });
    }
  }, [cutSheets, labels, productionDocuments, setProductionDocuments]);

  if (!optimizationResult) {
    return (
      <Card className="bg-slate-900/40 border-amber-600/20">
        <CardContent className="py-8 text-center text-slate-500">
          Optimization results required to generate production documents.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="cutsheets" className="w-full">
        <TabsList className="bg-slate-900/60 border-amber-600/20 grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="cutsheets" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
            <Scissors className="w-3 h-3 mr-1" /> Cut Sheets
          </TabsTrigger>
          <TabsTrigger value="bardrawings" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
            <Ruler className="w-3 h-3 mr-1" /> Bar Drawings
          </TabsTrigger>
          <TabsTrigger value="labels" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
            <QrCode className="w-3 h-3 mr-1" /> Labels
          </TabsTrigger>
        </TabsList>

        {/* Cut Sheets Tab */}
        <TabsContent value="cutsheets" className="mt-4">
          <Card className="bg-slate-900/40 border-amber-600/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Cutting Instructions
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                  {cutSheets.length} cuts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">Profile</th>
                      <th className="text-right py-2 px-3">Length (mm)</th>
                      <th className="text-right py-2 px-3">Angle</th>
                      <th className="text-left py-2 px-3">Bar</th>
                      <th className="text-right py-2 px-3">Pos. on Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutSheets.map((cs) => (
                      <tr key={cs.id} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs">{cs.id}</td>
                        <td className="py-2 px-3 text-amber-300">{cs.profileRole}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{cs.length}</td>
                        <td className="py-2 px-3 text-right text-slate-400">{cs.angle}°</td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{cs.stockBarId}</td>
                        <td className="py-2 px-3 text-right text-slate-500 font-mono text-xs">{cs.positionOnBar}mm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bar Drawings Tab */}
        <TabsContent value="bardrawings" className="mt-4 space-y-4">
          {Array.from(barGroups.entries()).map(([barId, cuts]) => {
            const stockLen = cuts[0]?.stockBarLength || 6000;
            const totalUsed = cuts.reduce((s, c) => s + c.length, 0);
            const waste = stockLen - totalUsed - (cuts.length - 1) * 4;
            const util = ((totalUsed / stockLen) * 100).toFixed(1);

            return (
              <Card key={barId} className="bg-slate-900/40 border-amber-600/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs text-amber-200 font-mono">{barId}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px]">
                        {stockLen}mm stock
                      </Badge>
                      <Badge className={`text-[10px] ${Number(util) > 85 ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                        {util}% utilization
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Visual bar drawing */}
                  <div className="relative h-10 bg-slate-800 rounded border border-slate-700 overflow-hidden">
                    {cuts.map((cut) => {
                      const widthPct = (cut.length / stockLen) * 100;
                      const leftPct = (cut.positionOnBar / stockLen) * 100;
                      return (
                        <div
                          key={cut.id}
                          className="absolute top-1 bottom-1 bg-amber-500/60 border border-amber-400/80 rounded-sm flex items-center justify-center"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${cut.profileRole}: ${cut.length}mm`}
                        >
                          <span className="text-[8px] text-amber-100 truncate px-0.5 font-mono">
                            {cut.length}
                          </span>
                        </div>
                      );
                    })}
                    {/* Waste marker */}
                    {waste > 0 && (
                      <div
                        className="absolute top-1 bottom-1 bg-red-500/20 border border-red-500/30 rounded-sm flex items-center justify-center"
                        style={{
                          right: 0,
                          width: `${(waste / stockLen) * 100}%`,
                        }}
                      >
                        <span className="text-[8px] text-red-300 font-mono">{waste}mm waste</span>
                      </div>
                    )}
                  </div>
                  {/* Cut list for this bar */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cuts.map((cut) => (
                      <span key={cut.id} className="text-[10px] bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50">
                        {cut.profileRole}: {cut.length}mm @ {cut.angle}°
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Labels Tab */}
        <TabsContent value="labels" className="mt-4">
          <Card className="bg-slate-900/40 border-amber-600/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Production Labels
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                  {labels.length} labels
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="bg-white rounded-lg p-3 border-2 border-dashed border-slate-300 text-black"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label.projectCode}</p>
                        <p className="text-sm font-mono font-bold mt-1">{label.positionCode}</p>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs"><span className="text-slate-500">Role:</span> {label.profileRole}</p>
                          <p className="text-xs"><span className="text-slate-500">Length:</span> {label.length}mm</p>
                          <p className="text-xs"><span className="text-slate-500">Angle:</span> {label.angle}°</p>
                          <p className="text-xs"><span className="text-slate-500">Bar:</span> {label.stockBarId}</p>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
                        <QrCode className="w-12 h-12 text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
