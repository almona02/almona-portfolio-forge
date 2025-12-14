import { getProfileById, updateProfile as updateProfileDomain } from '@/lib/data/profilesClient';
import { handleAuthError, supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import React, { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
    
    // Capture ref value at effect start for cleanup (fixes ESLint warning)
    const ongoingFetchesRef = ongoingFetches;

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
      // Use the ref captured at effect start to avoid stale closure warning
      ongoingFetchesRef.current.clear();
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

  // Helper function to parse Supabase auth errors into polished, prestigious user messages
  const parseAuthError = (error: any): string => {
    if (!error) return 'We encountered an unexpected issue. Please try again, and if the problem persists, our support team is here to assist you.';
    
    const errorMessage = error.message || '';
    const status = error.status || error.statusCode || 0;
    
    // Handle specific error cases with refined messaging
    if (errorMessage.includes('Invalid login credentials') || 
        errorMessage.includes('invalid_credentials') ||
        errorMessage.includes('Invalid email or password')) {
      return 'The credentials you entered do not match our records. Please verify your email address and password, ensuring correct capitalization and spelling.';
    }
    
    if (errorMessage.includes('Email not confirmed') || 
        errorMessage.includes('email_not_confirmed') ||
        errorMessage.includes('Email address not confirmed')) {
      return 'Your account requires email verification to ensure security. Please check your inbox for our confirmation message. If you don\'t see it, please check your spam or junk folder. Should you need assistance, our support team is ready to help.';
    }
    
    if (errorMessage.includes('User not found') || 
        errorMessage.includes('user_not_found')) {
      return 'We couldn\'t locate an account associated with this email address. Please verify your email or create a new account to get started with our platform.';
    }
    
    if (errorMessage.includes('Too many requests') || 
        errorMessage.includes('rate_limit') ||
        status === 429) {
      return 'For your security, we\'ve temporarily limited login attempts. Please wait a few moments before trying again. This helps us protect your account from unauthorized access.';
    }
    
    if (errorMessage.includes('Email rate limit exceeded')) {
      return 'We\'ve reached the maximum number of email requests for your account. Please allow a few minutes before requesting another email. This measure helps us maintain service quality for all users.';
    }
    
    if (status === 400) {
      if (errorMessage.includes('email')) {
        return 'The email address format appears to be incorrect. Please review and ensure it follows the standard format (e.g., name@example.com).';
      }
      if (errorMessage.includes('password')) {
        return 'The password you entered doesn\'t meet our security requirements. Please verify your password and try again.';
      }
      return 'The information provided doesn\'t match our records. Please carefully review your email address and password, then try again.';
    }
    
    if (status === 401) {
      return 'The credentials you entered are incorrect. Please verify your email address and password. If you\'ve forgotten your password, you can reset it through our password recovery system.';
    }
    
    if (status === 403) {
      return 'Access to your account is currently restricted. This may be due to security measures or account status. Please contact our support team for assistance, and we\'ll be happy to help restore your access.';
    }
    
    if (status >= 500) {
      return 'We\'re experiencing technical difficulties on our end. Our team has been notified and is working to resolve this promptly. Please try again in a few moments. We apologize for any inconvenience.';
    }
    
    // Return a polished generic message if we can't parse the specific error
    return errorMessage || 'We were unable to complete your login request. Please verify your credentials and try again. If the issue continues, please contact our support team for personalized assistance.';
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setActionLoading(true);
    try {
      // Validate input before making the request
      if (!email || !email.trim()) {
        throw new Error('Please provide your email address to continue.');
      }
      if (!password || !password.trim()) {
        throw new Error('Please enter your password to access your account.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) {
        // Parse Supabase error messages for better user feedback
        const errorMessage = parseAuthError(error);
        const enhancedError = new Error(errorMessage);
        // Preserve original error for debugging
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }

      // Check if user email is confirmed
      if (data?.user && !data.user.email_confirmed_at) {
        throw new Error('Your account requires email verification to ensure the highest level of security. Please check your inbox for our confirmation message. If you don\'t see it, please check your spam or junk folder. Our support team is available if you need assistance.');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      // If it's already a parsed error, just throw it
      if (error.message && error.originalError) {
        throw error;
      }
      // Otherwise, try to parse it
      if (error?.message) {
        const parsedMessage = parseAuthError(error);
        throw new Error(parsedMessage);
      }
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
              
              const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
                id: authData.user!.id,
                full_name: userData.full_name || authData.user!.email || 'User',
                company_name: userData.company_name || null,
                phone: userData.phone || null,
                sector: (userData.sector || 'GENERAL') as Database['public']['Tables']['profiles']['Row']['sector'],
              };
              
              // Use type assertion to fix TypeScript inference issue
              const { error: insertError } = await (supabase
                .from('profiles') as any)
                .insert(profileInsert);
              
              if (insertError) {
                console.error('Error creating profile manually:', insertError);
                // Still try to continue - maybe trigger will create it later
              }
            } else {
              // Profile exists, update it with additional metadata fields
              const profileUpdates: Database['public']['Tables']['profiles']['Update'] = {};
              if (userData.company_name) profileUpdates.company_name = userData.company_name;
              if (userData.phone) profileUpdates.phone = userData.phone;
              if (userData.sector) profileUpdates.sector = userData.sector as Database['public']['Tables']['profiles']['Row']['sector'];
              
              if (Object.keys(profileUpdates).length > 0) {
                // Use type assertion to fix TypeScript inference issue
                const { error: updateError } = await (supabase
                  .from('profiles') as any)
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
