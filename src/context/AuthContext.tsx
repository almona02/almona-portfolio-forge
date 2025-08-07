import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { jwtDecode } from "jwt-decode";

// Define a more detailed User interface
interface User {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  phone_number?: string;
  country_code?: string;
  avatar_url?: string;
  // Add other relevant user properties
}

// Define the shape of the Auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: any) => Promise<void>; // Accept a user data object
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhoneNumber: (phoneNumber: string, countryCode: string, otp: string) => Promise<void>;
  signInWithFacebook: (accessToken: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (token) {
          const decoded: any = jwtDecode(token);
          // In a real app, you'd verify token with backend
          // For now, assume valid and fetch user data
          const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', decoded.sub)
            .single();
          
          if (error) throw error;
          setUser(customer);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
        localStorage.removeItem('jwt_token');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // No longer listening to onAuthStateChange from Supabase for custom auth flows
    // If you still use Supabase for email/password, you might keep a separate listener
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // After successful Supabase login, you might want to fetch user data and set it
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      const { data: customer, error: dbError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      if (dbError) throw dbError;
      setUser(customer);
    }
  };

  const signUp = async (userData: any) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      emailRedirectTo: `${window.location.origin}/login`, // This uses your actual domain
    },
  });

  if (authError) throw authError;

  if (authData.user) {
    const { error: dbError } = await supabase.from('customers').insert([
      {
        id: authData.user.id,
        name: userData.name,
        email: userData.email,
        company: userData.company,
        sector: userData.sector,
      },
    ]);

    if (dbError) throw dbError;
  }
};

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('jwt_token');
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signInWithPhoneNumber = async (phoneNumber: string, countryCode: string, otp: string) => {
    const res = await fetch('/api/auth/sms/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber, country_code: countryCode, otp }),
    });
    const data = await res.json();

    if (data.success && data.access_token) {
      localStorage.setItem('jwt_token', data.access_token);
      const decoded: any = jwtDecode(data.access_token);
      // Fetch user data from your backend or decode from token if sufficient
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', decoded.sub)
        .single();
      
      if (error) throw error;
      setUser(customer);
    } else {
      throw new Error(data.message || 'Phone number verification failed.');
    }
  };

  const signInWithFacebook = async (accessToken: string) => {
    const res = await fetch('/api/auth/facebook/callback', {
      method: 'GET', // Changed to GET as per backend update
      headers: {
        'Content-Type': 'application/json',
      },
      // For GET, parameters are in URL, not body. This function will be called after redirect.
      // The actual token exchange happens on the backend.
      // This function might not be directly used if the flow is a full redirect.
      // Instead, the Login.tsx will handle the redirect and the AuthProvider will check for token.
    });
    const data = await res.json();

    if (data.success && data.access_token) {
      localStorage.setItem('jwt_token', data.access_token);
      const decoded: any = jwtDecode(data.access_token);
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', decoded.sub)
        .single();
      
      if (error) throw error;
      setUser(customer);
    } else {
      throw new Error(data.message || 'Facebook login failed.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle, signInWithPhoneNumber, signInWithFacebook }}>
      {children}
    </AuthContext.Provider>
  );
};
