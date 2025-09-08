import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Enhanced Supabase client configuration for e-commerce
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce' as const,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'almona-industrial@2.0.0',
    },
  },
}

// Create Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, supabaseOptions)

// Export types for better TypeScript support
export type { SupabaseClient } from '@supabase/supabase-js'
export type { Database }

// Helper functions for common operations
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const updateUserProfile = async (userId: string, updates: Database['public']['Tables']['profiles']['Update']) => {
  const { data, error } = await supabase
    .from<'profiles', Database['public']['Tables']['profiles']['Row']>('profiles')
    .update(updates as any)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Product helper functions
export const getProducts = async (filters?: {
  category?: string
  search?: string
  limit?: number
  offset?: number
}) => {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.search) {
    query = query.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getProduct = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  
  if (error) throw error
  return data
}

// Categories helper functions
export const getCategories = async (filters?: {
  parentId?: string;
  isActive?: boolean;
}) => {
  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.parentId !== undefined) {
    query = query.eq('parent_id', filters.parentId);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Product variants helper functions
export const getProductVariants = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

// Product reviews helper functions
export const getProductReviews = async (productId: string, filters?: {
  isApproved?: boolean;
  limit?: number;
}) => {
  let query = supabase
    .from('product_reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (filters?.isApproved !== undefined) {
    query = query.eq('is_approved', filters.isApproved);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// ---------------- Warranty Helpers ----------------
// Create a pending warranty registration (customer action before sales confirmation)
export const createWarrantyRegistration = async (payload: {
  machine_serial_number: string
  plan_id?: string | null
  product_id?: string | null
  order_id?: string | null
  duration_months?: number | null
  meta?: Record<string, unknown>
  notes?: string | null
}) => {
  const { data, error } = await supabase
    .from<'warranty_registrations', Database['public']['Tables']['warranty_registrations']['Row']>('warranty_registrations')
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Confirm sale + activate warranty (calls Postgres function)
export const confirmWarrantySale = async (warrantyId: string, serial: string, durationOverride?: number) => {
  const { data, error } = await supabase
    .rpc<'confirm_warranty_sale'>('confirm_warranty_sale', { _warranty_id: warrantyId, _serial: serial, _duration_override: durationOverride ?? null } as any);
  if (error) throw error;
  return data;
};

// Validate active warranty by machine serial (public/customer)
export interface ValidatedWarranty {
  warranty_code: string
  machine_serial_number: string
  status: 'pending' | 'active' | 'expired' | 'void'
  warranty_start_date: string | null
  warranty_end_date: string | null
  days_remaining: number
  plan_name: string | null
  coverage: Record<string, unknown> | null
}

export const validateWarranty = async (serial: string): Promise<ValidatedWarranty[]> => {
  const { data, error } = await supabase
    .rpc<'validate_warranty'>('validate_warranty', { _serial: serial } as any);
  if (error) throw error;
  return data as ValidatedWarranty[];
};

// List current user warranties
export const listMyWarranties = async () => {
  const { data, error } = await supabase
    .from<'warranty_registrations', Database['public']['Tables']['warranty_registrations']['Row']>('warranty_registrations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Admin/Sales: list warranties with optional filters
export const listWarranties = async (filters?: { status?: string; serial?: string; customer_id?: string }) => {
  let query = supabase.from<'warranty_registrations', Database['public']['Tables']['warranty_registrations']['Row']>('warranty_registrations').select('*');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.serial) query = query.ilike('machine_serial_number', `%${filters.serial}%`);
  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createProductReview = async (reviewData: Database['public']['Tables']['product_reviews']['Insert']) => {
  const { data, error } = await supabase
    .from('product_reviews')
    .insert(reviewData)
    .select()
    .single();

  if (error) throw error;
  return data;
};


export const searchProducts = async (
  searchTerm: string,
  lang: 'ar' | 'en' = 'ar',
  filters?: {
    category?: string
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }
) => {
  const { data, error } = await supabase.rpc('search_products', {
    search_term: searchTerm,
    lang,
    category_filter: filters?.category,
    min_price: filters?.minPrice,
    max_price: filters?.maxPrice,
    limit_count: filters?.limit || 20,
    offset_count: filters?.offset || 0,
  })
  
  if (error) throw error
  return data
}

export const getProductRecommendations = async (
  userId: string,
  productId?: string,
  limit: number = 10
) => {
  const { data, error } = await supabase.rpc('get_product_recommendations', {
    user_id_param: userId,
    product_id_param: productId,
    limit_count: limit,
  })
  
  if (error) throw error
  return data
}

// Quote helper functions
export const createQuote = async (quoteData: Database['public']['Tables']['quotes']['Insert']) => {
  const { data, error } = await supabase
    .from('quotes')
    .insert(quoteData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserQuotes = async (userId: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items (
        *,
        products (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const updateQuoteStatus = async (
  quoteId: string,
  status: Database['public']['Tables']['quotes']['Row']['status']
) => {
  const { data, error } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Order helper functions
export const createOrder = async (orderData: Database['public']['Tables']['orders']['Insert']) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const updateOrderStatus = async (
  orderId: string,
  status: Database['public']['Tables']['orders']['Row']['status']
) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Wishlist helper functions
export const addToWishlist = async (userId: string, productId: string) => {
  const { data, error } = await supabase
    .from('wishlists')
    .upsert({ user_id: userId, product_id: productId })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const removeFromWishlist = async (userId: string, productId: string) => {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  
  if (error) throw error
}

export const getUserWishlist = async (userId: string) => {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      products (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Recently viewed helper functions
export const addToRecentlyViewed = async (userId: string, productId: string) => {
  const { data, error } = await supabase
    .from('recently_viewed')
    .upsert(
      { user_id: userId, product_id: productId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' }
    )
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserRecentlyViewed = async (userId: string, limit: number = 10) => {
  const { data, error } = await supabase
    .from('recently_viewed')
    .select(`
      *,
      products (*)
    `)
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

// Notification helper functions
export const getUserNotifications = async (userId: string, unreadOnly: boolean = false) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Real-time subscriptions
interface NotificationPayload {
  id: string
  user_id: string | null
  is_read: boolean
}
export const subscribeToNotifications = (userId: string, callback: (payload: NotificationPayload) => void) => {
  return supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

// Pricing helper functions
export const calculateTieredPrice = (basePrice: number, quantity: number): number => {
  // Define pricing tiers
  const tiers = [
    { min: 1, max: 4, discount: 0 }, // 0% discount
    { min: 5, max: 9, discount: 0.05 }, // 5% discount
    { min: 10, max: 24, discount: 0.1 }, // 10% discount
    { min: 25, max: null, discount: 0.15 }, // 15% discount for 25+
  ]

  const applicableTier = tiers.find(tier =>
    quantity >= tier.min && (tier.max === null || quantity <= tier.max)
  )

  const discount = applicableTier ? applicableTier.discount : 0
  return basePrice * (1 - discount)
}

// Storage helper functions
export const uploadFileWithProgress = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean },
  onProgress?: (progress: number) => void
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      ...options,
      onUploadProgress: (progress) => {
        if (onProgress) {
          const progressPercent = (progress.loaded / progress.total) * 100;
          onProgress(progressPercent);
        }
      },
    });

  if (error) throw error;
  return data;
};


export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

export const deleteFile = async (bucket: string, paths: string[]) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(paths)
  
  if (error) throw error
  return data
}