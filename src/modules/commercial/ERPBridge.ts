/**
 * ERP Integration Bridge - Basic Implementation
 * 
 * Provides adapter layer for connecting Almona Fabricator Pro to external ERP systems (Odoo, SAP, etc.)
 * 
 * **Status**: Basic structure - NOT production-ready
 * **Roadmap**: See UNIFIED_STRATEGIC_PLAN.md - ERP Phase 1-4 (Q1-Q2 2026)
 * 
 * @since January 2026 (Gap Analysis Fix)
 */

export interface ERPConfig {
  system: 'odoo' | 'sap' | 'mock';
  baseUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
  workshopId: string;
}

export interface ERPQuote {
  id: string;
  fabricatorProjectId: string;
  erpQuoteId?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  syncedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

export interface ERPOrder {
  id: string;
  fabricatorProjectId: string;
  erpOrderId?: string;
  status: 'draft' | 'confirmed' | 'in_production' | 'completed';
  syncedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

export interface ERPInvoice {
  id: string;
  fabricatorProjectId: string;
  erpInvoiceId?: string;
  status: 'draft' | 'posted' | 'paid';
  syncedAt?: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

export interface StockMove {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  locationFrom: string;
  locationTo: string;
  date: Date;
  syncedAt?: Date;
  erpStockMoveId?: string;
}

export interface ERPSyncResult {
  success: boolean;
  erpId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * ERP Integration Bridge
 * 
 * Provides basic adapter pattern for ERP sync operations.
 * **NOTE**: This is a MOCK implementation. Production requires:
 * - Odoo API client integration
 * - Webhook handler
 * - Database persistence
 * - Error handling & retry logic
 * - Rollback support
 */
export class ERPBridge {
  private config: ERPConfig;
  private quotes: Map<string, ERPQuote> = new Map();
  private orders: Map<string, ERPOrder> = new Map();
  private invoices: Map<string, ERPInvoice> = new Map();
  private stockMoves: Map<string, StockMove> = new Map();

  constructor(config: ERPConfig) {
    this.config = config;
  }

  /**
   * Sync quote to ERP system
   */
  async syncQuote(quote: ERPQuote): Promise<ERPSyncResult> {
    if (this.config.system === 'mock') {
      // Mock implementation
      const erpQuoteId = `ERP-Q-${Date.now()}`;
      quote.erpQuoteId = erpQuoteId;
      quote.syncedAt = new Date();
      quote.syncStatus = 'synced';
      this.quotes.set(quote.id, quote);

      return {
        success: true,
        erpId: erpQuoteId,
        timestamp: new Date(),
      };
    }

    // TODO: Implement Odoo/SAP integration
    throw new Error('ERP integration not implemented. Use system: "mock" for testing.');
  }

  /**
   * Sync order to ERP system
   */
  async syncOrder(order: ERPOrder): Promise<ERPSyncResult> {
    if (this.config.system === 'mock') {
      const erpOrderId = `ERP-O-${Date.now()}`;
      order.erpOrderId = erpOrderId;
      order.syncedAt = new Date();
      order.syncStatus = 'synced';
      this.orders.set(order.id, order);

      return {
        success: true,
        erpId: erpOrderId,
        timestamp: new Date(),
      };
    }

    throw new Error('ERP integration not implemented. Use system: "mock" for testing.');
  }

  /**
   * Sync invoice to ERP system
   */
  async syncInvoice(invoice: ERPInvoice): Promise<ERPSyncResult> {
    if (this.config.system === 'mock') {
      const erpInvoiceId = `ERP-I-${Date.now()}`;
      invoice.erpInvoiceId = erpInvoiceId;
      invoice.syncedAt = new Date();
      invoice.syncStatus = 'synced';
      this.invoices.set(invoice.id, invoice);

      return {
        success: true,
        erpId: erpInvoiceId,
        timestamp: new Date(),
      };
    }

    throw new Error('ERP integration not implemented. Use system: "mock" for testing.');
  }

  /**
   * Sync stock move to ERP inventory
   */
  async syncStockMove(stockMove: StockMove): Promise<ERPSyncResult> {
    if (this.config.system === 'mock') {
      const erpStockMoveId = `ERP-SM-${Date.now()}`;
      stockMove.erpStockMoveId = erpStockMoveId;
      stockMove.syncedAt = new Date();
      this.stockMoves.set(stockMove.id, stockMove);

      return {
        success: true,
        erpId: erpStockMoveId,
        timestamp: new Date(),
      };
    }

    throw new Error('ERP integration not implemented. Use system: "mock" for testing.');
  }

  /**
   * Get quote from ERP (pull update)
   */
  async getQuote(fabricatorProjectId: string): Promise<ERPQuote | null> {
    if (this.config.system === 'mock') {
      return this.quotes.get(fabricatorProjectId) || null;
    }

    throw new Error('ERP integration not implemented.');
  }

  /**
   * Get sync status for a quote
   */
  getSyncStatus(id: string): {
    quote?: ERPQuote;
    order?: ERPOrder;
    invoice?: ERPInvoice;
  } {
    return {
      quote: this.quotes.get(id),
      order: this.orders.get(id),
      invoice: this.invoices.get(id),
    };
  }

  /**
   * Webhook handler (for incoming ERP updates)
   * TODO: Implement in ERP Phase 2
   */
  async handleWebhook(payload: any): Promise<void> {
    console.log('[ERP Bridge] Webhook received:', payload);
    throw new Error('Webhook handling not implemented. See ERP Phase 2 roadmap.');
  }
}

/**
 * Example Usage:
 * 
 * const erpBridge = new ERPBridge({
 *   system: 'mock',
 *   workshopId: 'ws-123'
 * });
 * 
 * const result = await erpBridge.syncQuote({
 *   id: 'quote-456',
 *   fabricatorProjectId: 'proj-789',
 *   status: 'draft',
 *   syncStatus: 'pending'
 * });
 * 
 * console.log('Synced to ERP:', result.erpId);
 */
