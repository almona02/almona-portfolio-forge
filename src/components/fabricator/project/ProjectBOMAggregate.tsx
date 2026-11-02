/**
 * ProjectBOMAggregate - Aggregate BOM across project positions
 *
 * Phase 4.1.1: Project-level BOM summary from ApexV6 optimization results.
 * Gold-tier: defensive null checks, consistent formatting, responsive grid.
 */

import type { ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
import type { WindowUnit } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Layers, Package, Scissors } from 'lucide-react';
import React, { useMemo } from 'react';

const formatEGP = (n: number): string =>
  n.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });

interface ProjectBOMAggregateProps {
  project: { id: string; clientName: string; reference: string; units: WindowUnit[] };
  results: {
    projectSummary: { totalCost: number; unitCount: number };
    unitResults: Map<string, ApexV6Output>;
  } | null;
}

export const ProjectBOMAggregate: React.FC<ProjectBOMAggregateProps> = ({ project, results }) => {
  const units = project?.units ?? [];
  const unitResults = useMemo(
    () => results?.unitResults ?? new Map<string, ApexV6Output>(),
    [results?.unitResults]
  );

  const { totalBars, totalWaste, totalCost, costBreakdown } = useMemo(() => {
    const bars = Array.from(unitResults.values()).reduce(
      (acc, r) =>
        acc +
        (r.optimization?.frameStock?.barsCount ?? 0) +
        (r.optimization?.sashStock?.barsCount ?? 0),
      0
    );
    const waste = Array.from(unitResults.values()).reduce(
      (acc, r) =>
        acc +
        (r.optimization?.frameStock?.totalWaste ?? 0) +
        (r.optimization?.sashStock?.totalWaste ?? 0),
      0
    );
    const cost = Array.from(unitResults.values()).reduce(
      (acc, r) => acc + (r.financials?.totalCost ?? 0),
      0
    );
    const breakdown = Array.from(unitResults.values()).reduce(
      (acc, r) => ({
        profiles: acc.profiles + (r.financials?.breakdown?.profiles ?? 0),
        hardware: acc.hardware + (r.financials?.breakdown?.hardware ?? 0),
        glass: acc.glass + (r.financials?.breakdown?.glass ?? 0),
        waste: acc.waste + (r.financials?.breakdown?.waste ?? 0),
      }),
      { profiles: 0, hardware: 0, glass: 0, waste: 0 }
    );
    return { totalBars: bars, totalWaste: waste, totalCost: cost, costBreakdown: breakdown };
  }, [unitResults]);

  if (!results?.unitResults?.size) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" aria-hidden />
          <p className="text-sm">Run optimization to see aggregate BOM.</p>
          <p className="text-xs text-muted-foreground mt-2">Click &quot;Optimize All&quot; in the sidebar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-warning" />
          Aggregate BOM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background/50 rounded-lg p-4 border border-border">
            <Package className="h-5 w-5 text-info mb-2" />
            <div className="text-2xl font-bold text-foreground">{totalBars}</div>
            <div className="text-xs text-muted-foreground">Total Bars</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 border border-border">
            <Scissors className="h-5 w-5 text-warning mb-2" />
            <div className="text-2xl font-bold text-foreground">{(totalWaste / 1000).toFixed(2)} m</div>
            <div className="text-xs text-muted-foreground">Total Waste</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-success">{formatEGP(totalCost)}</div>
            <div className="text-xs text-muted-foreground">Material Cost</div>
          </div>
          <div className="bg-background/50 rounded-lg p-4 border border-border">
            <div className="text-2xl font-bold text-foreground">{units.length}</div>
            <div className="text-xs text-muted-foreground">Positions</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Cost Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="bg-background/30 rounded p-2">
              <span className="text-muted-foreground">Profiles</span>
              <div className="font-mono text-warning">{formatEGP(costBreakdown.profiles)}</div>
            </div>
            <div className="bg-background/30 rounded p-2">
              <span className="text-muted-foreground">Hardware</span>
              <div className="font-mono text-warning">{formatEGP(costBreakdown.hardware)}</div>
            </div>
            <div className="bg-background/30 rounded p-2">
              <span className="text-muted-foreground">Glass</span>
              <div className="font-mono text-warning">{formatEGP(costBreakdown.glass)}</div>
            </div>
            <div className="bg-background/30 rounded p-2">
              <span className="text-muted-foreground">Waste</span>
              <div className="font-mono text-destructive">{formatEGP(costBreakdown.waste)}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Per Position</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto" role="list">
            {units.map((unit) => {
              const res = unitResults.get(unit.id);
              const bars =
                (res?.optimization?.frameStock?.barsCount ?? 0) +
                (res?.optimization?.sashStock?.barsCount ?? 0);
              const cost = res?.financials?.totalCost ?? 0;
              return (
                <div
                  key={unit.id}
                  className="flex justify-between items-center py-2 px-3 bg-background/30 rounded border border-border/50"
                >
                  <span className="font-medium text-foreground">{unit.posNumber}</span>
                  <span className="text-xs text-muted-foreground">{bars} bars</span>
                  <span className="font-mono text-sm text-warning">{formatEGP(cost)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
