/**
 * Supplier API Integration
 * Handles real-time inventory, pricing, and order management with suppliers
 */

import { Profile } from '@/types/fabricator';
import { SupplierProfile, getSupplierById } from './profileDatabase';

export interface SupplierInventory {
  profileId: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: Date;
}

export interface SupplierPricing {
  profileId: string;
  basePrice: number;
  quantityDiscounts: Array<{
    minQuantity: number;
    discountPercent: number;
  }>;
  currency: string;
  validUntil: Date;
}

export interface OrderRequest {
  supplierId: string;
  items: Array<{
    profileId: string;
    quantity: number;
    length: number;
  }>;
  deliveryAddress: string;
  requestedDeliveryDate: Date;
}

export interface OrderResponse {
  orderId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  estimatedDeliveryDate: Date;
  totalCost: number;
  currency: string;
  confirmationNumber?: string;
  rejectionReason?: string;
}

export class SupplierAPI {
  /**
   * Fetch real-time inventory from supplier API
   */
  static async fetchInventory(
    supplierId: string,
    profileIds?: string[]
  ): Promise<SupplierInventory[]> {
    const supplier = getSupplierById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }
    
    // If supplier has API endpoint, fetch from API
    if (supplier.apiEndpoint && supplier.apiKey) {
      try {
        // Simulate API call - in real implementation, this would be an actual HTTP request
        const response = await this.callSupplierAPI(
          supplier.apiEndpoint,
          '/inventory',
          supplier.apiKey,
          { profileIds }
        );
        
        return response.map((item: any) => ({
          profileId: item.profileId,
          quantity: item.quantity,
          reserved: item.reserved || 0,
          available: item.quantity - (item.reserved || 0),
          lastUpdated: new Date(item.lastUpdated),
        }));
      } catch (error) {
        console.warn(`API call failed for ${supplierId}, using cached data:`, error);
      }
    }
    
    // Fallback to database inventory
    const profiles = profileIds
      ? supplier.profiles.filter(p => profileIds.includes(p.id))
      : supplier.profiles;
    
