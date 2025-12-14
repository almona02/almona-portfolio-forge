import React, { createContext, useContext, useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { supabase, handleAuthError } from '@/lib/supabase';
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

  // Track ongoing profile fetches to prevent duplicates
  const ongoingFetches = useRef<Set<string>>(new Set());
  
  // Circuit breaker for failing profile fetches (reserved for future use)
  // const circuitBreaker = useRef<{
  //   failures: number;
  //   lastFailure: number;
  //   isOpen: boolean;
  // }>({ failures: 0, lastFailure: 0, isOpen: false });
  
  // Fetch user profile data with improved caching and deduplication
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Prevent duplicate calls for the same user
    const cacheKey = `profile-${userId}`;
    const lastFetch = sessionStorage.getItem(cacheKey);
    const now = Date.now();
    
    // If we fetched this profile less than 60 seconds ago, skip
    if (lastFetch && (now - parseInt(lastFetch)) < 60000) {
      return;
    }
    
    // If there's already an ongoing fetch for this user, skip
    if (ongoingFetches.current.has(userId)) {
      return;
    }
    
    // Mark this fetch as ongoing
    ongoingFetches.current.add(userId);
    
    try {
      // Add timeout to prevent hanging requests
      const profilePromise = getProfileById(userId);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const profile = await Promise.race([profilePromise, timeoutPromise]);
      
      if (profile) {
        setUser(profile);
        if (!stableEmailRef.current && (profile as User).email) {
          stableEmailRef.current = (profile as User).email;
        }
        // Cache the fetch time and profile data
        sessionStorage.setItem(cacheKey, now.toString());
        sessionStorage.setItem(`${cacheKey}-data`, JSON.stringify(profile));
      }
    } catch (error) {
      // Only log error once per session to avoid console spam
      if (!sessionStorage.getItem('profile-fetch-error-logged')) {
        console.error('Error fetching user profile:', error);
        sessionStorage.setItem('profile-fetch-error-logged', 'true');
      }
      
      // Try to use cached profile data if available
      const cachedData = sessionStorage.getItem(`${cacheKey}-data`);
      if (cachedData) {
        try {
          const cachedProfile = JSON.parse(cachedData);
          setUser(cachedProfile);
          return;
        } catch {
          // Ignore parse errors
        }
      }
      
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
    } finally {
      // Remove from ongoing fetches
      ongoingFetches.current.delete(userId);
    }
  }, [supabaseUser]);

  useEffect(() => {
    let isMounted = true;
    
    // Listen for auth changes with debouncing to prevent excessive updates
    let authChangeTimeout: NodeJS.Timeout;
    
    // Only set up auth listener if Supabase is properly configured
    let subscription: any = null;

    const getInitialSession = async () => {
      try {
        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.warn('Supabase not configured, skipping authentication');
          if (isMounted) {
            setUser(null);
            setSupabaseUser(null);
            setLoading(false);
          }
          return;
        }

        // Add timeout to prevent hanging on network issues
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 10000)
        );
        
        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (!isMounted) return;
        
        const { data: { session }, error } = result;
        
        if (error) {
          console.error('Error getting session:', error);
          // Handle auth errors including refresh token issues
          await handleAuthError(error);
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user && isMounted) {
          setSupabaseUser(session.user);
          // Defer profile fetch to avoid blocking UI - use startTransition for non-urgent update
          startTransition(() => {
            // Use requestIdleCallback if available, otherwise setTimeout
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                fetchUserProfile(session.user.id).catch(() => {
                  // Silently fail - profile will be fetched on next interaction
                });
              }, { timeout: 2000 });
            } else {
              setTimeout(() => {
                fetchUserProfile(session.user.id).catch(() => {
                  // Silently fail - profile will be fetched on next interaction
                });
              }, 100);
            }
          });
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        // If we can't get session, proceed without authentication
        if (isMounted) {
          setUser(null);
          setSupabaseUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getInitialSession();

    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Clear any pending auth change
        if (authChangeTimeout) {
          clearTimeout(authChangeTimeout);
        }
        
        // Debounce auth state changes to prevent rapid updates
        authChangeTimeout = setTimeout(() => {
          // Only log significant auth events, not every state change
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            console.log('[Auth]', event, session?.user?.id ? `user: ${session.user.id}` : 'no user');
          }
          
          // Handle token refresh errors
          if (event === 'TOKEN_REFRESHED' && !session) {
            console.warn('[Auth] Token refresh failed, clearing session');
            setSupabaseUser(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Handle sign out events
          if (event === 'SIGNED_OUT') {
            setSupabaseUser(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          if (session?.user) {
            // Use startTransition for non-urgent updates to improve INP
            startTransition(() => {
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
            });
            
            // Defer profile fetch to avoid blocking UI interaction
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                fetchUserProfile(session.user.id).catch(() => {
                  // Silently fail - will retry on next interaction
                });
              }, { timeout: 2000 });
            } else {
              setTimeout(() => {
                fetchUserProfile(session.user.id).catch(() => {
                  // Silently fail - will retry on next interaction
                });
              }, 100);
            }
          } else {
            startTransition(() => {
              setSupabaseUser(null);
              setUser(null);
            });
          }
          setLoading(false);
        }, 50); // 50ms debounce - reduced for better responsiveness
      });
      subscription = authSubscription;
    }

    return () => {
      isMounted = false;
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout);
      }
      // Clear ongoing fetches on unmount
      ongoingFetches.current.clear();
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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

  // Performance optimization: reduce unnecessary re-renders
  const stableDisplayEmail = stableEmailRef.current || user?.email;

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
      // But we also ensure it exists and update it with all metadata fields
      if (authData.user) {
        setSupabaseUser(authData.user);
        
        // Wait a moment for the trigger to create the profile, then ensure it's complete
        setTimeout(async () => {
          try {
            // First, check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', authData.user!.id)
              .single();
            
            // If profile doesn't exist, create it manually (trigger might have failed)
            if (fetchError || !existingProfile) {
              console.warn('Profile not found after signup, creating manually...', fetchError);
              
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: authData.user!.id,
                  full_name: userData.full_name || authData.user!.email || 'User',
                  company_name: userData.company_name || null,
                  phone: userData.phone || null,
                  sector: userData.sector || 'GENERAL',
                });
              
              if (insertError) {
                console.error('Error creating profile manually:', insertError);
                // Still try to continue - maybe trigger will create it later
              }
            } else {
              // Profile exists, update it with additional metadata fields
              const profileUpdates: Record<string, any> = {};
              if (userData.company_name) profileUpdates.company_name = userData.company_name;
              if (userData.phone) profileUpdates.phone = userData.phone;
              if (userData.sector) profileUpdates.sector = userData.sector;
              
              if (Object.keys(profileUpdates).length > 0) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update(profileUpdates)
                  .eq('id', authData.user!.id);
                
                if (updateError) {
                  console.warn('Error updating profile with metadata:', updateError);
                  // Don't throw - profile exists, this is just additional data
                }
              }
            }
            
            // Fetch the complete profile
            await fetchUserProfile(authData.user!.id);
          } catch (error) {
            console.error('Error ensuring profile exists:', error);
            // Don't throw - registration succeeded, profile can be fixed later
            // The user can still log in and we'll retry fetching the profile
          }
        }, 1500); // Increased delay to give trigger more time
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      // Provide more helpful error messages
      if (error?.message) {
        // Check for common database errors
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        if (error.message.includes('violates row-level security') || error.message.includes('RLS')) {
          throw new Error('Registration failed due to security policy. Please contact support.');
        }
        if (error.message.includes('trigger') || error.message.includes('function')) {
          throw new Error('Registration completed, but profile setup encountered an issue. Please try logging in.');
        }
      }
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
    stableDisplayEmail,
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
