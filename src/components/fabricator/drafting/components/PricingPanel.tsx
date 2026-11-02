
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
            <div className="p-4 text-center text-muted-foreground text-xs italic">
                Draw a window to see pricing.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-success" />
                <h3 className="text-sm font-medium text-foreground">Cost Estimate</h3>
            </div>

            <div className="bg-background/50 rounded border border-border/50 overflow-hidden">
                {/* Breakdown Table */}
                <table className="w-full text-xs">
                    <tbody className="divide-y divide-border/50">
                        {/* Aluminum */}
                        <tr className="hover:bg-card/50">
                            <td className="px-3 py-2 text-muted-foreground">Aluminum ({quote.aluminum.weightKg}kg)</td>
                            <td className="px-3 py-2 text-right font-mono text-foreground">
                                {quote.aluminum.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>

                        {/* Glass */}
                        <tr className="hover:bg-card/50">
                            <td className="px-3 py-2 text-muted-foreground">Glass ({quote.glass.areaM2}m²)</td>
                            <td className="px-3 py-2 text-right font-mono text-foreground">
                                {quote.glass.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>

                        {/* Hardware */}
                        <tr className="hover:bg-card/50">
                            <td className="px-3 py-2 text-muted-foreground">Hardware ({quote.hardware.count} kits)</td>
                            <td className="px-3 py-2 text-right font-mono text-foreground">
                                {quote.hardware.cost.toLocaleString()} {quote.currency}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="bg-card/50 px-3 py-2 border-t border-border space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Base Cost</span>
                        <span>{quote.totalCost.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Markup (25%)</span>
                        <span>{quote.markup.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>VAT (14%)</span>
                        <span>{quote.tax.toLocaleString()} {quote.currency}</span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-border flex justify-between items-center">
                        <span className="text-sm font-medium text-success">Final Price</span>
                        <span className="text-lg font-bold text-success">
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
                <button className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted text-foreground text-xs font-medium py-2 rounded transition-colors">
                    <TrendingUp size={14} />
                    Margin
                </button>
            </div>
        </div>
    );
};
