/**
 * FabricatorQuoteService - Quote generation for pose-centric workflow
 *
 * Bridges CompleteBOM + OptimizationResult → WorkflowQuote.
 * Uses QuotingEngine when optimization exists; falls back to BOM cost when not.
 *
 * @since Phase 1.3: Core Pipeline
 */

import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { QuotingEngine, type Quote } from '@/modules/commercial/QuotingEngine';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import type { WorkflowQuote } from '@/store/workflowStore';

const DEFAULT_TAX_RATE = 14; // Egyptian VAT
const DEFAULT_MARKUP = 35; // %

export interface FabricatorQuoteOptions {
  markupPercent?: number;
  taxRate?: number;
  currency?: string;
}

/**
 * Generate WorkflowQuote from BOM + OptimizationResult (or BOM alone)
 */
export function generateFabricatorQuote(
  project: WindowUnit,
  optimization: OptimizationResult | null,
  bom: CompleteBOM | null,
  options: FabricatorQuoteOptions = {}
): WorkflowQuote {
  const {
    markupPercent = DEFAULT_MARKUP,
    taxRate = DEFAULT_TAX_RATE,
    currency = 'EGP',
  } = options;

  if (optimization && project) {
    const engine = new QuotingEngine({
      materialMarkup: markupPercent,
      laborMarkup: markupPercent,
      hardwareMarkup: markupPercent,
      glazingMarkup: markupPercent,
      defaultTaxRate: taxRate,
    });
    const quote: Quote = engine.generateQuote(project, optimization);
    return {
      subtotal: quote.subtotal,
      tax: quote.taxAmount,
      total: quote.total,
      currency,
      lineItems: quote.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
      })),
    };
  }

  // Fallback: use BOM cost when no optimization
  if (bom?.cost) {
    const applyMarkup = (cost: number) => cost * (1 + markupPercent / 100);
    const lineItems = [
      { description: 'Profiles & Materials', quantity: 1, unitPrice: applyMarkup(bom.cost.materialCost), total: applyMarkup(bom.cost.materialCost) },
      { description: 'Hardware', quantity: 1, unitPrice: applyMarkup(bom.cost.hardwareCost), total: applyMarkup(bom.cost.hardwareCost) },
      { description: 'Glazing', quantity: 1, unitPrice: applyMarkup(bom.cost.glazingCost), total: applyMarkup(bom.cost.glazingCost) },
      { description: 'Labor', quantity: 1, unitPrice: applyMarkup(bom.cost.laborCost), total: applyMarkup(bom.cost.laborCost) },
      { description: 'Accessories', quantity: 1, unitPrice: applyMarkup(bom.cost.accessoriesCost ?? 0), total: applyMarkup(bom.cost.accessoriesCost ?? 0) },
    ].filter((i) => i.total > 0);
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      total,
      currency,
      lineItems,
    };
  }

  return {
    subtotal: 0,
    tax: 0,
    total: 0,
    currency,
  };
}
