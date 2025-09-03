// Database type definitions for Almona Industrial E-commerce Platform

export interface Address {
  street: string
  city: string
  postal_code?: string
  country: string
  governorate?: string
}

export interface UserPreferences {
  language: 'ar' | 'en'
  currency: string
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
  theme: 'light' | 'dark' | 'auto'
}

export interface ProductDimensions {
  length: number
  width: number
  height: number
  unit: 'mm' | 'cm' | 'm'
}

export interface ProductSpecifications {
  [key: string]: string | number | boolean
}

export interface ProductFeatures {
  [key: string]: string | boolean
}

export interface ContactInfo {
  name: string
  email: string
  phone: string
  company?: string
  position?: string
}

export interface ShippingAddress {
  name: string
  company?: string
  street: string
  city: string
  governorate: string
  postal_code?: string
  country: string
  phone: string
}

export type UserRole = 'customer' | 'admin' | 'sales_rep' | 'technician'
export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type ProductCategory = 'machine' | 'spare_part' | 'raw_material' | 'tool' | 'accessory'
export type QuoteStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type SectorType = 'ALUMINIUM' | 'UPVC' | 'STEEL' | 'GLASS' | 'GENERAL'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          phone: string | null
          sector: SectorType | null
          workshop_location: string | null
          governorate: string | null
          address: Address | null
          tax_number: string | null
          commercial_register: string | null
          role: UserRole
          is_verified: boolean
          preferences: UserPreferences
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          phone?: string | null
          sector?: SectorType | null
          workshop_location?: string | null
          governorate?: string | null
          address?: Address | null
          tax_number?: string | null
          commercial_register?: string | null
          role?: UserRole
          is_verified?: boolean
          preferences?: UserPreferences
        }
        Update: {
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          phone?: string | null
          sector?: SectorType | null
          workshop_location?: string | null
          governorate?: string | null
          address?: Address | null
          tax_number?: string | null
          commercial_register?: string | null
          role?: UserRole
          is_verified?: boolean
          preferences?: UserPreferences
          updated_at?: string
        }
      }
      service_tickets: {
        Row: {
          id: string
          ticket_number: string
          user_id: string
          title: string
          description: string | null
          type: 'general' | 'technical' | 'billing' | 'sales' | 'spare_parts' | 'warranty' | 'complaint' | 'installation' | 'maintenance'
          priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
          status: 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled'
          related_quote_id: string | null
          related_order_id: string | null
          related_product_id: string | null
          assigned_to: string | null
          assigned_at: string | null
          assigned_by: string | null
          sla_response_due: string | null
          sla_resolution_due: string | null
          first_response_at: string | null
          sla_breached: boolean
          escalated: boolean
          escalated_at: string | null
          contact_phone: string | null
          contact_email: string | null
          preferred_contact_method: string
          site_location: string | null
          machine_serial_number: string | null
          resolution_summary: string | null
          customer_satisfaction_rating: number | null
          customer_feedback: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          closed_at: string | null
        }
        Insert: {
          ticket_number?: string
          user_id: string
          title: string
          description?: string | null
          type?: 'general' | 'technical' | 'billing' | 'sales' | 'spare_parts' | 'warranty' | 'complaint' | 'installation' | 'maintenance'
          priority?: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
          status?: 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled'
          related_quote_id?: string | null
          related_order_id?: string | null
          related_product_id?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          preferred_contact_method?: string
          site_location?: string | null
          machine_serial_number?: string | null
          resolution_summary?: string | null
          customer_satisfaction_rating?: number | null
          customer_feedback?: string | null
        }
        Update: {
          ticket_number?: string
          title?: string
          description?: string | null
          type?: 'general' | 'technical' | 'billing' | 'sales' | 'spare_parts' | 'warranty' | 'complaint' | 'installation' | 'maintenance'
          priority?: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
          status?: 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled'
          related_quote_id?: string | null
          related_order_id?: string | null
          related_product_id?: string | null
          assigned_to?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          sla_response_due?: string | null
          sla_resolution_due?: string | null
          first_response_at?: string | null
          sla_breached?: boolean
          escalated?: boolean
          escalated_at?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          preferred_contact_method?: string
          site_location?: string | null
          machine_serial_number?: string | null
          resolution_summary?: string | null
          customer_satisfaction_rating?: number | null
          customer_feedback?: string | null
          updated_at?: string
          resolved_at?: string | null
          closed_at?: string | null
        }
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          author_id: string
          message: string
          message_type: 'message' | 'spare_parts_request' | 'status_update' | 'assignment' | 'resolution' | 'internal_note'
          is_internal_note: boolean
          attachments: Array<{
            filename: string
            url: string
            size: number
            type: string
          }>
          spare_parts_details: {
            parts: Array<{
              sku: string
              name: string
              quantity: number
              urgency: string
            }>
            estimated_cost?: number
            delivery_timeline?: string
            quote_id?: string
          } | null
          status_change: {
            from: string
            to: string
            reason: string
          } | null
          time_spent_minutes: number | null
          created_at: string
          edited_at: string | null
        }
        Insert: {
          ticket_id: string
          author_id: string
          message: string
          message_type?: 'message' | 'spare_parts_request' | 'status_update' | 'assignment' | 'resolution' | 'internal_note'
          is_internal_note?: boolean
          attachments?: Array<{
            filename: string
            url: string
            size: number
            type: string
          }>
          spare_parts_details?: {
            parts: Array<{
              sku: string
              name: string
              quantity: number
              urgency: string
            }>
            estimated_cost?: number
            delivery_timeline?: string
            quote_id?: string
          } | null
          status_change?: {
            from: string
            to: string
            reason: string
          } | null
          time_spent_minutes?: number | null
        }
        Update: {
          message?: string
          message_type?: 'message' | 'spare_parts_request' | 'status_update' | 'assignment' | 'resolution' | 'internal_note'
          is_internal_note?: boolean
          attachments?: Array<{
            filename: string
            url: string
            size: number
            type: string
          }>
          spare_parts_details?: {
            parts: Array<{
              sku: string
              name: string
              quantity: number
              urgency: string
            }>
            estimated_cost?: number
            delivery_timeline?: string
            quote_id?: string
          } | null
          status_change?: {
            from: string
            to: string
            reason: string
          } | null
          time_spent_minutes?: number | null
          edited_at?: string | null
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name_ar: string
          name_en: string
          description_ar: string | null
          description_en: string | null
          short_description_ar: string | null
          short_description_en: string | null
          category: ProductCategory
          subcategory: string | null
          brand: string | null
          model: string | null
          price: number | null
          cost_price: number | null
          currency: string
          stock_quantity: number
          min_stock_level: number
          max_stock_level: number
          weight_kg: number | null
          dimensions: ProductDimensions | null
          specifications: ProductSpecifications
          features: ProductFeatures
          compatible_machines: string[] | null
          image_urls: string[] | null
          video_urls: string[] | null
          document_urls: string[] | null
          model_3d_url: string | null
          meta_title_ar: string | null
          meta_title_en: string | null
          meta_description_ar: string | null
          meta_description_en: string | null
          keywords: string[] | null
          is_active: boolean
          is_featured: boolean
          is_new: boolean
          is_on_sale: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          sku: string
          name_ar: string
          name_en: string
          description_ar?: string | null
          description_en?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          category: ProductCategory
          subcategory?: string | null
          brand?: string | null
          model?: string | null
          price?: number | null
          cost_price?: number | null
          currency?: string
          stock_quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          weight_kg?: number | null
          dimensions?: ProductDimensions | null
          specifications?: ProductSpecifications
          features?: ProductFeatures
          compatible_machines?: string[] | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          document_urls?: string[] | null
          model_3d_url?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          keywords?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_on_sale?: boolean
        }
        Update: {
          sku?: string
          name_ar?: string
          name_en?: string
          description_ar?: string | null
          description_en?: string | null
          short_description_ar?: string | null
          short_description_en?: string | null
          category?: ProductCategory
          subcategory?: string | null
          brand?: string | null
          model?: string | null
          price?: number | null
          cost_price?: number | null
          currency?: string
          stock_quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          weight_kg?: number | null
          dimensions?: ProductDimensions | null
          specifications?: ProductSpecifications
          features?: ProductFeatures
          compatible_machines?: string[] | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          document_urls?: string[] | null
          model_3d_url?: string | null
          meta_title_ar?: string | null
          meta_title_en?: string | null
          meta_description_ar?: string | null
          meta_description_en?: string | null
          keywords?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_on_sale?: boolean
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          quote_number: string
          user_id: string
          status: QuoteStatus
          title: string | null
          description: string | null
          notes: string | null
          internal_notes: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          shipping_cost: number
          total_amount: number
          currency: string
          valid_until: string | null
          contact_info: ContactInfo | null
          shipping_address: ShippingAddress | null
          delivery_timeline: string | null
          payment_terms: string | null
          created_at: string
          updated_at: string
          sent_at: string | null
          accepted_at: string | null
        }
        Insert: {
          user_id: string
          status?: QuoteStatus
          title?: string | null
          description?: string | null
          notes?: string | null
          internal_notes?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          shipping_cost?: number
          total_amount?: number
          currency?: string
          valid_until?: string | null
          contact_info?: ContactInfo | null
          shipping_address?: ShippingAddress | null
          delivery_timeline?: string | null
          payment_terms?: string | null
        }
        Update: {
          status?: QuoteStatus
          title?: string | null
          description?: string | null
          notes?: string | null
          internal_notes?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          shipping_cost?: number
          total_amount?: number
          currency?: string
          valid_until?: string | null
          contact_info?: ContactInfo | null
          shipping_address?: ShippingAddress | null
          delivery_timeline?: string | null
          payment_terms?: string | null
          updated_at?: string
          sent_at?: string | null
          accepted_at?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          quote_id: string | null
          status: OrderStatus
          subtotal: number
          tax_amount: number
          discount_amount: number
          shipping_cost: number
          total_amount: number
          currency: string
          billing_address: ShippingAddress
          shipping_address: ShippingAddress
          payment_method: string | null
          payment_status: string
          payment_reference: string | null
          shipping_method: string | null
          tracking_number: string | null
          estimated_delivery: string | null
          customer_notes: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
          shipped_at: string | null
          delivered_at: string | null
        }
        Insert: {
          user_id: string
          quote_id?: string | null
          status?: OrderStatus
          subtotal: number
          tax_amount?: number
          discount_amount?: number
          shipping_cost?: number
          total_amount: number
          currency?: string
          billing_address: ShippingAddress
          shipping_address: ShippingAddress
          payment_method?: string | null
          payment_status?: string
          payment_reference?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          estimated_delivery?: string | null
          customer_notes?: string | null
          admin_notes?: string | null
        }
        Update: {
          status?: OrderStatus
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          shipping_cost?: number
          total_amount?: number
          currency?: string
          billing_address?: ShippingAddress
          shipping_address?: ShippingAddress
          payment_method?: string | null
          payment_status?: string
          payment_reference?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          estimated_delivery?: string | null
          customer_notes?: string | null
          admin_notes?: string | null
          updated_at?: string
          shipped_at?: string | null
          delivered_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_products: {
        Args: {
          search_term: string
          lang?: string
          category_filter?: string
          min_price?: number
          max_price?: number
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          sku: string
          name_ar: string
          name_en: string
          description_ar: string
          description_en: string
          price: number
          image_urls: string[]
          category: ProductCategory
          is_featured: boolean
          rank: number
        }[]
      }
      get_product_recommendations: {
        Args: {
          user_id_param: string
          product_id_param?: string
          limit_count?: number
        }
        Returns: {
          id: string
          sku: string
          name_ar: string
          name_en: string
          price: number
          image_urls: string[]
          category: ProductCategory
          is_featured: boolean
        }[]
      }
    }
    Enums: {
      user_role: UserRole
      order_status: OrderStatus
      product_category: ProductCategory
      quote_status: QuoteStatus
      sector_type: SectorType
    }
  }
}
