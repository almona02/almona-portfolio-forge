-- Almona Industrial E-commerce Database Schema
-- Execute this in your Supabase SQL Editor

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Create custom types (with safe creation to prevent conflicts)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'admin', 'sales_rep', 'technician');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('draft', 'pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('machine', 'spare_part', 'raw_material', 'tool', 'accessory');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sector_type AS ENUM ('ALUMINIUM', 'UPVC', 'STEEL', 'GLASS', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Extend auth.users with profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  phone TEXT,
  sector sector_type DEFAULT 'GENERAL',
  workshop_location TEXT,
  governorate TEXT,
  address JSONB, -- {street, city, postal_code, country}
  tax_number TEXT,
  commercial_register TEXT,
  role user_role DEFAULT 'customer',
  is_verified BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}', -- User preferences like language, currency, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- Avoid recursive SELECT on profiles inside its own policy; rely on role claim in JWT
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR (auth.jwt() ->> 'role') = 'admin');

-- 4. Create products table for machines, spare parts, and materials
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  short_description_ar TEXT,
  short_description_en TEXT,
  category product_category NOT NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  
  -- Pricing
  price DECIMAL(12, 2),
  cost_price DECIMAL(12, 2),
  currency TEXT DEFAULT 'EGP',
  
  -- Inventory
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER DEFAULT 1000,
  
  -- Physical properties
  weight_kg DECIMAL(8, 2),
  dimensions JSONB, -- {length, width, height, unit}
  
  -- Technical specifications
  specifications JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  compatible_machines TEXT[], -- Array of compatible machine SKUs
  
  -- Media
  image_urls TEXT[],
  video_urls TEXT[],
  document_urls TEXT[], -- Manuals, specs, etc.
  model_3d_url TEXT,
  
  -- SEO and metadata
  meta_title_ar TEXT,
  meta_title_en TEXT,
  meta_description_ar TEXT,
  meta_description_en TEXT,
  keywords TEXT[],
  
  -- Status and visibility
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_on_sale BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_search_ar ON public.products USING gin(to_tsvector('arabic', name_ar || ' ' || COALESCE(description_ar, '')));
CREATE INDEX IF NOT EXISTS idx_products_search_en ON public.products USING gin(to_tsvector('english', name_en || ' ' || COALESCE(description_en, '')));

-- 5. Create product variants table (for different configurations)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name_ar TEXT NOT NULL,
  variant_name_en TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0, -- Price difference from base product
  specifications JSONB DEFAULT '{}',
  image_urls TEXT[],
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create categories table for better organization
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES public.categories(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  status quote_status DEFAULT 'draft',
  
  -- Quote details
  title TEXT,
  description TEXT,
  notes TEXT,
  internal_notes TEXT, -- Admin only notes
  
  -- Pricing
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  
  -- Validity
  valid_until TIMESTAMPTZ,
  
  -- Contact and delivery
  contact_info JSONB,
  shipping_address JSONB,
  delivery_timeline TEXT,
  payment_terms TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

-- 8. Create quote items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  
  -- Item details
  product_name_ar TEXT NOT NULL,
  product_name_en TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  
  -- Configuration
  configurations JSONB DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  quote_id UUID REFERENCES public.quotes(id), -- Optional: if order came from quote
  status order_status DEFAULT 'pending',
  
  -- Order details
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  
  -- Addresses
  billing_address JSONB NOT NULL,
  shipping_address JSONB NOT NULL,
  
  -- Payment
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_reference TEXT,
  
  -- Shipping
  shipping_method TEXT,
  tracking_number TEXT,
  estimated_delivery TIMESTAMPTZ,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- 10. Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  
  -- Item details
  product_name_ar TEXT NOT NULL,
  product_name_en TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  
  -- Configuration
  configurations JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create pricing tiers table for bulk pricing
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER, -- NULL means unlimited
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  fixed_price DECIMAL(12, 2), -- Alternative to discount
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create product reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 14. Create recently viewed products table
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 15. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order', 'quote', 'product', 'system'
  reference_id UUID, -- ID of related order, quote, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql'
SET search_path = public;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. Create functions for automatic numbering
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    quote_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QT-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.quotes
    WHERE quote_number ~ '^QT-\d+$';
    
    quote_num := 'QT-' || LPAD(next_num::TEXT, 6, '0');
    RETURN quote_num;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    order_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE order_number ~ '^ORD-\d+$';
    
    order_num := 'ORD-' || LPAD(next_num::TEXT, 6, '0');
    RETURN order_num;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 19. Create triggers for automatic numbering
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
        NEW.quote_number := generate_quote_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS set_quote_number_trigger ON public.quotes;
CREATE TRIGGER set_quote_number_trigger BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION set_quote_number();
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- 20. Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 21. Create RLS policies for public access to products and categories
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true);