    return profiles.map(profile => ({
      profileId: profile.id,
      quantity: profile.stockQuantity,
      reserved: 0,
      available: profile.stockQuantity,
      lastUpdated: new Date(),
    }));
  }
  
  /**
   * Fetch real-time pricing from supplier API
   */
  static async fetchPricing(
    supplierId: string,
    profileIds: string[],
    quantities: number[]
  ): Promise<SupplierPricing[]> {
    const supplier = getSupplierById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }
    
    // If supplier has API endpoint, fetch from API
    if (supplier.apiEndpoint && supplier.apiKey) {
      try {
        const response = await this.callSupplierAPI(
          supplier.apiEndpoint,
          '/pricing',
          supplier.apiKey,
          { profileIds, quantities }
        );
        
        return response.map((item: any) => ({
          profileId: item.profileId,
          basePrice: item.basePrice,
          quantityDiscounts: item.quantityDiscounts || [],
          currency: item.currency || 'EUR',
          validUntil: new Date(item.validUntil),
        }));
      } catch (error) {
        console.warn(`API call failed for ${supplierId}, using cached pricing:`, error);
      }
    }
    
    // Fallback to database pricing
    return profileIds.map((profileId, index) => {
      const profile = supplier.profiles.find(p => p.id === profileId);
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }
      
      const quantity = quantities[index] || 1;
      const basePrice = profile.costPerMeter;
      
      // Calculate quantity discounts
      const quantityDiscounts = [
        { minQuantity: 100, discountPercent: 5 },
        { minQuantity: 500, discountPercent: 10 },
        { minQuantity: 1000, discountPercent: 15 },
      ];
      
      return {
        profileId,
        basePrice,
        quantityDiscounts,
        currency: 'EUR',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };
    });
  }
  
  /**
   * Calculate price with quantity discounts
   */
  static calculatePrice(
    pricing: SupplierPricing,
    quantity: number,
    length: number
  ): number {
    let price = pricing.basePrice;
    
    // Apply quantity discounts
    for (const discount of pricing.quantityDiscounts.sort((a, b) => b.minQuantity - a.minQuantity)) {
      if (quantity >= discount.minQuantity) {
        price = price * (1 - discount.discountPercent / 100);
        break;
      }
    }
    
    return price * length;
  }
  
  /**
   * Check minimum order quantity
   */
  static async validateMinimumOrder(
    supplierId: string,
    totalQuantity: number
  ): Promise<{ valid: boolean; message?: string }> {
    const supplier = getSupplierById(supplierId);
    if (!supplier) {
      return { valid: false, message: 'Supplier not found' };
    }
    
    if (totalQuantity < supplier.minOrderQuantity) {
      return {
        valid: false,
        message: `Minimum order quantity is ${supplier.minOrderQuantity} units. Current order: ${totalQuantity} units.`,
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Place order with supplier
   */
  static async placeOrder(request: OrderRequest): Promise<OrderResponse> {
    const supplier = getSupplierById(request.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${request.supplierId} not found`);
    }
    
    // Validate minimum order quantity
    const totalQuantity = request.items.reduce((sum, item) => sum + item.quantity, 0);
    const minOrderValidation = await this.validateMinimumOrder(request.supplierId, totalQuantity);
    if (!minOrderValidation.valid) {
      return {
        orderId: `order_${Date.now()}`,
        status: 'rejected',
        estimatedDeliveryDate: new Date(),
        totalCost: 0,
        currency: 'EUR',
        rejectionReason: minOrderValidation.message,
      };
    }
    
    // If supplier has API endpoint, place order via API
    if (supplier.apiEndpoint && supplier.apiKey) {
      try {
        const response = await this.callSupplierAPI(
          supplier.apiEndpoint,
          '/orders',
          supplier.apiKey,
          request,
          'POST'
        );
        
        return {
          orderId: response.orderId,
          status: response.status,
          estimatedDeliveryDate: new Date(response.estimatedDeliveryDate),
          totalCost: response.totalCost,
          currency: response.currency || 'EUR',
          confirmationNumber: response.confirmationNumber,
        };
      } catch (error) {
        console.error(`API order placement failed for ${request.supplierId}:`, error);
        // Fall through to manual order processing
      }
    }
    
    // Manual order processing (fallback)
    const pricing = await this.fetchPricing(
      request.supplierId,
      request.items.map(i => i.profileId),
      request.items.map(i => i.quantity)
    );
    
    let totalCost = 0;
    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      const price = this.calculatePrice(pricing[i], item.quantity, item.length);
      totalCost += price;
    }
    
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + supplier.leadTime);
    
    return {
      orderId: `order_${Date.now()}`,
      status: 'pending',
      estimatedDeliveryDate,
      totalCost,
      currency: 'EUR',
    };
  }
  
  /**
   * Call supplier API (simulated - replace with actual HTTP client)
   */
  private static async callSupplierAPI(
    endpoint: string,
    path: string,
    apiKey: string,
    data?: any,
    method: string = 'GET'
  ): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real implementation, use fetch or axios:
    /*
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
    */
    
    // Simulated response
    return {
      success: true,
      data: data,
    };
  }
  
  /**
   * Auto-import supplier catalogs
   */
  static async importCatalog(
    supplierId: string,
    catalogData: any
  ): Promise<{ imported: number; errors: string[] }> {
    const supplier = getSupplierById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }
    
    const errors: string[] = [];
    let imported = 0;
    
    // Parse catalog data and update profiles
    // This is a simplified version - real implementation would validate and transform data
    if (Array.isArray(catalogData.profiles)) {
      for (const profileData of catalogData.profiles) {
        try {
          // Validate and add/update profile
          const existingIndex = supplier.profiles.findIndex(p => p.id === profileData.id);
          if (existingIndex >= 0) {
            supplier.profiles[existingIndex] = { ...supplier.profiles[existingIndex], ...profileData };
          } else {
            supplier.profiles.push(profileData as Profile);
          }
          imported++;
        } catch (error) {
          errors.push(`Failed to import profile ${profileData.id}: ${error}`);
        }
      }
    }
    
    return { imported, errors };
  }
}

