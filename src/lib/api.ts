import { supabase, createQuote, getProducts, getUserQuotes } from './supabase';

// =================================
// Auth API
// =================================

export const api = {
  // Auth endpoints
  login: async (credentials) => {
    return supabase.auth.signInWithPassword(credentials);
  },
  register: async (userData) => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          company_name: userData.company_name,
          phone: userData.phone,
          sector: userData.sector,
        }
      }
    });

    if (error) {
      throw error;
    }
    return user;
  },
  logout: async () => {
    return supabase.auth.signOut();
  },

  // Customer data
  fetchUserMachines: async (userId: string) => {
    // Assuming 'machines' are products with category 'machine'
    // The schema does not link products to users directly, so this fetches all machines.
    // This might need adjustment if there's a specific ownership table.
    return getProducts({ category: 'machine' });
  },
  fetchUserTickets: async (userId: string) => {
    // Assuming 'tickets' are represented by 'quotes'
    return getUserQuotes(userId);
  },
  createTicket: async (ticketData: {
    user_id: string;
    title: string;
    description: string;
  }) => {
    const quoteData = {
      user_id: ticketData.user_id,
      title: ticketData.title,
      description: ticketData.description,
      status: 'pending', // Default status for a new ticket/quote
    };
    return createQuote(quoteData);
  },

  // Machine registration
  registerMachine: async (machineData: any) => {
    // Assuming machine registration means creating a new product of category 'machine'
    const productData = {
      ...machineData,
      category: 'machine', 
    };
    const { data, error } = await supabase.from('products').insert([productData]);
    if (error) throw error;
    return data;
  },
};
