
import type { Rectangle } from '../types/drafting';
import { PriceCalculator, type CostBreakdown } from './PriceCalculator';

export interface QuoteHelpers {
  markupPercentage: number; // e.g., 20%
  taxPercentage: number; // e.g., 14% VAT
}

export interface Quote extends CostBreakdown {
  markup: number;
  subtotal: number; // Cost + Markup
  tax: number;
  finalPrice: number;
}

export class QuoteService {
  
  /**
   * Generates a full quote for a single unit including markup and tax.
   */
  public static generateQuote(
    rectangles: Rectangle[], 
    systemId: string, 
    options: QuoteHelpers = { markupPercentage: 25, taxPercentage: 14 }
  ): Quote {
    // 1. Get Base Cost
    const breakdown = PriceCalculator.calculate(rectangles, systemId);
    
    // 2. Apply Markup
    const markupAmount = breakdown.totalCost * (options.markupPercentage / 100);
    const subtotal = breakdown.totalCost + markupAmount;
    
    // 3. Apply Tax
    const taxAmount = subtotal * (options.taxPercentage / 100);
    const finalPrice = subtotal + taxAmount;

    return {
      ...breakdown,
      markup: Number(markupAmount.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(taxAmount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2))
    };
  }
}
