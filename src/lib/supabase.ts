import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

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
    .from('profiles')
    .update(updates)
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
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options)
  
  if (error) throw error
  return data
}

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
