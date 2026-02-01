import { supabase } from '@/lib/supabase';
import 'dotenv/config'; // Load .env file
import { AfterSalesCache } from './caches/afterSalesCache';
import { EcommerceCache } from './caches/ecommerceCache';
import { FabricatorProCache } from './caches/fabricatorProCache';
import { RealityOSCache } from './caches/realityOSCache';

/**
 * Supabase Realtime Cache Invalidation
 * 
 * Automatically invalidates Redis cache when data changes in Supabase
 * using Realtime subscriptions (Postgres CDC)
 */
export class RealtimeCacheInvalidator {
  private channels: Map<string, any> = new Map();
  private isInitialized = false;

  /**
   * Initialize all Realtime subscriptions
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('[RealtimeCacheInvalidator] Already initialized');
      return;
    }

    console.log('[RealtimeCacheInvalidator] Initializing Realtime subscriptions...');

    // After Sales subscriptions
    this.subscribeToAfterSales();

    // Fabricator Pro subscriptions
    this.subscribeToFabricatorPro();

    // RealityOS subscriptions
    this.subscribeToRealityOS();

    // E-commerce subscriptions
    this.subscribeToEcommerce();

    this.isInitialized = true;
    console.log('[RealtimeCacheInvalidator] ✅ All subscriptions active');
  }

  // ============================================================================
  // After Sales Subscriptions
  // ============================================================================

  private subscribeToAfterSales() {
    // Service Tickets
    const ticketsChannel = supabase
      .channel('cache-invalidation-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Service ticket changed:', payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const ticket = payload.new as any;
            await AfterSalesCache.invalidateTicket(ticket.id);
            await AfterSalesCache.invalidateTicketsByStatus(ticket.status);
          } else if (payload.eventType === 'DELETE') {
            const ticket = payload.old as any;
            await AfterSalesCache.invalidateTicket(ticket.id);
            await AfterSalesCache.invalidateTicketsByStatus(ticket.status);
          }
        }
      )
      .subscribe();

    this.channels.set('tickets', ticketsChannel);

    // YILMAZ Machines
    const machinesChannel = supabase
      .channel('cache-invalidation-machines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yilmaz_machines',
        },
        async () => {
          console.log('[Cache Invalidation] Machine catalog changed');
          await AfterSalesCache.invalidateMachineCatalog();
        }
      )
      .subscribe();

    this.channels.set('machines', machinesChannel);
  }

  // ============================================================================
  // Fabricator Pro Subscriptions
  // ============================================================================

  private subscribeToFabricatorPro() {
    // Fabricator Profiles
    const profilesChannel = supabase
      .channel('cache-invalidation-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_profiles',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Fabricator profile changed:', payload.eventType);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const profile = payload.new as any;
            await FabricatorProCache.invalidateProfile(profile.id);
            await FabricatorProCache.invalidateUserProfiles(profile.user_id);
          } else if (payload.eventType === 'DELETE') {
            const profile = payload.old as any;
            await FabricatorProCache.invalidateProfile(profile.id);
            await FabricatorProCache.invalidateUserProfiles(profile.user_id);
          }
        }
      )
      .subscribe();

    this.channels.set('profiles', profilesChannel);

    // Remnant Inventory
    const remnantsChannel = supabase
      .channel('cache-invalidation-remnants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'remnant_inventory',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Remnant inventory changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const remnant = payload.new as any;
            await FabricatorProCache.invalidateRemnants(remnant.warehouse_id);
          } else if (payload.eventType === 'DELETE') {
            const remnant = payload.old as any;
            await FabricatorProCache.invalidateRemnants(remnant.warehouse_id);
          }
        }
      )
      .subscribe();

    this.channels.set('remnants', remnantsChannel);

    // System Packs
    const systemPacksChannel = supabase
      .channel('cache-invalidation-systempacks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_packs',
        },
        async (payload) => {
          console.log('[Cache Invalidation] System pack changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pack = payload.new as any;
            await FabricatorProCache.invalidateSystemPack(pack.id);
          } else if (payload.eventType === 'DELETE') {
            const pack = payload.old as any;
            await FabricatorProCache.invalidateSystemPack(pack.id);
          }
        }
      )
      .subscribe();

    this.channels.set('systempacks', systemPacksChannel);
  }

  // ============================================================================
  // RealityOS Subscriptions
  // ============================================================================

  private subscribeToRealityOS() {
    // Reality Events
    const eventsChannel = supabase
      .channel('cache-invalidation-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reality_events',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Reality event changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const event = payload.new as any;
            await RealityOSCache.invalidateEvents(event.entity_id);
          } else if (payload.eventType === 'DELETE') {
            const event = payload.old as any;
            await RealityOSCache.invalidateEvents(event.entity_id);
          }
        }
      )
      .subscribe();

    this.channels.set('events', eventsChannel);

    // QR Codes
    const qrCodesChannel = supabase
      .channel('cache-invalidation-qrcodes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_codes',
        },
        async (payload) => {
          console.log('[Cache Invalidation] QR code changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const qr = payload.new as any;
            await RealityOSCache.invalidateQRCode(qr.code);
          } else if (payload.eventType === 'DELETE') {
            const qr = payload.old as any;
            await RealityOSCache.invalidateQRCode(qr.code);
          }
        }
      )
      .subscribe();

    this.channels.set('qrcodes', qrCodesChannel);

    // Entities
    const entitiesChannel = supabase
      .channel('cache-invalidation-entities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entities',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Entity changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entity = payload.new as any;
            await RealityOSCache.invalidateEntity(entity.id);
          } else if (payload.eventType === 'DELETE') {
            const entity = payload.old as any;
            await RealityOSCache.invalidateEntity(entity.id);
          }
        }
      )
      .subscribe();

    this.channels.set('entities', entitiesChannel);
  }

  // ============================================================================
  // E-commerce Subscriptions
  // ============================================================================

  private subscribeToEcommerce() {
    // Products
    const productsChannel = supabase
      .channel('cache-invalidation-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Product changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const product = payload.new as any;
            await EcommerceCache.invalidateProduct(product.id);
            await EcommerceCache.invalidateSearch();
          } else if (payload.eventType === 'DELETE') {
            const product = payload.old as any;
            await EcommerceCache.invalidateProduct(product.id);
            await EcommerceCache.invalidateSearch();
          }
        }
      )
      .subscribe();

    this.channels.set('products', productsChannel);

    // Pricing Tiers
    const pricingChannel = supabase
      .channel('cache-invalidation-pricing')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pricing_tiers',
        },
        async (payload) => {
          console.log('[Cache Invalidation] Pricing changed');
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pricing = payload.new as any;
            await EcommerceCache.invalidatePricing(pricing.product_id);
          } else if (payload.eventType === 'DELETE') {
            const pricing = payload.old as any;
            await EcommerceCache.invalidatePricing(pricing.product_id);
          }
        }
      )
      .subscribe();

    this.channels.set('pricing', pricingChannel);

    // Product Categories
    const categoriesChannel = supabase
      .channel('cache-invalidation-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_categories',
        },
        async () => {
          console.log('[Cache Invalidation] Category changed');
          await EcommerceCache.invalidateCategories();
        }
      )
      .subscribe();

    this.channels.set('categories', categoriesChannel);
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Unsubscribe from all channels
   */
  async cleanup() {
    console.log('[RealtimeCacheInvalidator] Cleaning up subscriptions...');
    
    for (const [name, channel] of this.channels) {
      await supabase.removeChannel(channel);
      console.log(`[RealtimeCacheInvalidator] Unsubscribed from ${name}`);
    }
    
    this.channels.clear();
    this.isInitialized = false;
    
    console.log('[RealtimeCacheInvalidator] ✅ Cleanup complete');
  }

  /**
   * Get subscription status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeChannels: Array.from(this.channels.keys()),
      channelCount: this.channels.size,
    };
  }
}

// Global instance
export const realtimeCacheInvalidator = new RealtimeCacheInvalidator();

// Auto-initialize on import (can be disabled if needed)
if (typeof window !== 'undefined') {
  realtimeCacheInvalidator.initialize().catch((error) => {
    console.error('[RealtimeCacheInvalidator] Failed to initialize:', error);
  });
}
