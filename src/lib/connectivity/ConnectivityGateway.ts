/**
 * ConnectivityGateway.ts
 * Standardized layer for communicating with external ERP and Production systems.
 * Supports Adapter pattern for Odoo, SAP, etc.
 */

export type IntegrationType = 'ERP' | 'CNC' | 'BIM' | 'CRM';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type WebhookEvent = 'order_created' | 'order_updated' | 'stock_check' | 'production_status';

export interface IntegrationConfig {
    id: string;
    name: string;
    type: IntegrationType;
    provider: 'odoo' | 'sap' | 'custom_webhook' | 'local_file';
    endpointUrl?: string;
    apiKey?: string;
    isEnabled: boolean;
    retryPolicy?: {
        maxRetries: number;
        backoffMultiplier: number;
    };
}

export interface ExternalOrder {
    externalId: string;
    source: string;
    status: string;
    items: any[];
    fullPayload: any;
}

/**
 * Base abstract adapter that all integrations must implement
 */
export abstract class ConnectivityAdapter {
    constructor(protected config: IntegrationConfig) {}

    abstract connect(): Promise<boolean>;
    abstract syncOrder(orderData: any): Promise<{ success: boolean; externalId?: string; error?: string }>;
    abstract checkStock(sku: string): Promise<number>;
    
    protected log(message: string, _level: 'info' | 'error' = 'info') {
        console.log(`[Adapter:${this.config.provider}] ${message}`);
    }
}

/**
 * Odoo ERP Adapter Implementation
 * Uses JSON-RPC style communication (simulated for now)
 */
export class OdooAdapter extends ConnectivityAdapter {
    async connect(): Promise<boolean> {
        this.log('Connecting to Odoo instance...');
        // Simulate authentication
        return true;
    }

    async syncOrder(orderData: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
        this.log(`Syncing order ${orderData.id} to Odoo...`);
        // Mock API call
        return { success: true, externalId: `ODOO-${Date.now()}` };
    }

    async checkStock(sku: string): Promise<number> {
        this.log(`Checking stock for ${sku}...`);
        return 100; // Mock stock
    }
}

/**
 * SAP Business One Adapter Implementation
 * Uses Service Layer (OData)
 */
export class SAPAdapter extends ConnectivityAdapter {
    async connect(): Promise<boolean> {
        this.log('Connecting to SAP Service Layer...');
        return true;
    }

    async syncOrder(_orderData: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
        this.log(`Posting Sales Order to SAP...`);
        return { success: true, externalId: `SAP-${Date.now()}` };
    }

    async checkStock(_sku: string): Promise<number> {
        return 500; // Mock stock
    }
}

/**
 * Factory to get appropriate adapter
 */
export class ConnectivityFactory {
    static getAdapter(config: IntegrationConfig): ConnectivityAdapter {
        switch (config.provider) {
            case 'odoo':
                return new OdooAdapter(config);
            case 'sap':
                return new SAPAdapter(config);
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }
}
