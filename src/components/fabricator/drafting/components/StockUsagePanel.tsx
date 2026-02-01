import { Package } from 'lucide-react';
import React, { useMemo } from 'react';
import { CutListGenerator } from '../services/CutListGenerator';
import { StockOptimizer, type OptimizationResult } from '../services/StockOptimizer';
import type { Rectangle } from '../types/drafting';

interface StockUsagePanelProps {
    rectangles: Rectangle[];
    systemId: string;
}

export const StockUsagePanel: React.FC<StockUsagePanelProps> = ({
    rectangles,
    systemId
}) => {
    const result: OptimizationResult | null = useMemo(() => {
        if (!rectangles || rectangles.length === 0) return null;
        const items = CutListGenerator.generate(rectangles, systemId);
        return StockOptimizer.optimize(items);
    }, [rectangles, systemId]);

    if (!result) {
        return (
            <div className="p-4 text-center text-slate-500 text-xs italic">
                Draw to calculate stock usage.
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-emerald-500" />
                <h3 className="text-sm font-medium text-slate-100">Stock Optimization</h3>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400">Total Bars (6m)</div>
                    <div className="text-xl font-bold text-slate-100">{result.barCount}</div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <div className="text-[10px] text-slate-400">Efficiency</div>
                    <div className={`text-xl font-bold ${result.wastePercentage < 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {(100 - result.wastePercentage).toFixed(1)}%
                    </div>
                </div>
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700 col-span-2 flex justify-between items-center">
                    <div className="text-[10px] text-slate-400">Total Waste</div>
                    <div className="text-sm font-mono text-red-400">{(result.totalWaste / 1000).toFixed(2)}m</div>
                </div>
            </div>

            {/* Visual Bars */}
            <div className="flex-1 overflow-auto space-y-3 pr-2">
                {result.bars.map((bar) => (
                    <div key={bar.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{bar.id}</span>
                            <span>Rem: {bar.remaining.toFixed(0)}mm</span>
                        </div>
                        {/* Bar Visualization 6000mm = 100% width */}
                        <div className="h-6 bg-slate-800 rounded-sm w-full flex overflow-hidden border border-slate-700 relative">
                            {/* Cuts */}
                            {bar.cuts.map((cut, idx) => (
                                <div
                                    key={idx}
                                    style={{ width: `${(cut.lengthMm / bar.length) * 100}%` }}
                                    className="h-full bg-emerald-600/80 border-r border-slate-900 first:rounded-l relative group hover:bg-emerald-500 transition-colors"
                                >
                                    {/* Full width tooltip or label if big enough */}
                                    {cut.lengthMm > 300 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-mono truncate px-1">
                                            {cut.lengthMm.toFixed(0)}
                                        </span>
                                    )}
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1 py-0.5 bg-black text-white text-[9px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 border border-slate-600">
                                        {cut.profileCode} - {cut.lengthMm.toFixed(0)}mm
                                    </span>
                                </div>
                            ))}
                            {/* Waste (Remaining) */}
                            <div className="flex-1 bg-red-900/30 h-full relative group">
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-red-500/50 font-mono">
                                    WASTE
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-2 bg-slate-800/30 border border-slate-700 rounded text-[10px] text-slate-500 text-center">
                Algorithm: First Fit Decreasing (FFD)
            </div>
        </div>
    );
};
