
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';
import { QuoteService } from '../services/QuoteService';
import type { Rectangle } from '../types/drafting';

interface PricingPanelProps {
    rectangles: Rectangle[];
    systemId: string;
}

export const PricingPanel: React.FC<PricingPanelProps> = ({
    rectangles,
    systemId
}) => {

    const quote = useMemo(() => {
        if (!rectangles || rectangles.length === 0) return null;
        return QuoteService.generateQuote(rectangles, systemId);
    }, [rectangles, systemId]);

    if (!quote) {
        return (
            <div className="p-4 text-center text-slate-500 text-xs italic">
                Draw a window to see pricing.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-green-500" />
                <h3 className="text-sm font-medium text-slate-100">Cost Estimate</h3>
            </div>

            <div className="bg-slate-900/50 rounded border border-slate-700/50 overflow-hidden">
                {/* Breakdown Table */}
                <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-700/50">
                        {/* Aluminum */}
                        <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-400">Aluminum ({quote.aluminum.weightKg}kg)</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">
                                {quote.aluminum.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>

                        {/* Glass */}
                        <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-400">Glass ({quote.glass.areaM2}m²)</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">
                                {quote.glass.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>

                        {/* Hardware */}
                        <tr className="hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-slate-400">Hardware ({quote.hardware.count} kits)</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">
                                {quote.hardware.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="bg-slate-800/50 px-3 py-2 border-t border-slate-700 space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Base Cost</span>
                        <span>{quote.totalCost.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Markup (25%)</span>
                        <span>{quote.markup.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                        <span>VAT (14%)</span>
                        <span>{quote.tax.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-medium text-green-400">Final Price</span>
                        <span className="text-lg font-bold text-green-400">
                            {quote.finalPrice.toLocaleString()} {quote.currency}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded transition-colors">
                    <ShoppingCart size={14} />
                    Add to Quote
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium py-2 rounded transition-colors">
                    <TrendingUp size={14} />
                    Margin
                </button>
            </div>
        </div>
    );
};
