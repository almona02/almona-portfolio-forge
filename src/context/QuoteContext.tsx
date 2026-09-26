
import { createQuote as createQuoteDomain, updateQuoteStatus } from '@/lib/data/quotesClient';
import { validateStock } from '@/lib/inventory';
import { calculateTieredPrice } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { Database, ProductCategory } from '@/types/database';
import type { ShopMachine, ShopProductInput } from '@/types/shopProduct';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

// Enhanced QuoteItem interface
interface QuoteItem {
  enquiry_only?: boolean;
  catalogue_image?: string;
  id: string;
  product_id: string;
  product_name_ar: string;
  product_name_en: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  configurations?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  notes?: string;
  product?: Database['public']['Tables']['products']['Row']; // Full product data for display
}

interface QuoteContextType {
  // Quote items management
  quoteItems: QuoteItem[];
  addCatalogueToQuote: (product: { id: string; name: string; imageUrl?: string }, quantity?: number) => Promise<void>;
  addToQuote: (
    product: Database['public']['Tables']['products']['Row'] | ShopProductInput,
    quantity?: number,
    configurations?: Record<string, unknown>
  ) => Promise<void>;
  removeFromQuote: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemConfigurations: (itemId: string, configurations: Record<string, unknown>) => void;
  clearQuote: () => void;
  
  // Quote management
  currentQuote: Database['public']['Tables']['quotes']['Row'] | null;
  createNewQuote: () => Promise<string>;
  saveQuote: (quoteData: {
    title?: string;
    description?: string;
    notes?: string;
    contact_info?: Database['public']['Tables']['quotes']['Row']['contact_info'];
    shipping_address?: Database['public']['Tables']['quotes']['Row']['shipping_address'];
    delivery_timeline?: string;
    payment_terms?: string;
  }) => Promise<void>;
  submitQuote: () => Promise<void>;
  loadQuote: (quoteId: string) => Promise<void>;
  
  // Calculations
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // User info
  userInfo: QuoteUserInfo;
}

