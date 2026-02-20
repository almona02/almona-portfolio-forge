/**
 * Remnant Marketplace System
 * Enables buying/selling remnants between workshops in the fabricator network
 */

import { supabase } from '../supabase';
import { remnantManager } from './RemnantManager';

export interface MarketplaceListing {
  id: string;
  remnantId: string;
  sellerId: string;
  sellerName?: string;
  profileId: string;
  profileName?: string;
  length: number;
  price: number;
  currency: string;
  location?: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  status: 'available' | 'reserved' | 'sold' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  images?: string[];
  description?: string;
}

export interface MarketplaceSearchFilters {
  profileId?: string;
  material?: string;
  minLength?: number;
  maxLength?: number;
  minPrice?: number;
  maxPrice?: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  location?: string;
  sellerId?: string;
  city?: string;
  governorate?: string;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
}

export interface MarketplaceTransaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  createdAt: Date;
  completedAt?: Date;
}

export class RemnantMarketplace {
  /**
   * List a remnant for sale
   */
  async createListing(
    remnantId: string,
    sellerId: string,
    price: number,
    options: {
      currency?: string;
      description?: string;
      images?: string[];
      expiresInDays?: number;
    } = {}
  ): Promise<MarketplaceListing> {
    try {
      // Get remnant details
      const remnant = await remnantManager.getRemnantById(remnantId);
      if (!remnant) {
        throw new Error('Remnant not found');
      }

      if (remnant.status !== 'available') {
        throw new Error('Remnant is not available for listing');
      }

      const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Create listing in database
      const { data, error } = await supabase
        .from('remnant_marketplace_listings')
        .insert({
          remnant_id: remnantId,
          seller_id: sellerId,
          profile_id: remnant.profileId,
          length: remnant.length,
          price,
          currency: options.currency || 'EGP',
          quality: remnant.quality,
          location: remnant.locationName,
          description: options.description,
          images: options.images || [],
          status: 'available',
          expires_at: expiresAt?.toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;

      return this.mapListingFromDb(data);
    } catch (error) {
      console.error('Error creating marketplace listing:', error);
      throw error;
    }
  }

  /**
   * Search marketplace listings
   */
  async searchListings(
    filters: MarketplaceSearchFilters = {}
  ): Promise<MarketplaceListing[]> {
    try {
      let selectString = `
        *,
        fabricator_profiles!inner (name, material),
        seller:profiles!seller_id (name)
      `;

      if (filters.material) {
        // If material filter is present, we already have !inner
      } else {
        // If no material filter, we can use outer join (default)
        selectString = `
          *,
          fabricator_profiles (name, material),
          seller:profiles!seller_id (name)
        `;
      }

      let query = supabase
        .from('remnant_marketplace_listings')
        .select(selectString)
        .eq('status', 'available');

      if (filters.profileId) {
        query = query.eq('profile_id', filters.profileId);
      }

      if (filters.material) {
        query = query.eq('fabricator_profiles.material', filters.material);
      }

      if (filters.minLength) {
        query = query.gte('length', filters.minLength);
      }

      if (filters.maxLength) {
        query = query.lte('length', filters.maxLength);
      }

      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      // Location-based filtering
      if (filters.city) {
        query = query.eq('city', filters.city);
      }

      if (filters.governorate) {
        query = query.eq('governorate', filters.governorate);
      }

      // Distance-based filtering (would require PostGIS in production)
      if (filters.latitude && filters.longitude && filters.maxDistanceKm) {
        // Simplified: filter by city/governorate if distance filter is provided
        // In production, would use PostGIS ST_DWithin for accurate distance calculation
      }

      if (filters.quality) {
        query = query.eq('quality', filters.quality);
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      // Filter out expired listings
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => this.mapListingFromDb(item));
    } catch (error) {
      console.error('Error searching marketplace listings:', error);
      return [];
    }
  }

  /**
   * Purchase a remnant from marketplace
   */
  async purchaseListing(
    listingId: string,
    buyerId: string
  ): Promise<MarketplaceTransaction> {
    try {
      // Get listing
      const { data: listing, error: listingError } = await supabase
        .from('remnant_marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .eq('status', 'available')
        .single();

      if (listingError || !listing) {
        throw new Error('Listing not found or not available');
      }

      const listingData = listing as any;

      // Check if expired
      if (listingData.expires_at && new Date(listingData.expires_at) < new Date()) {
        throw new Error('Listing has expired');
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await (supabase
        .from('remnant_marketplace_transactions')
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: listingData.seller_id,
          price: listingData.price,
          currency: listingData.currency,
          status: 'pending',
        } as any) as any)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update listing status
      await (supabase
        .from('remnant_marketplace_listings') as any)
        .update({ status: 'reserved' })
        .eq('id', listingId);

      // Transfer remnant ownership (would need to implement in RemnantManager)
      // await remnantManager.transferRemnant(listing.remnant_id, buyerId);

      return this.mapTransactionFromDb(transaction);
    } catch (error) {
      console.error('Error purchasing listing:', error);
      throw error;
    }
  }

  /**
   * Complete a transaction
   */
  async completeTransaction(transactionId: string): Promise<void> {
    try {
      const { data, error } = await (supabase
        .from('remnant_marketplace_transactions') as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;

      // Update listing status
      if (data) {
        const transactionData = data;
        await (supabase
          .from('remnant_marketplace_listings') as any)
          .update({ status: 'sold' })
          .eq('id', transactionData.listing_id);
      }
    } catch (error) {
      console.error('Error completing transaction:', error);
      throw error;
    }
  }

  /**
   * Get my listings (as seller)
   */
  async getMyListings(sellerId: string): Promise<MarketplaceListing[]> {
    return this.searchListings({ sellerId });
  }

  /**
   * Get my purchases (as buyer)
   */
  async getMyPurchases(buyerId: string): Promise<MarketplaceTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('remnant_marketplace_transactions')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item) => this.mapTransactionFromDb(item));
    } catch (error) {
      console.error('Error getting purchases:', error);
      return [];
    }
  }

  /**
   * Cancel a listing
   */
  async cancelListing(listingId: string, sellerId: string): Promise<void> {
    try {
      // Verify ownership
      const { data: listing, error: checkError } = await supabase
        .from('remnant_marketplace_listings')
        .select('seller_id, status')
        .eq('id', listingId)
        .single();

      if (checkError || !listing) {
        throw new Error('Listing not found');
      }

      const listingData = listing as any;

      if (listingData.seller_id !== sellerId) {
        throw new Error('Not authorized to cancel this listing');
      }

      if (listingData.status !== 'available') {
        throw new Error('Listing cannot be cancelled in current state');
      }

      // Delete listing
      await supabase.from('remnant_marketplace_listings').delete().eq('id', listingId);
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw error;
    }
  }

  /**
   * Map database record to MarketplaceListing
   */
  private mapListingFromDb(data: any): MarketplaceListing {
    return {
      id: data.id,
      remnantId: data.remnant_id,
      sellerId: data.seller_id,
      sellerName: data.profiles?.name,
      profileId: data.profile_id,
      profileName: data.fabricator_profiles?.name,
      length: parseFloat(data.length),
      price: parseFloat(data.price),
      currency: data.currency,
      location: data.location,
      quality: data.quality,
      status: data.status,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      images: data.images || [],
      description: data.description,
    };
  }

  /**
   * Map database record to MarketplaceTransaction
   */
  private mapTransactionFromDb(data: any): MarketplaceTransaction {
    return {
      id: data.id,
      listingId: data.listing_id,
      buyerId: data.buyer_id,
      sellerId: data.seller_id,
      price: parseFloat(data.price),
      currency: data.currency,
      status: data.status,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }
}

// Export singleton instance
export const remnantMarketplace = new RemnantMarketplace();

