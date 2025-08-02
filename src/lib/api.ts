import { supabase } from './supabase';

// =================================
// Auth API
// =================================

export const api = {
  // Auth endpoints
  login: async (credentials) => {
    return supabase.auth.signInWithPassword(credentials);
  },
  register: async (userData) => {
    const { user, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });

    if (error) {
      throw error;
    }

    // Add user to customers table
    await supabase.from('customers').insert([
      {
        id: user.id,
        name: userData.name,
        company: userData.company,
        email: userData.email,
      },
    ]);

    return user;
  },
  logout: async () => {
    return supabase.auth.signOut();
  },

  // Customer data
  fetchUserMachines: async (userId) => {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('customer_id', userId);
    if (error) throw error;
    return data;
  },
  fetchUserTickets: async (userId) => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('customer_id', userId);
    if (error) throw error;
    return data;
  },
  createTicket: async (ticketData) => {
    const { data, error } = await supabase.from('tickets').insert([ticketData]);
    if (error) throw error;
    return data;
  },

  // Machine registration
  registerMachine: async (machineData) => {
    const { data, error } = await supabase.from('machines').insert([machineData]);
    if (error) throw error;
    return data;
  },
};