-- 22. Create RLS policies for user-specific data
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
CREATE POLICY "Users can create their own quotes" ON public.quotes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own draft quotes" ON public.quotes;
CREATE POLICY "Users can update their own draft quotes" ON public.quotes FOR UPDATE USING (user_id = auth.uid() AND status = 'draft');

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlists FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can manage their own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can manage their own recently viewed" ON public.recently_viewed FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());

-- 23. Create admin policies
DROP POLICY IF EXISTS "Admins can manage all data" ON public.products;
CREATE POLICY "Admins can manage all data" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes" ON public.quotes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_rep'))
);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'sales_rep'))
);

-- 24. Insert sample categories
INSERT INTO public.categories (name_ar, name_en, slug, sort_order) VALUES
('آلات صناعية', 'Industrial Machines', 'industrial-machines', 1),
('قطع غيار', 'Spare Parts', 'spare-parts', 2),
('مواد خام', 'Raw Materials', 'raw-materials', 3),
('أدوات', 'Tools', 'tools', 4),
('إكسسوارات', 'Accessories', 'accessories', 5)
ON CONFLICT (slug) DO NOTHING;

-- 25. Insert sample subcategories
INSERT INTO public.categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
('آلات CNC', 'CNC Machines', 'cnc-machines', (SELECT id FROM public.categories WHERE slug = 'industrial-machines'), 1),
('آلات القطع', 'Cutting Machines', 'cutting-machines', (SELECT id FROM public.categories WHERE slug = 'industrial-machines'), 2),
('آلات اللحام', 'Welding Machines', 'welding-machines', (SELECT id FROM public.categories WHERE slug = 'industrial-machines'), 3),
('قطع كهربائية', 'Electrical Parts', 'electrical-parts', (SELECT id FROM public.categories WHERE slug = 'spare-parts'), 1),
('قطع ميكانيكية', 'Mechanical Parts', 'mechanical-parts', (SELECT id FROM public.categories WHERE slug = 'spare-parts'), 2)
ON CONFLICT (slug) DO NOTHING;

-- 26. Create search function
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT,
  lang TEXT DEFAULT 'ar',
  category_filter TEXT DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name_ar TEXT,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL,
  image_urls TEXT[],
  category product_category,
  is_featured BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.sku,
    p.name_ar,
    p.name_en,
    p.description_ar,
    p.description_en,
    p.price,
    p.image_urls,
    p.category,
    p.is_featured,
    CASE 
      WHEN lang = 'ar' THEN ts_rank(to_tsvector('arabic', p.name_ar || ' ' || COALESCE(p.description_ar, '')), plainto_tsquery('arabic', search_term))
      ELSE ts_rank(to_tsvector('english', p.name_en || ' ' || COALESCE(p.description_en, '')), plainto_tsquery('english', search_term))
    END as rank
  FROM public.products p
  WHERE p.is_active = true
    AND (
      CASE 
        WHEN lang = 'ar' THEN to_tsvector('arabic', p.name_ar || ' ' || COALESCE(p.description_ar, '')) @@ plainto_tsquery('arabic', search_term)
        ELSE to_tsvector('english', p.name_en || ' ' || COALESCE(p.description_en, '')) @@ plainto_tsquery('english', search_term)
      END
      OR p.sku ILIKE '%' || search_term || '%'
      OR p.brand ILIKE '%' || search_term || '%'
    )
    AND (category_filter IS NULL OR p.category::TEXT = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
  ORDER BY rank DESC, p.is_featured DESC, p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 27. Create function to get product recommendations
CREATE OR REPLACE FUNCTION get_product_recommendations(
  user_id_param UUID,
  product_id_param UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name_ar TEXT,
  name_en TEXT,
  price DECIMAL,
  image_urls TEXT[],
  category product_category,
  is_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.sku,
    p.name_ar,
    p.name_en,
    p.price,
    p.image_urls,
    p.category,
    p.is_featured
  FROM public.products p
  WHERE p.is_active = true
    AND p.id != COALESCE(product_id_param, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      -- Same category as viewed products
      p.category IN (
        SELECT DISTINCT pr.category 
        FROM public.recently_viewed rv
        JOIN public.products pr ON rv.product_id = pr.id
        WHERE rv.user_id = user_id_param
      )
      OR
      -- Featured products
      p.is_featured = true
      OR
      -- Same brand as current product
      (product_id_param IS NOT NULL AND p.brand IN (
        SELECT brand FROM public.products WHERE id = product_id_param
      ))
    )
  ORDER BY 
    p.is_featured DESC,
    RANDOM()
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 28. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id ON public.recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- 29. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 30. Create a function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'Almona Industrial E-commerce Database Schema Created Successfully!' as message;