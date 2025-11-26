/**
 * Automated Quote Generation Engine
 * Calculates pricing with profit margins and cost analysis
 */

import { WindowUnit, OptimizationResult } from '@/types/fabricator';

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

/**
 * Commercial / contractual sections for a professional aluminium windows offer.
 * These are optional on the Quote and can be progressively filled from UI
 * or regional defaults.
 */
export interface OfferPartyInfo {
  companyName: string;
  contactName?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  vatNumber?: string;
  registrationNumber?: string;
  branchName?: string;
}

export interface ProjectScopeSummary {
  projectName?: string;
  siteAddress?: string;
  scopeOfSupply: string;
  exclusions?: string[];
  buildingType?: string; // villa, tower, compound, mall, etc.
  notes?: string;
}

export interface TechnicalSummary {
  systems: string[]; // e.g. ['ROCK 60', 'JUMBO100']
  glazingSummary?: string;
  finishSummary?: string;
  hardwareSummary?: string;
  performanceSummary?: string; // U-values, air/water/wind, etc.
}

export interface PaymentMilestone {
  label: string; // e.g. 'On order', 'Before delivery', 'After installation'
  percentage?: number;
  fixedAmount?: number;
}

export interface PaymentTerms {
  currency: string;
  depositPercentage?: number;
  milestones?: PaymentMilestone[];
  paymentMethods?: string[]; // bank transfer, cheque, LC...
  validityDays?: number;
  latePaymentPolicy?: string;
  bankDetails?: string;
}

export interface WarrantyInfo {
  profilesYears?: number;
  hardwareYears?: number;
  glazingYears?: number;
  workmanshipYears?: number;
  notes?: string;
}

export interface GeneralTerms {
  validityDays?: number;
  cancellationPolicy?: string;
  priceAdjustmentClause?: string;
  forceMajeureClause?: string;
  jurisdiction?: string;
  disputeResolution?: string;
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
  // Advanced commercial sections
  parties?: {
    seller: OfferPartyInfo;
    buyer?: OfferPartyInfo;
  };
  projectScope?: ProjectScopeSummary;
  technicalSummary?: TechnicalSummary;
  paymentTerms?: PaymentTerms;
  warranty?: WarrantyInfo;
  generalTerms?: GeneralTerms;
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
      // Minimal defaults for advanced commercial sections – these can be
      // enriched by UI or regional presets later.
      parties: {
        seller: {
          companyName: '', // to be populated from branding / settings
        },
        buyer: customerName
          ? {
              companyName: customerName,
            }
          : undefined,
      },
      projectScope: {
        projectName: project.orderNumber,
        siteAddress: undefined,
        scopeOfSupply: 'Supply and/or installation of aluminium/UPVC windows and doors as per attached schedule.',
        exclusions: [
          'Civil works (masonry, plaster, concrete)',
          'Electrical and low-current works',
          'Curtains, blinds, and interior finishing items',
        ],
        buildingType: undefined,
      },
      technicalSummary: {
        systems: [project.type],
        glazingSummary: project.glazing
          ? `${project.glazing.type} glazing`
          : undefined,
        finishSummary: project.color ? `Profiles finished in ${project.color}` : undefined,
      },
      paymentTerms: {
        currency: 'USD',
        depositPercentage: 30,
        milestones: [
          { label: 'On order confirmation', percentage: 30 },
          { label: 'Before delivery', percentage: 60 },
          { label: 'After installation completion', percentage: 10 },
        ],
        validityDays: 30,
      },
      warranty: {
        profilesYears: 10,
        hardwareYears: 2,
        glazingYears: 5,
        workmanshipYears: 2,
      },
      generalTerms: {
        validityDays: 30,
        cancellationPolicy:
          'Orders cancelled after fabrication start may incur restocking or fabrication charges.',
        priceAdjustmentClause:
          'Prices are based on current aluminium and glass costs and may be adjusted in case of significant market fluctuations.',
        forceMajeureClause:
          'Delays caused by events beyond the control of the supplier (force majeure) shall extend the delivery timeline without penalty.',
      },
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