export interface QuoteUserInfo {
  id?: string;
  full_name?: string;
  email?: string;
  company_name?: string;
  phone?: string;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

interface QuoteProviderProps {
  children: ReactNode;
}

export const QuoteProvider: React.FC<QuoteProviderProps> = ({ children }) => {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Database['public']['Tables']['quotes']['Row'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState<QuoteUserInfo>({});
  
  const { user, supabaseUser } = useAuth();
  useTranslation();

  // Tax rate (14% VAT in Egypt)
  const TAX_RATE = 0.14;
  
  // Calculate totals
  const subtotal = quoteItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = subtotal * TAX_RATE;
  const shippingCost = 0; // Can be calculated based on location/weight
  const discountAmount = 0; // Can be applied based on business rules
  const totalAmount = subtotal + taxAmount + shippingCost - discountAmount;

  // Update user info when auth state changes
  useEffect(() => {
    if (user && supabaseUser) {
      setUserInfo({
        id: user.id,
        full_name: user.full_name,
        email: supabaseUser.email,
        company_name: user.company_name,
        phone: user.phone,
      });
    }
  }, [user, supabaseUser]);

  // Load quote items from localStorage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('almona_quote_items');
      if (savedItems) {
        const parsed = JSON.parse(savedItems) as unknown;
        if (Array.isArray(parsed) && parsed.every(isQuoteItemShape)) {
          setQuoteItems(parsed);
        }
      }
    } catch {
      // A denied or corrupt browser store must not prevent an in-memory enquiry.
    } finally {
      setStorageReady(true);
    }
  }, []);

  // Save quote items to localStorage whenever they change
  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem('almona_quote_items', JSON.stringify(quoteItems));
    } catch {
      // The basket remains usable for this visit if browser storage is unavailable.
    }
  }, [quoteItems, storageReady]);

  // ShopProductInput is imported from '@/types/shopProduct'

  const isQuoteItemShape = (v: unknown): v is QuoteItem => {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.product_id === 'string'
      && typeof o.product_name_en === 'string'
      && typeof o.quantity === 'number' && Number.isSafeInteger(o.quantity) && o.quantity > 0
      && typeof o.unit_price === 'number' && Number.isFinite(o.unit_price) && o.unit_price >= 0
      && typeof o.total_price === 'number' && Number.isFinite(o.total_price) && o.total_price >= 0;
  };

  // Catalogue enquiries neither reserve stock nor create database quote records.
  const addCatalogueToQuote = useCallback(async (product: { id: string; name: string; imageUrl?: string }, quantity = 1) => {
    if (!product.id || !product.name || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) {
      throw new Error('Choose a product and a whole-number quantity between 1 and 9999.');
    }
    setQuoteItems(items => {
      const existing = items.find(item => item.enquiry_only && item.product_id === product.id);
      if (existing) return items.map(item => item.id === existing.id
        ? { ...item, quantity: item.quantity + quantity } : item);
      return [...items, {
        id: `catalogue-${product.id}`, product_id: product.id,
        product_name_en: product.name, product_name_ar: product.name,
        product_sku: product.id, quantity, unit_price: 0, total_price: 0,
        enquiry_only: true, catalogue_image: product.imageUrl,
      }];
    });
  }, []);

  const isDbProduct = (p: unknown): p is Database['public']['Tables']['products']['Row'] => {
    if (typeof p !== 'object' || p === null) return false;
    const obj = p as Record<string, unknown>;
    return 'sku' in obj && 'name_en' in obj;
  };

  const isShopMachine = (p: ShopProductInput): p is ShopMachine => {
    return 'pricing' in p || 'specifications' in p;
  };

  // toDbProduct mapping will be defined inline in addToQuote to avoid hook-deps issues

  // Helper function to save individual quote item
  const saveQuoteItemToDatabase = useCallback(async (item: QuoteItem) => {
    if (!currentQuote) return;

    const insertData = {
      quote_id: currentQuote.id,
      product_id: item.product_id,
      product_name_ar: item.product_name_ar,
      product_name_en: item.product_name_en,
      product_sku: item.product_sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      configurations: item.configurations,
      specifications: item.specifications,
      notes: item.notes ?? null,
    };

    const { error } = await supabase
      .from('quote_items')
      .insert(insertData);

    if (error) throw error;
  }, [currentQuote]);

  const addToQuote = useCallback(async (
    productInput: Database['public']['Tables']['products']['Row'] | ShopProductInput, 
    quantity: number = 1,
    configurations?: Record<string, unknown>
  ) => {
    // Allow adding to quote without authentication for better UX
    // Authentication will be required only when submitting the quote

    try {
      const product = isDbProduct(productInput)
        ? productInput
        : (() => {
            const p = productInput;
            const now = new Date().toISOString();
            const allowed: ProductCategory[] = ['machine', 'spare_part', 'raw_material', 'tool', 'accessory'];
            const category = (allowed as string[]).includes(p.category) ? (p.category as ProductCategory) : 'machine';
            const price = ('pricing' in p && p.pricing?.basePrice !== undefined)
              ? p.pricing.basePrice
              : ('price' in p ? p.price ?? null : null);
            const specifications: Record<string, string | number | boolean> = {};
            if ('specifications' in p && Array.isArray(p.specifications)) {
              p.specifications.forEach(s => { specifications[s.key] = s.value; });
            }
            return {
              id: p.id,
              sku: p.id,
              name_ar: p.name,
              name_en: p.name,
              description_ar: p.description ?? null,
              description_en: p.description ?? null,
              short_description_ar: null,
              short_description_en: null,
              category,
              subcategory: null,
              brand: null,
              model: null,
              price,
              cost_price: null,
              currency: 'EGP',
              stock_quantity: ('stock' in p && typeof p.stock === 'number') ? p.stock : 0,
              min_stock_level: 0,
              max_stock_level: 0,
              weight_kg: null,
              dimensions: null,
              specifications,
              features: {},
              compatible_machines: null,
              image_urls: p.imageUrl ? [p.imageUrl] : null,
              video_urls: null,
              document_urls: null,
              model_3d_url: null,
              meta_title_ar: null,
              meta_title_en: null,
              meta_description_ar: null,
              meta_description_en: null,
              keywords: p.tags ?? null,
              is_active: true,
              is_featured: isShopMachine(p) ? !!p.isFeatured : false,
              is_new: isShopMachine(p) ? !!p.isNew : false,
              is_on_sale: isShopMachine(p) ? !!p.discount : false,
              created_at: now,
              updated_at: now,
            } as Database['public']['Tables']['products']['Row'];
          })();
      // Check stock availability before adding to quote
      // Validate stock availability
      if (product.stock_quantity !== undefined) {
        const stockValidation = await validateStock(product.id, quantity);
        if (!stockValidation.isValid) {
          throw new Error(stockValidation.message);
        }
      }

      // Calculate tiered pricing
      const unitPrice = calculateTieredPrice(product.price || 0, quantity);
      const totalPrice = unitPrice * quantity;

      const newItem: QuoteItem = {
  id: `${product.id}-${Date.now()}`, // Temporary ID for local state
        product_id: product.id,
        product_name_ar: product.name_ar,
        product_name_en: product.name_en,
        product_sku: product.sku,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        configurations,
        product, // Store full product data for display
      };

      setQuoteItems(prevItems => {
        // Check if same product with same configurations already exists
        const existingItemIndex = prevItems.findIndex(item => 
          item.product_id === product.id && 
          JSON.stringify(item.configurations) === JSON.stringify(configurations)
        );

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...prevItems];
          const existingItem = updatedItems[existingItemIndex];
          const newQuantity = existingItem.quantity + quantity;
          const newUnitPrice = calculateTieredPrice(product.price || 0, newQuantity);
          
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            unit_price: newUnitPrice,
            total_price: newUnitPrice * newQuantity,
          };
          
          return updatedItems;
        } else {
          // Add new item
          return [...prevItems, newItem];
        }
      });

      // If user is logged in and has a current quote, save to database
      if (user && currentQuote) {
        await saveQuoteItemToDatabase(newItem);
      }

    } catch (error) {
      console.error('Error adding to quote:', error);
      throw error;
    }
  }, [user, currentQuote, saveQuoteItemToDatabase]);

  const removeFromQuote = useCallback((itemId: string) => {
    setQuoteItems(prevItems => prevItems.filter(item => item.id !== itemId));
    
    // TODO: Remove from database if user is logged in
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity > 9999) return;
    if (quantity <= 0) {
      removeFromQuote(itemId);
      return;
    }

    setQuoteItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const newUnitPrice = calculateTieredPrice(item.product?.price || 0, quantity);
          return {
            ...item,
            quantity,
            unit_price: newUnitPrice,
            total_price: newUnitPrice * quantity,
          };
        }
        return item;
      })
    );
  }, [removeFromQuote]);

  const updateItemConfigurations = useCallback((itemId: string, configurations: Record<string, unknown>) => {
    setQuoteItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, configurations } : item
      )
    );
  }, []);

  const clearQuote = useCallback(() => {
    setQuoteItems([]);
    setCurrentQuote(null);
    try { localStorage.removeItem('almona_quote_items'); } catch { /* Optional persistence. */ }
  }, []);

  const createNewQuote = useCallback(async (): Promise<string> => {
    if (quoteItems.some(item => item.enquiry_only)) throw new Error('Send catalogue enquiries from the quote basket email draft. Stock and pricing require confirmation.');
    if (!user) {
      throw new Error('User must be logged in to create a quote');
    }

    setSaving(true);
    try {
      const quoteData: Database['public']['Tables']['quotes']['Insert'] = {
        user_id: user.id,
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: 'EGP',
        contact_info: {
          name: user.full_name || '',
          email: supabaseUser?.email || '',
          phone: user.phone || '',
          company: user.company_name || '',
        },
      };

      const newQuote = await createQuoteDomain({
        user_id: quoteData.user_id,
        status: quoteData.status,
        subtotal: quoteData.subtotal,
        tax_amount: quoteData.tax_amount,
        shipping_cost: quoteData.shipping_cost,
        discount_amount: quoteData.discount_amount,
        total_amount: quoteData.total_amount,
        currency: quoteData.currency,
        title: quoteData.title,
        description: quoteData.description,
        notes: quoteData.notes,
        internal_notes: undefined,
        delivery_timeline: undefined,
        payment_terms: undefined,
        items: [], // items persisted separately below
      });
      setCurrentQuote(newQuote);

      // Save all current quote items to database
      if (quoteItems.length > 0) {
        await saveQuoteItemsToDatabase(newQuote.id, quoteItems);
      }

      return newQuote.id;
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user, supabaseUser, subtotal, taxAmount, shippingCost, discountAmount, totalAmount, quoteItems]);

  const saveQuote = useCallback(async (quoteData: {
    title?: string;
    description?: string;
    notes?: string;
    contact_info?: Database['public']['Tables']['quotes']['Row']['contact_info'];
    shipping_address?: Database['public']['Tables']['quotes']['Row']['shipping_address'];
    delivery_timeline?: string;
    payment_terms?: string;
  }) => {
    if (quoteItems.some(item => item.enquiry_only)) throw new Error('Send catalogue enquiries from the quote basket email draft.');
    if (!currentQuote) {
      throw new Error('No current quote to save');
    }

    setSaving(true);
    try {
      const updateData = {
        ...quoteData,
        subtotal,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', currentQuote.id)
        .select()
        .single();

      if (error) throw error;
      setCurrentQuote(data);

      // Update quote items in database
      await saveQuoteItemsToDatabase(currentQuote.id, quoteItems);

    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [currentQuote, subtotal, taxAmount, shippingCost, discountAmount, totalAmount, quoteItems]);

  const submitQuote = useCallback(async () => {
    if (quoteItems.some(item => item.enquiry_only)) throw new Error('Send catalogue enquiries from the quote basket email draft.');
    if (!currentQuote) {
      await createNewQuote();
    }

    if (!currentQuote) return;

    setSaving(true);
    try {
      const updated = await updateQuoteStatus(currentQuote.id, 'pending');
      setCurrentQuote(updated);

      // Clear local quote items after successful submission
      clearQuote();

    } catch (error) {
      console.error('Error submitting quote:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [currentQuote, createNewQuote, clearQuote, quoteItems]);

  const loadQuote = useCallback(async (quoteId: string) => {
    setLoading(true);
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (
            *,
            products (*)
          )
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) throw quoteError || new Error('Quote not found');

      type QuoteWithItems = Database['public']['Tables']['quotes']['Row'] & {
        quote_items?: Array<Database['public']['Tables']['quote_items']['Row'] & { products?: Database['public']['Tables']['products']['Row'] }>;
      };
      const q = quote as QuoteWithItems;
      setCurrentQuote(q);

      // Convert database quote items to local format
      const items: QuoteItem[] = (q.quote_items ?? []).map((item) => ({
        id: item.id,
    product_id: item.product_id!,
        product_name_ar: item.product_name_ar,
        product_name_en: item.product_name_en,
        product_sku: item.product_sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        configurations: item.configurations,
        specifications: item.specifications,
    notes: item.notes || undefined,
    product: item.products,
      })) || [];

      setQuoteItems(items);

    } catch (error) {
      console.error('Error loading quote:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to save quote items to database
  const saveQuoteItemsToDatabase = async (quoteId: string, items: QuoteItem[]) => {
    if (!items.length) return;

    // First, delete existing items
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId);

    // Then insert new items
    const itemsToInsert = items.map(item => ({
      quote_id: quoteId,
      product_id: item.product_id,
      product_name_ar: item.product_name_ar,
      product_name_en: item.product_name_en,
      product_sku: item.product_sku,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      configurations: item.configurations,
      specifications: item.specifications,
      notes: item.notes,
    }));

    const { error } = await supabase
      .from('quote_items')
      .insert(itemsToInsert as Database['public']['Tables']['quote_items']['Insert'][]);

    if (error) throw error;
  };


  const value: QuoteContextType = {
    // Quote items management
    quoteItems,
    addCatalogueToQuote,
    addToQuote,
    removeFromQuote,
    updateQuantity,
    updateItemConfigurations,
    clearQuote,
    
    // Quote management
    currentQuote,
    createNewQuote,
    saveQuote,
    submitQuote,
    loadQuote,
    
    // Calculations
    subtotal,
    taxAmount,
    shippingCost,
    discountAmount,
    totalAmount,
    
    // Loading states
    loading,
    saving,
    
    // User info
    userInfo,
  };

  return (
    <QuoteContext.Provider value={value}>
      {children}
    </QuoteContext.Provider>
  );
};
