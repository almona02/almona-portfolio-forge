import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfileById, updateProfile as updateProfileDomain } from '@/lib/data/profilesClient';
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
  loading: boolean;            // Initial bootstrap only
  actionLoading: boolean;      // Fast feedback for ongoing auth actions
  stableDisplayEmail?: string; // Non-flickering email for UI
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
  const [loading, setLoading] = useState(true);          // initial session probe
  const [actionLoading, setActionLoading] = useState(false); // user-initiated auth actions
  // Preserve first non-empty email to avoid UI flicker when placeholder profile is swapped with real profile
  const stableEmailRef = useRef<string | undefined>(undefined);

  // Fetch user profile data
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
  const profile = await getProfileById(userId);
      setUser(profile);
      if (!stableEmailRef.current && profile && (profile as User).email) {
        stableEmailRef.current = (profile as User).email;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Build immediate placeholder instead of null to avoid portal flicker
      if (supabaseUser) {
  setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || undefined,
          username: null,
            full_name: supabaseUser.user_metadata?.full_name || null,
            avatar_url: supabaseUser.user_metadata?.avatar_url || null,
            company_name: supabaseUser.user_metadata?.company_name || null,
            phone: supabaseUser.user_metadata?.phone || null,
            sector: null as unknown as User['sector'],
            workshop_location: null,
            governorate: null,
            address: null as unknown as User['address'],
            tax_number: null,
            commercial_register: null,
            role: 'customer' as User['role'],
            is_verified: false,
            preferences: {} as User['preferences'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
      } else {
        setUser(null);
      }
    }
  }, [supabaseUser]);

  useEffect(() => {
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] state:', event, session?.user?.id);
      if (session?.user) {
  setSupabaseUser(session.user);
        // Immediate optimistic placeholder if user object not yet built
        setUser(prev => prev || {
          id: session.user!.id,
          email: session.user!.email || undefined,
          username: null,
          full_name: session.user!.user_metadata?.full_name || null,
          avatar_url: session.user!.user_metadata?.avatar_url || null,
          company_name: session.user!.user_metadata?.company_name || null,
          phone: session.user!.user_metadata?.phone || null,
          sector: null as unknown as User['sector'],
          workshop_location: null,
          governorate: null,
          address: null as unknown as User['address'],
          tax_number: null,
          commercial_register: null,
          role: 'customer' as User['role'],
          is_verified: false,
          preferences: {} as User['preferences'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
  if (!stableEmailRef.current && session.user.email) stableEmailRef.current = session.user.email;
  fetchUserProfile(session.user.id); // fire & forget
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

  return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Absolute safety timeout: never let loading stay true indefinitely
  useEffect(() => {
    if (!loading) return;
    const safety = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Forcing loading=false after safety timeout');
        setLoading(false);
      }
    }, 4000);
    return () => clearTimeout(safety);
  }, [loading]);

  // Removed delayed fallback; placeholder now applied immediately on profile fetch failure.

  const signIn = async (email: string, password: string): Promise<void> => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    full_name: string;
    company_name?: string;
    phone?: string;
    sector?: Database['public']['Tables']['profiles']['Row']['sector'];
  }): Promise<void> => {
    setActionLoading(true);
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
  setActionLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSupabaseUser(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setActionLoading(true);
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
    } finally {
      setActionLoading(false);
    }
  };

  const signInWithPhoneNumber = async (phoneNumber: string, countryCode: string, otp: string): Promise<void> => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `${countryCode}${phoneNumber}`,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
    } catch (error) {
      console.error('SMS sign in error:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const updated = await updateProfileDomain(user.id, updates);
      setUser(updated as unknown as User); // runtime shape compatible
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
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
    actionLoading,
  stableDisplayEmail: stableEmailRef.current || user?.email,
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
