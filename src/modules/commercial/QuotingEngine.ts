/**
 * Automated Quote Generation Engine
 * Calculates pricing with profit margins and cost analysis
 */

import { WindowUnit, OptimizationResult, Profile } from '@/types/fabricator';

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'material' | 'labor' | 'hardware' | 'glazing' | 'installation' | 'other';
  cost: number;
  margin: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  projectId: string;
  customerId?: string;
  customerName?: string;
  createdAt: Date;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  profitMargin: number;
  estimatedProductionTime: number;
  deliveryDate?: Date;
  notes?: string;
}

export interface PricingConfig {
  materialMarkup: number; // percentage
  laborMarkup: number;
  hardwareMarkup: number;
  glazingMarkup: number;
  installationMarkup: number;
  defaultTaxRate: number;
  minProfitMargin: number;
  maxDiscount: number;
}

export class QuotingEngine {
  private config: PricingConfig;

  constructor(config?: Partial<PricingConfig>) {
    this.config = {
      materialMarkup: config?.materialMarkup || 35,
      laborMarkup: config?.laborMarkup || 50,
      hardwareMarkup: config?.hardwareMarkup || 40,
      glazingMarkup: config?.glazingMarkup || 30,
      installationMarkup: config?.installationMarkup || 45,
      defaultTaxRate: config?.defaultTaxRate || 20,
      minProfitMargin: config?.minProfitMargin || 25,
      maxDiscount: config?.maxDiscount || 15,
    };
  }

  /**
   * Generate quote from project and optimization result
   */
  generateQuote(
    project: WindowUnit,
    optimization: OptimizationResult,
    customerId?: string,
    customerName?: string
  ): Quote {
    const lineItems: QuoteLineItem[] = [];

    // Material costs
    const materialCost = optimization.costBreakdown.materialCost;
    const materialPrice = this.applyMarkup(materialCost, this.config.materialMarkup);
    lineItems.push({
      id: 'material',
      description: `Aluminum/UPVC Profiles - ${project.type}`,
      quantity: 1,
      unitPrice: materialPrice,
      totalPrice: materialPrice,
      category: 'material',
      cost: materialCost,
      margin: this.config.materialMarkup,
    });

    // Labor costs
    const laborCost = optimization.costBreakdown.laborCost;
    const laborPrice = this.applyMarkup(laborCost, this.config.laborMarkup);
    lineItems.push({
      id: 'labor',
      description: `Manufacturing & Assembly Labor`,
      quantity: 1,
      unitPrice: laborPrice,
      totalPrice: laborPrice,
      category: 'labor',
      cost: laborCost,
      margin: this.config.laborMarkup,
    });

    // Hardware costs
    const hardwareCost = optimization.costBreakdown.hardwareCost;
    const hardwarePrice = this.applyMarkup(hardwareCost, this.config.hardwareMarkup);
    lineItems.push({
      id: 'hardware',
      description: `Hardware Components (Hinges, Locks, Handles)`,
      quantity: project.hardware?.length || 0,
      unitPrice: hardwarePrice / (project.hardware?.length || 1),
      totalPrice: hardwarePrice,
      category: 'hardware',
      cost: hardwareCost,
      margin: this.config.hardwareMarkup,
    });

    // Glazing costs
    const glazingCost = optimization.costBreakdown.glazingCost;
    const glazingPrice = this.applyMarkup(glazingCost, this.config.glazingMarkup);
    lineItems.push({
      id: 'glazing',
      description: `${project.glazing.type} Glazing Unit`,
      quantity: 1,
      unitPrice: glazingPrice,
      totalPrice: glazingPrice,
      category: 'glazing',
      cost: glazingCost,
      margin: this.config.glazingMarkup,
    });

    // Installation (optional)
    const installationCost = this.calculateInstallationCost(project);
    if (installationCost > 0) {
      const installationPrice = this.applyMarkup(
        installationCost,
        this.config.installationMarkup
      );
      lineItems.push({
        id: 'installation',
        description: `Installation Service`,
        quantity: 1,
        unitPrice: installationPrice,
        totalPrice: installationPrice,
        category: 'installation',
        cost: installationCost,
        margin: this.config.installationMarkup,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCost = lineItems.reduce((sum, item) => sum + item.cost, 0);
    const profitMargin = ((subtotal - totalCost) / subtotal) * 100;

    const taxAmount = (subtotal * this.config.defaultTaxRate) / 100;
    const total = subtotal + taxAmount;

    const quote: Quote = {
      id: `quote_${Date.now()}`,
      quoteNumber: `QT-${Date.now().toString().substr(-8)}`,
      projectId: project.id,
      customerId,
      customerName,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'draft',
      lineItems,
      subtotal,
      taxRate: this.config.defaultTaxRate,
      taxAmount,
      discount: 0,
      total,
      profitMargin,
      estimatedProductionTime: optimization.estimatedProductionTime,
      deliveryDate: this.calculateDeliveryDate(optimization.estimatedProductionTime),
    };

    return quote;
  }

  /**
   * Apply discount to quote
   */
  applyDiscount(quote: Quote, discountPercent: number): Quote {
    const maxDiscount = Math.min(discountPercent, this.config.maxDiscount);
    const discountAmount = (quote.subtotal * maxDiscount) / 100;

    return {
      ...quote,
      discount: discountAmount,
      total: quote.total - discountAmount,
    };
  }

  /**
   * Calculate installation cost based on window size and complexity
   */
  private calculateInstallationCost(project: WindowUnit): number {
    const area = (project.overallWidth * project.overallHeight) / 1000000; // m²
    const baseCost = 50; // EUR per m²
    const complexityMultiplier = project.components.length > 4 ? 1.3 : 1.0;
    return area * baseCost * complexityMultiplier;
  }

  /**
   * Calculate delivery date based on production time
   */
  private calculateDeliveryDate(productionTimeHours: number): Date {
    const workingDays = Math.ceil(productionTimeHours / 8);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + workingDays + 2); // +2 for buffer
    return deliveryDate;
  }

  /**
   * Apply markup to cost
   */
  private applyMarkup(cost: number, markupPercent: number): number {
    return cost * (1 + markupPercent / 100);
  }

  /**
   * Validate profit margin
   */
  validateProfitMargin(quote: Quote): boolean {
    return quote.profitMargin >= this.config.minProfitMargin;
  }

  /**
   * Export quote to PDF format (placeholder)
   */
  exportToPDF(quote: Quote): string {
    // In real implementation, this would generate a PDF
    return JSON.stringify(quote, null, 2);
  }
}

