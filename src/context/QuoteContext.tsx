
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { calculateTieredPrice } from '@/lib/pricing';
import { createQuote as createQuoteDomain, updateQuoteStatus } from '@/lib/data/quotesClient';
import { Database } from '@/types/database';
import { useTranslation } from 'react-i18next';

// Enhanced QuoteItem interface
interface QuoteItem {
  id: string;
  product_id: string;
  product_name_ar: string;
  product_name_en: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  configurations?: Record<string, any>;
  specifications?: Record<string, any>;
  notes?: string;
  product?: Database['public']['Tables']['products']['Row']; // Full product data for display
}

interface QuoteContextType {
  // Quote items management
  quoteItems: QuoteItem[];
  addToQuote: (product: Database['public']['Tables']['products']['Row'], quantity?: number, configurations?: Record<string, any>) => Promise<void>;
  removeFromQuote: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemConfigurations: (itemId: string, configurations: Record<string, any>) => void;
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
  userInfo: {
    id?: string;
    full_name?: string;
    email?: string;
    company_name?: string;
    phone?: string;
  };
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
  const [currentQuote, setCurrentQuote] = useState<Database['public']['Tables']['quotes']['Row'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  
  const { user, supabaseUser } = useAuth();
  const { i18n } = useTranslation();

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
    const savedItems = localStorage.getItem('almona_quote_items');
    if (savedItems) {
      try {
        setQuoteItems(JSON.parse(savedItems));
      } catch (error) {
        console.error('Error loading saved quote items:', error);
      }
    }
  }, []);

  // Save quote items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('almona_quote_items', JSON.stringify(quoteItems));
  }, [quoteItems]);

  const addToQuote = useCallback(async (
    product: Database['public']['Tables']['products']['Row'], 
    quantity: number = 1,
    configurations?: Record<string, any>
  ) => {
    try {
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
  }, [user, currentQuote]);

  const removeFromQuote = useCallback((itemId: string) => {
    setQuoteItems(prevItems => prevItems.filter(item => item.id !== itemId));
    
    // TODO: Remove from database if user is logged in
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
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
  }, []);

  const updateItemConfigurations = useCallback((itemId: string, configurations: Record<string, any>) => {
    setQuoteItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, configurations } : item
      )
    );
  }, []);

  const clearQuote = useCallback(() => {
    setQuoteItems([]);
    setCurrentQuote(null);
    localStorage.removeItem('almona_quote_items');
  }, []);

  const createNewQuote = useCallback(async (): Promise<string> => {
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
    if (!currentQuote) {
      throw new Error('No current quote to save');
    }

    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('quotes')
        .update({
          ...quoteData,
          subtotal,
          tax_amount: taxAmount,
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        } as any)
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
  }, [currentQuote, createNewQuote, clearQuote]);

  const loadQuote = useCallback(async (quoteId: string) => {
    setLoading(true);
    try {
      const { data: quote, error: quoteError } = await (supabase as any)
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

      if (quoteError) throw quoteError;

      setCurrentQuote(quote);

      // Convert database quote items to local format
  if (!quote) throw new Error('Quote not found');
  const items: QuoteItem[] = (quote.quote_items || []).map((item: any) => ({
        id: item.id,
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
    await (supabase as any)
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

    const { error } = await (supabase as any)
      .from('quote_items')
      .insert(itemsToInsert as any);

    if (error) throw error;
  };

  // Helper function to save individual quote item
  const saveQuoteItemToDatabase = async (item: QuoteItem) => {
    if (!currentQuote) return;

    const { error } = await (supabase as any)
      .from('quote_items')
      .insert({
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
        notes: item.notes,
      } as any);

    if (error) throw error;
  };

  const value: QuoteContextType = {
    // Quote items management
    quoteItems,
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
