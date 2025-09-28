// Optimized database queries for better performance

import { supabase } from './supabase';

// Machine queries with optimized indexing
export const machineQueries = {
  // Get machines with pagination and filtering
  async getMachinesPaginated({
    page = 1,
    limit = 12,
    category,
    search,
    sortBy = 'featured',
    sortOrder = 'desc'
  }: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('machines')
      .select(`
        id,
        name,
        description,
        image_url,
        category,
        featured,
        release_date,
        type,
        power_spec,
        air_spec,
        dimensions,
        tags,
        specifications,
        certifications,
        safety_features,
        egyptian_compliance,
        spec_pdf,
        youtube_url,
        model_path
      `)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'featured':
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'name':
        query = query.order('name', { ascending: sortOrder === 'asc' });
        break;
      case 'newest':
        query = query.order('release_date', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }

    return {
      machines: data || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  },

  // Get machine by ID with optimized query
  async getMachineById(id: string) {
    const { data, error } = await supabase
      .from('machines')
      .select(`
        *,
        related_machines:machines!related_machines_machine_id_fkey(
          id,
          name,
          image_url,
          category
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching machine:', error);
      throw error;
    }

    return data;
  },

  // Search machines with full-text search
  async searchMachines(searchTerm: string, limit = 20) {
    const { data, error } = await supabase
      .from('machines')
      .select(`
        id,
        name,
        description,
        image_url,
        category,
        featured,
        type,
        tags
      `)
      .textSearch('search_vector', searchTerm, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit);

    if (error) {
      console.error('Error searching machines:', error);
      throw error;
    }

    return data || [];
  }
};

// Quote queries with optimized joins
export const quoteQueries = {
  // Get quotes with pagination and user filtering
  async getQuotesPaginated({
    userId,
    page = 1,
    limit = 10,
    status
  }: {
    userId?: string;
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('quotes')
      .select(`
        *,
        quote_items:quote_items(
          *,
          machine:machines(
            id,
            name,
            image_url,
            category
          )
        ),
        customer:profiles!quotes_customer_id_fkey(
          id,
          full_name,
          company_name,
          email
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('customer_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }

    return {
      quotes: data || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  },

  // Create quote with optimized transaction
  async createQuote(quoteData: {
    customer_id: string;
    items: Array<{
      machine_id: string;
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
  }) {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_id: quoteData.customer_id,
        status: 'draft',
        notes: quoteData.notes,
        total_amount: quoteData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Error creating quote:', quoteError);
      throw quoteError;
    }

    // Insert quote items
    const quoteItems = quoteData.items.map(item => ({
      quote_id: quote.id,
      machine_id: item.machine_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems);

    if (itemsError) {
      console.error('Error creating quote items:', itemsError);
      throw itemsError;
    }

    return quote;
  }
};

// User queries with optimized profile fetching
export const userQueries = {
  // Get user profile with optimized query
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        quotes:quotes(
          id,
          status,
          total_amount,
          created_at
        ),
        orders:orders(
          id,
          status,
          total_amount,
          created_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  },

  // Update user profile with optimized query
  async updateUserProfile(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  }
};

// Analytics queries for performance monitoring
export const analyticsQueries = {
  // Get performance metrics
  async getPerformanceMetrics() {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }

    return data || [];
  },

  // Record performance metric
  async recordPerformanceMetric(metric: {
    page: string;
    load_time: number;
    user_agent: string;
    timestamp: string;
  }) {
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) {
      console.error('Error recording performance metric:', error);
      throw error;
    }

    return data;
  }
};

// Cache management utilities
export const cacheUtils = {
  // Generate cache key for queries
  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  },

  // Check if data is stale (older than specified minutes)
  isStale(timestamp: string, maxAgeMinutes: number = 5): boolean {
    const now = new Date();
    const dataTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - dataTime.getTime()) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  }
};
