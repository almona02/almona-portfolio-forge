/**
 * ProjectQuoteSummary - Aggregate quote across project positions
 *
 * Phase 4.1.2: Project-level quote summary from optimization results.
 * Gold-tier: defensive null checks, consistent formatting, responsive layout.
 */

import type { ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
import type { WindowUnit } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { FileText } from 'lucide-react';
import React, { useMemo } from 'react';

const MARKUP_MULTIPLIER = 1.4; // 40% margin

const formatEGP = (n: number): string =>
  n.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });

interface ProjectQuoteSummaryProps {
  project: { id: string; clientName: string; reference: string; units: WindowUnit[] };
  results: {
    projectSummary: { totalCost: number; unitCount: number };
    unitResults: Map<string, ApexV6Output>;
  } | null;
}

export const ProjectQuoteSummary: React.FC<ProjectQuoteSummaryProps> = ({ project, results }) => {
  const units = project?.units ?? [];

  if (!results?.unitResults?.size) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" aria-hidden />
          <p className="text-sm">Run optimization and generate quote to see summary.</p>
          <p className="text-xs text-gray-500 mt-2">Click &quot;Optimize All&quot; then &quot;Generate Quote&quot;.</p>
        </CardContent>
      </Card>
    );
  }

  const unitResults = results.unitResults;
  const { totalCost, totalProjectValue, margin } = useMemo(() => {
    const cost = Array.from(unitResults.values()).reduce(
      (acc, r) => acc + (r.financials?.totalCost ?? 0),
      0
    );
    const quoted = units.reduce((acc, unit) => {
      const res = unitResults.get(unit.id);
      const c = res?.financials?.totalCost ?? 0;
      return acc + c * MARKUP_MULTIPLIER * (unit.quantity ?? 1);
    }, 0);
    return { totalCost: cost, totalProjectValue: quoted, margin: quoted - cost };
  }, [unitResults, units]);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-green-400" />
          Quote Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Cost</div>
            <div className="text-xl font-bold text-amber-300">{formatEGP(totalCost)}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Quote Total (40% margin)</div>
            <div className="text-xl font-bold text-green-400">{formatEGP(totalProjectValue)}</div>
          </div>
        </div>

        <div className="flex justify-between text-sm text-gray-400 py-2 px-3 bg-gray-900/30 rounded border border-gray-700/50">
          <span>Margin</span>
          <span className="text-green-400 font-mono">{formatEGP(margin)}</span>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Per Position</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto" role="list">
            {units.map((unit) => {
              const res = unitResults.get(unit.id);
              const cost = res?.financials?.totalCost ?? 0;
              const quoted = cost * MARKUP_MULTIPLIER * (unit.quantity || 1);
              return (
                <div
                  key={unit.id}
                  className="flex justify-between items-center py-2 px-3 bg-gray-900/30 rounded border border-gray-700/50"
                >
                  <span className="font-medium text-gray-200">{unit.posNumber}</span>
                  <span className="font-mono text-sm text-green-400">{formatEGP(quoted)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
