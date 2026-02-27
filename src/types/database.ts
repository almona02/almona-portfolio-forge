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

export type UserRole = 'customer' | 'admin' | 'sales_rep' | 'technician' | 'support'
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
          digital_twin_code?: string | null
          category?: string | null
          machine_model?: string | null
          user_id: string
          title: string
          description: string | null
          type: 'general' | 'technical' | 'billing' | 'sales' | 'spare_parts' | 'warranty' | 'complaint' | 'installation' | 'maintenance'
          priority: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
          status: 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled'
          source: string | null
          maintenance_type: string | null
          context: Record<string, unknown> | null
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
          source?: string | null
          maintenance_type?: string | null
          context?: Record<string, unknown> | null
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
          machine_model?: string | null
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
          source?: string | null
          maintenance_type?: string | null
          context?: Record<string, unknown> | null
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
      categories: {
        Row: {
          id: string
          name_ar: string
          name_en: string
          description_ar: string | null
            description_en: string | null
          slug: string
          parent_id: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          name_ar: string
          name_en: string
          description_ar?: string | null
          description_en?: string | null
          slug: string
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          name_ar?: string
          name_en?: string
          description_ar?: string | null
          description_en?: string | null
          slug?: string
          parent_id?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
        }
      }
      product_variants: {
        Row: {
          id: string
          product_id: string | null
          variant_name_ar: string
          variant_name_en: string
          sku: string
          price_adjustment: number | null
          specifications: Record<string, unknown>
          image_urls: string[] | null
          stock_quantity: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          product_id?: string | null
          variant_name_ar: string
          variant_name_en: string
          sku: string
          price_adjustment?: number | null
          specifications?: Record<string, unknown>
          image_urls?: string[] | null
          stock_quantity?: number
          is_active?: boolean
        }
        Update: {
          product_id?: string | null
          variant_name_ar?: string
          variant_name_en?: string
          sku?: string
          price_adjustment?: number | null
          specifications?: Record<string, unknown>
          image_urls?: string[] | null
          stock_quantity?: number
          is_active?: boolean
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string | null
          product_id: string | null
          variant_id: string | null
          product_name_ar: string
          product_name_en: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price: number
          configurations: Record<string, unknown>
          specifications: Record<string, unknown>
          notes: string | null
          created_at: string
        }
        Insert: {
          quote_id?: string | null
          product_id?: string | null
          variant_id?: string | null
          product_name_ar: string
          product_name_en: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price: number
          configurations?: Record<string, unknown>
          specifications?: Record<string, unknown>
          notes?: string | null
        }
        Update: {
          quote_id?: string | null
          product_id?: string | null
          variant_id?: string | null
          product_name_ar?: string
          product_name_en?: string
          product_sku?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          configurations?: Record<string, unknown>
          specifications?: Record<string, unknown>
          notes?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          product_id: string | null
          variant_id: string | null
          product_name_ar: string
          product_name_en: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price: number
          configurations: Record<string, unknown>
          created_at: string
        }
        Insert: {
          order_id?: string | null
          product_id?: string | null
          variant_id?: string | null
          product_name_ar: string
          product_name_en: string
          product_sku: string
          quantity: number
          unit_price: number
          total_price: number
          configurations?: Record<string, unknown>
        }
        Update: {
          order_id?: string | null
          product_id?: string | null
          variant_id?: string | null
          product_name_ar?: string
          product_name_en?: string
          product_sku?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          configurations?: Record<string, unknown>
        }
      }
      pricing_tiers: {
        Row: {
          id: string
          product_id: string | null
          min_quantity: number
          max_quantity: number | null
          discount_percentage: number | null
          fixed_price: number | null
          created_at: string
        }
        Insert: {
          product_id?: string | null
          min_quantity: number
          max_quantity?: number | null
          discount_percentage?: number | null
          fixed_price?: number | null
        }
        Update: {
          product_id?: string | null
          min_quantity?: number
          max_quantity?: number | null
          discount_percentage?: number | null
          fixed_price?: number | null
        }
      }
      wishlists: {
        Row: {
          id: string
          user_id: string | null
          product_id: string | null
          created_at: string
        }
        Insert: {
          user_id?: string | null
          product_id?: string | null
        }
        Update: {
          user_id?: string | null
          product_id?: string | null
        }
      }
      recently_viewed: {
        Row: {
          id: string
          user_id: string | null
          product_id: string | null
          viewed_at: string
        }
        Insert: {
          user_id?: string | null
          product_id?: string | null
          viewed_at?: string
        }
        Update: {
          user_id?: string | null
          product_id?: string | null
          viewed_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          title_ar: string
          title_en: string
          message_ar: string
          message_en: string
          type: string
          reference_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          user_id?: string | null
          title_ar: string
          title_en: string
          message_ar: string
          message_en: string
          type: string
          reference_id?: string | null
          is_read?: boolean
        }
        Update: {
          user_id?: string | null
          title_ar?: string
          title_en?: string
          message_ar?: string
          message_en?: string
          type?: string
          reference_id?: string | null
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      training_enrollments: {
        Row: {
          id: string
          user_id: string
          training_id: string
          status: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          user_id: string
          training_id: string
          status?: string | null
          metadata?: Record<string, unknown> | null
        }
        Update: {
          status?: string | null
          metadata?: Record<string, unknown> | null
        }
      }
      warranty_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          default_duration_months: number
          coverage: Record<string, unknown>
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          default_duration_months: number
          coverage?: Record<string, unknown>
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          default_duration_months?: number
          coverage?: Record<string, unknown>
          is_active?: boolean
          updated_at?: string
        }
      }
      warranty_registrations: {
        Row: {
          id: string
          warranty_code: string
          plan_id: string | null
          product_id: string | null
          order_id: string | null
          machine_serial_number: string
          customer_id: string
          sale_confirmed: boolean
          sale_confirmed_at: string | null
          sale_confirmed_by: string | null
          warranty_start_date: string | null
          warranty_end_date: string | null
          duration_months: number | null
          status: 'pending' | 'active' | 'expired' | 'void'
          meta: Record<string, unknown>
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          plan_id?: string | null
          product_id?: string | null
          order_id?: string | null
          machine_serial_number: string
          customer_id: string
          sale_confirmed?: boolean
          duration_months?: number | null
          status?: 'pending' | 'active' | 'expired' | 'void'
          meta?: Record<string, unknown>
          notes?: string | null
        }
        Update: {
          plan_id?: string | null
          product_id?: string | null
          order_id?: string | null
          machine_serial_number?: string
          sale_confirmed?: boolean
          sale_confirmed_at?: string | null
          sale_confirmed_by?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          duration_months?: number | null
          status?: 'pending' | 'active' | 'expired' | 'void'
          meta?: Record<string, unknown>
          notes?: string | null
          updated_at?: string
        }
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          title: string | null
          review_text: string | null
          is_verified_purchase: boolean
          is_approved: boolean
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          product_id: string
          user_id: string
          rating: number
          title?: string | null
          review_text?: string | null
          is_verified_purchase?: boolean
          is_approved?: boolean
        }
        Update: {
          rating?: number
          title?: string | null
          review_text?: string | null
          is_verified_purchase?: boolean
          is_approved?: boolean
          helpful_count?: number
          updated_at?: string
        }
      }
      report_schedules: {
        Row: {
          id: string
          template_id: string
          name: string
          frequency: string
          day_of_week: number | null
          day_of_month: number | null
          time: string
          recipients: string[]
          enabled: boolean
          last_run_at: string | null
          next_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          frequency: string
          day_of_week?: number | null
          day_of_month?: number | null
          time: string
          recipients: string[]
          enabled?: boolean
          next_run_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          frequency?: string
          day_of_week?: number | null
          day_of_month?: number | null
          time?: string
          recipients?: string[]
          enabled?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          updated_at?: string
        }
      }
      fabricator_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          material: string
          width: number
          height: number | null
          thickness: number | null
          specifications: Record<string, unknown> | null
          thumbnail_url: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          material: string
          width: number
          height?: number | null
          thickness?: number | null
          specifications?: Record<string, unknown> | null
          thumbnail_url?: string | null
        }
        Update: {
          name?: string
          material?: string
          width?: number
          height?: number | null
          thickness?: number | null
          specifications?: Record<string, unknown> | null
          thumbnail_url?: string | null
          updated_at?: string
        }
      }
      fabricator_projects: {
        Row: {
          id: string
          owner_user_id: string
          project_code: string
          project_name: string
          client_name: string
          site_name: string | null
          currency: string
          region: string
          system_pack_id: string
          status: string
          meta: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          project_code: string
          project_name: string
          client_name: string
          site_name?: string | null
          currency?: string
          region?: string
          system_pack_id: string
          status?: string
          meta?: Record<string, unknown> | null
        }
        Update: {
          project_code?: string
          project_name?: string
          client_name?: string
          site_name?: string | null
          currency?: string
          region?: string
          system_pack_id?: string
          status?: string
          meta?: Record<string, unknown> | null
          updated_at?: string
        }
      }
      fabricator_positions: {
        Row: {
          id: string
          project_id: string
          owner_user_id: string
          order_number: string
          pos_number: string
          type: string
          overall_width_mm: number
          overall_height_mm: number
          color: string
          glazing: Record<string, unknown> | null
          system_pack_id: string | null
          status: string
          quantity: number
          position_meta: Record<string, unknown> | null
          optimization: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          owner_user_id: string
          order_number: string
          pos_number: string
          type: string
          overall_width_mm: number
          overall_height_mm: number
          color: string
          glazing?: Record<string, unknown> | null
          system_pack_id?: string | null
          status?: string
          quantity?: number
          position_meta?: Record<string, unknown> | null
          optimization?: Record<string, unknown> | null
        }
        Update: {
          project_id?: string
          order_number?: string
          pos_number?: string
          type?: string
          overall_width_mm?: number
          overall_height_mm?: number
          color?: string
          glazing?: Record<string, unknown> | null
          system_pack_id?: string | null
          status?: string
          quantity?: number
          position_meta?: Record<string, unknown> | null
          optimization?: Record<string, unknown> | null
          updated_at?: string
        }
      }
      fabricator_projects_v2: {
        Row: {
          id: string
          owner_user_id: string
          project_code: string
          project_name: string
          client_name: string
          site_name: string | null
          currency: string
          region: string
          system_pack_id: string
          status: string
          meta: Record<string, unknown> | null
          tier: string
          deterministic: boolean
          constitutional_hash: string | null
          audit_trail: unknown
          last_validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          project_code: string
          project_name: string
          client_name: string
          site_name?: string | null
          currency?: string
          region?: string
          system_pack_id: string
          status?: string
          meta?: Record<string, unknown> | null
          tier?: string
          deterministic?: boolean
          constitutional_hash?: string | null
          audit_trail?: unknown
          last_validated_at?: string | null
        }
        Update: {
          project_code?: string
          project_name?: string
          client_name?: string
          site_name?: string | null
          currency?: string
          region?: string
          system_pack_id?: string
          status?: string
          meta?: Record<string, unknown> | null
          tier?: string
          deterministic?: boolean
          constitutional_hash?: string | null
          audit_trail?: unknown
          last_validated_at?: string | null
          updated_at?: string
        }
      }
      fabricator_positions_v2: {
        Row: {
          id: string
          project_id: string | null
          owner_user_id: string
          order_number: string | null
          pos_number: string | null
          type: string | null
          overall_width_mm: number | null
          overall_height_mm: number | null
          color: string | null
          glazing: Record<string, unknown> | null
          system_pack_id: string | null
          status: string
          quantity: number
          position_meta: Record<string, unknown> | null
          meta: Record<string, unknown> | null
          optimization: Record<string, unknown> | null
          grid: Record<string, unknown> | null
          components: unknown
          hardware: Record<string, unknown> | null
          selected_preset: string | null
          window_unit: Record<string, unknown> | null
          tier: string
          deterministic: boolean
          constitutional_hash: string | null
          audit_trail: unknown
          last_validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          owner_user_id: string
          order_number?: string | null
          pos_number?: string | null
          type?: string | null
          overall_width_mm?: number | null
          overall_height_mm?: number | null
          color?: string | null
          glazing?: Record<string, unknown> | null
          system_pack_id?: string | null
          status?: string
          quantity?: number
          position_meta?: Record<string, unknown> | null
          meta?: Record<string, unknown> | null
          optimization?: Record<string, unknown> | null
          grid?: Record<string, unknown> | null
          components?: unknown
          hardware?: Record<string, unknown> | null
          selected_preset?: string | null
          window_unit?: Record<string, unknown> | null
          tier?: string
          deterministic?: boolean
          constitutional_hash?: string | null
          audit_trail?: unknown
          last_validated_at?: string | null
        }
        Update: {
          project_id?: string | null
          order_number?: string | null
          pos_number?: string | null
          type?: string | null
          overall_width_mm?: number | null
          overall_height_mm?: number | null
          color?: string | null
          glazing?: Record<string, unknown> | null
          system_pack_id?: string | null
          status?: string
          quantity?: number
          position_meta?: Record<string, unknown> | null
          meta?: Record<string, unknown> | null
          optimization?: Record<string, unknown> | null
          grid?: Record<string, unknown> | null
          components?: unknown
          hardware?: Record<string, unknown> | null
          selected_preset?: string | null
          window_unit?: Record<string, unknown> | null
          tier?: string
          deterministic?: boolean
          constitutional_hash?: string | null
          audit_trail?: unknown
          last_validated_at?: string | null
          updated_at?: string
        }
      }
      fabricator_customers: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          sector: SectorType | null
          billing_info: Record<string, unknown> | null
          shipping_info: Record<string, unknown> | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          sector?: SectorType | null
          billing_info?: Record<string, unknown> | null
          shipping_info?: Record<string, unknown> | null
          notes?: string | null
        }
        Update: {
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          sector?: SectorType | null
          billing_info?: Record<string, unknown> | null
          shipping_info?: Record<string, unknown> | null
          notes?: string | null
          updated_at?: string
        }
      }
      fabricator_team_members: {
        Row: {
          id: string
          owner_user_id: string
          member_profile_id: string
          role: string
          is_active: boolean
          permissions: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          member_profile_id: string
          role: string
          is_active?: boolean
          permissions?: Record<string, unknown> | null
        }
        Update: {
          role?: string
          is_active?: boolean
          permissions?: Record<string, unknown> | null
          updated_at?: string
        }
      }
      fabricator_project_members: {
        Row: {
          id: string
          project_id: string
          member_profile_id: string
          role: string
          permissions: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          member_profile_id: string
          role: string
          permissions?: Record<string, unknown> | null
        }
        Update: {
          role?: string
          permissions?: Record<string, unknown> | null
          updated_at?: string
        }
      }
      fabricator_system_packs: {
        Row: {
          id: string
          label: string
          regions: string[] | null
          brands: string[] | null
          spec: Record<string, unknown>
          is_active: boolean
          created_at: string
          updated_at: string
          owner_user_id: string | null
          scope: string
        }
        Insert: {
          id: string
          label: string
          regions?: string[] | null
          brands?: string[] | null
          spec: Record<string, unknown>
          is_active?: boolean
          owner_user_id?: string | null
          scope?: string
        }
        Update: {
          label?: string
          regions?: string[] | null
          brands?: string[] | null
          spec?: Record<string, unknown>
          is_active?: boolean
          owner_user_id?: string | null
          scope?: string
          updated_at?: string
        }
      }
      fabricator_dual_write_consistency_reports: {
        Row: { id: string; sample_size: number; mismatch_count: number; drift_rate: number; report: Record<string, unknown>; reality_os_event_hash: string | null; reality_os_recorded_at: string | null; created_at: string }
        Insert: { sample_size: number; mismatch_count: number; drift_rate: number; report: Record<string, unknown>; reality_os_event_hash?: string | null; reality_os_recorded_at?: string | null }
        Update: { sample_size?: number; mismatch_count?: number; drift_rate?: number; report?: Record<string, unknown>; reality_os_event_hash?: string | null; reality_os_recorded_at?: string | null }
      }
      reality_events: {
        Row: { event_hash: string; chain_position: number; payload: Record<string, unknown>; recorded_at: string }
        Insert: never
        Update: never
      }
      reality_events_readonly: {
        Row: { event_hash: string; chain_position: number; payload: Record<string, unknown>; recorded_at: string }
        Insert: never
        Update: never
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
      confirm_warranty_sale: {
        Args: { _warranty_id: string; _serial: string; _duration_override?: number | null }
        Returns: {
          id: string
          warranty_code: string
          plan_id: string | null
          product_id: string | null
          order_id: string | null
          machine_serial_number: string
          customer_id: string
          sale_confirmed: boolean
          sale_confirmed_at: string | null
          sale_confirmed_by: string | null
          warranty_start_date: string | null
          warranty_end_date: string | null
          duration_months: number | null
          status: 'pending' | 'active' | 'expired' | 'void'
          meta: Record<string, unknown>
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
      validate_warranty: {
        Args: { _serial: string }
        Returns: {
          warranty_code: string
          machine_serial_number: string
          status: 'pending' | 'active' | 'expired' | 'void'
          warranty_start_date: string | null
          warranty_end_date: string | null
          days_remaining: number
          plan_name: string | null
          coverage: Record<string, unknown> | null
        }[]
      }
      realityos_record_event: {
        Args: {
          p_event_type: string
          p_entity_id: string
          p_vertical_id: string
          p_proof: Record<string, unknown>
          p_payload: Record<string, unknown>
          p_recorded_at: string
        }
        Returns: { event_hash: string }[]
      }
      reality_events_readonly: {
        Args: Record<string, never>
        Returns: { event_hash: string; chain_position: number; payload: Record<string, unknown>; recorded_at: string }[]
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
