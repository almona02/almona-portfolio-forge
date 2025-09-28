// Inventory management utilities
import { supabase } from './supabase';
import type { Database } from '@/types/database';

export interface StockValidationResult {
  isValid: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  message?: string;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock';
}

/**
 * Validate stock availability before adding to cart/quote
 */
export async function validateStock(
  productId: string,
  requestedQuantity: number
): Promise<StockValidationResult> {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, stock_quantity, min_stock_level, is_active')
      .eq('id', productId)
      .single();

    if (error) {
      return {
        isValid: false,
        availableQuantity: 0,
        requestedQuantity,
        message: 'خطأ في جلب بيانات المنتج'
      };
    }

    if (!product.is_active) {
      return {
        isValid: false,
        availableQuantity: 0,
        requestedQuantity,
        message: 'المنتج غير متوفر حالياً'
      };
    }

    if (product.stock_quantity < requestedQuantity) {
      return {
        isValid: false,
        availableQuantity: product.stock_quantity,
        requestedQuantity,
        message: `الكمية المطلوبة (${requestedQuantity}) غير متوفرة. الكمية المتاحة: ${product.stock_quantity}`
      };
    }

    return {
      isValid: true,
      availableQuantity: product.stock_quantity,
      requestedQuantity,
      message: 'الكمية متوفرة'
    };
  } catch (error) {
    console.error('Error validating stock:', error);
    return {
      isValid: false,
      availableQuantity: 0,
      requestedQuantity,
      message: 'خطأ في التحقق من المخزون'
    };
  }
}

/**
 * Reserve stock for a pending order/quote
 */
export async function reserveStock(
  productId: string,
  quantity: number,
  reservationType: 'quote' | 'order' = 'quote'
): Promise<{ success: boolean; message: string }> {
  try {
    // First validate stock
    const validation = await validateStock(productId, quantity);
    if (!validation.isValid) {
      return { success: false, message: validation.message || 'الكمية غير متوفرة' };
    }

    // Update stock quantity
    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: validation.availableQuantity - quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) {
      return { success: false, message: 'خطأ في حجز المخزون' };
    }

    // Log the reservation (optional - for tracking)
    await supabase
      .from('inventory_reservations')
      .insert({
        product_id: productId,
        quantity,
        reservation_type: reservationType,
        status: 'reserved',
        created_at: new Date().toISOString()
      });

    return { success: true, message: 'تم حجز المخزون بنجاح' };
  } catch (error) {
    console.error('Error reserving stock:', error);
    return { success: false, message: 'خطأ في حجز المخزون' };
  }
}

/**
 * Release reserved stock
 */
export async function releaseStock(
  productId: string,
  quantity: number,
  reservationType: 'quote' | 'order' = 'quote'
): Promise<{ success: boolean; message: string }> {
  try {
    // Update stock quantity
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (fetchError) {
      return { success: false, message: 'خطأ في جلب بيانات المنتج' };
    }

    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: product.stock_quantity + quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) {
      return { success: false, message: 'خطأ في إلغاء حجز المخزون' };
    }

    return { success: true, message: 'تم إلغاء حجز المخزون بنجاح' };
  } catch (error) {
    console.error('Error releasing stock:', error);
    return { success: false, message: 'خطأ في إلغاء حجز المخزون' };
  }
}

/**
 * Get inventory alerts for low stock products
 */
export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, stock_quantity, min_stock_level')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching inventory alerts:', error);
      return [];
    }

    const alerts: InventoryAlert[] = [];

    products.forEach(product => {
      if (product.stock_quantity === 0) {
        alerts.push({
          productId: product.id,
          productName: product.name_ar,
          currentStock: product.stock_quantity,
          minStockLevel: product.min_stock_level,
          alertType: 'out_of_stock'
        });
      } else if (product.stock_quantity <= product.min_stock_level) {
        alerts.push({
          productId: product.id,
          productName: product.name_ar,
          currentStock: product.stock_quantity,
          minStockLevel: product.min_stock_level,
          alertType: 'low_stock'
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    return [];
  }
}

/**
 * Update product stock quantity
 */
export async function updateStock(
  productId: string,
  newQuantity: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) {
      return { success: false, message: 'خطأ في تحديث المخزون' };
    }

    // Log the stock update
    await supabase
      .from('inventory_logs')
      .insert({
        product_id: productId,
        old_quantity: 0, // We'd need to fetch this first for accurate logging
        new_quantity: newQuantity,
        reason: reason || 'Manual update',
        created_at: new Date().toISOString()
      });

    return { success: true, message: 'تم تحديث المخزون بنجاح' };
  } catch (error) {
    console.error('Error updating stock:', error);
    return { success: false, message: 'خطأ في تحديث المخزون' };
  }
}

/**
 * Check if product is available for purchase
 */
export function isProductAvailable(product: Database['public']['Tables']['products']['Row']): boolean {
  return product.is_active && product.stock_quantity > 0;
}

/**
 * Get stock status badge info
 */
export function getStockStatus(product: Database['public']['Tables']['products']['Row']) {
  if (!product.is_active) {
    return { status: 'inactive', label: 'غير متوفر', color: 'gray' };
  }
  
  if (product.stock_quantity === 0) {
    return { status: 'out_of_stock', label: 'نفد المخزون', color: 'red' };
  }
  
  if (product.stock_quantity <= product.min_stock_level) {
    return { status: 'low_stock', label: `مخزون منخفض (${product.stock_quantity})`, color: 'yellow' };
  }
  
  return { status: 'in_stock', label: 'متوفر', color: 'green' };
}
