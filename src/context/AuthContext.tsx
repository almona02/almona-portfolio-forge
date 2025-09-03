import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getUserProfile } from '@/lib/supabase';
import { Database } from '@/types/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Define enhanced User interface based on our database schema
interface User {
  id: string;
  email?: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  phone?: string | null;
  sector?: Database['public']['Tables']['profiles']['Row']['sector'];
  workshop_location?: string | null;
  governorate?: string | null;
  address?: Database['public']['Tables']['profiles']['Row']['address'];
  tax_number?: string | null;
  commercial_register?: string | null;
  role: Database['public']['Tables']['profiles']['Row']['role'];
  is_verified: boolean;
  preferences: Database['public']['Tables']['profiles']['Row']['preferences'];
  created_at: string;
  updated_at: string;
}

// Define the shape of the Auth context
interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
    sector?: Database['public']['Tables']['profiles']['Row']['sector'];
  }) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhoneNumber: (phoneNumber: string, countryCode: string, otp: string) => Promise<void>;
  updateProfile: (updates: Database['public']['Tables']['profiles']['Update']) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      setUser(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setSupabaseUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        setSupabaseUser(session.user);
        try {
          await fetchUserProfile(session.user.id);
        } catch (error) {
          console.error('Error fetching user profile on auth state change:', error);
          // Handle the error appropriately, e.g., sign out the user
          await supabase.auth.signOut();
        }
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      // The onAuthStateChange listener will handle setting the user and profile
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
    sector?: Database['public']['Tables']['profiles']['Row']['sector'];
  }) => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            company_name: userData.company_name,
            phone: userData.phone,
            sector: userData.sector,
          },
        },
      });

      if (authError) throw authError;

      // Profile will be created automatically by the database trigger
      // But we can update it with additional info if needed
      if (authData.user) {
        setSupabaseUser(authData.user);
        
        // Wait a moment for the trigger to create the profile, then fetch it
        setTimeout(async () => {
          try {
            await fetchUserProfile(authData.user!.id);
          } catch (error) {
            console.error('Error fetching new user profile:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSupabaseUser(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithPhoneNumber = async (phoneNumber: string, countryCode: string, otp: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `${countryCode}${phoneNumber}`,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      // The onAuthStateChange listener will handle setting the user and profile
      return data;
    } catch (error) {
      console.error('SMS sign in error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setUser(data);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!supabaseUser) return;
    
    try {
      await fetchUserProfile(supabaseUser.id);
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithPhoneNumber,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
