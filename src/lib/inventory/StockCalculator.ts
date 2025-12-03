/**
 * Stock Calculator
 * 
 * Calculates real stock quantities from stock_movements table.
 * This provides the authoritative source of truth for inventory levels
 * by summing all recorded movements rather than relying on the stock_quantity field.
 */

import { supabase } from '@/lib/supabase';

/**
 * Calculate current stock for a specific profile from stock movements
 * @param userId - User ID
 * @param profileId - Profile ID
 * @returns Calculated stock quantity in meters
 */
export async function calculateStockFromMovements(
  userId: string,
  profileId: string
): Promise<number> {
  try {
    const db = supabase as any;
    
    const { data, error } = await db.rpc('calculate_stock_from_movements', {
      p_user_id: userId,
      p_profile_id: profileId,
    });

    if (error) {
      console.error('Error calculating stock from movements:', error);
      // Fallback: try direct query if RPC fails
      return await calculateStockDirectly(userId, profileId);
    }

    return parseFloat(data || 0);
  } catch (error) {
    console.error('Error in calculateStockFromMovements:', error);
    return await calculateStockDirectly(userId, profileId);
  }
}

/**
 * Direct calculation of stock from movements (fallback method)
 * Sums all movements: 'in' adds, 'out' subtracts, adjustments use stock_after - stock_before
 */
async function calculateStockDirectly(
  userId: string,
  profileId: string
): Promise<number> {
  try {
    const db = supabase as any;
    
    const { data, error } = await db
      .from('stock_movements')
      .select('movement_type, quantity, stock_before, stock_after')
      .eq('user_id', userId)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error fetching stock movements:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    let stock = 0;
    for (const movement of data) {
      const quantity = parseFloat(movement.quantity || 0);
      
      switch (movement.movement_type) {
        case 'in':
        case 'return':
        case 'transfer':
          stock += quantity;
          break;
        case 'out':
        case 'production':
        case 'remnant_used':
        case 'damage':
        case 'loss':
          stock -= quantity;
          break;
        case 'adjustment':
          // Use the difference between stock_after and stock_before
          const stockBefore = parseFloat(movement.stock_before || 0);
          const stockAfter = parseFloat(movement.stock_after || 0);
          stock += (stockAfter - stockBefore);
          break;
        default:
          // Unknown movement type, skip
          break;
      }
    }

    return Math.max(stock, 0); // Ensure non-negative
  } catch (error) {
    console.error('Error in calculateStockDirectly:', error);
    return 0;
  }
}

/**
 * Sync stock quantities for all profiles of a user
 * Updates fabricator_profiles.stock_quantity with calculated values from movements
 */
export async function syncStockFromMovements(userId: string): Promise<number> {
  try {
    const db = supabase as any;
    
    const { data, error } = await db.rpc('sync_stock_from_movements', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error syncing stock from movements:', error);
      return 0;
    }

    return parseInt(data || 0);
  } catch (error) {
    console.error('Error in syncStockFromMovements:', error);
    return 0;
  }
}

/**
 * Calculate stock for multiple profiles at once
 * @param userId - User ID
 * @param profileIds - Array of profile IDs
 * @returns Map of profileId -> calculated stock
 */
export async function calculateStockForProfiles(
  userId: string,
  profileIds: string[]
): Promise<Map<string, number>> {
  const stockMap = new Map<string, number>();
  
  // Calculate stock for each profile
  await Promise.all(
    profileIds.map(async (profileId) => {
      const stock = await calculateStockFromMovements(userId, profileId);
      stockMap.set(profileId, stock);
    })
  );

  return stockMap;
}

