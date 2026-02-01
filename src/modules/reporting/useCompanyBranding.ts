import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { CompanyBranding } from './PDFExportService';

const STORAGE_KEY = 'fabricator_company_branding_v1';

const defaultBranding: CompanyBranding = {
  companyName: 'Your Company Name',
  // Optional workshop name shown in cockpit headers (e.g. "Downtown Workshop")
  workshopName: '',
  primaryColor: '#FF6B35',
  secondaryColor: '#4A5568',
};

export function loadBrandingFromStorage(): CompanyBranding {
  if (typeof window === 'undefined') {
    return defaultBranding;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBranding;
    const parsed = JSON.parse(raw) as Partial<CompanyBranding>;
    return {
      ...defaultBranding,
      ...parsed,
    };
  } catch {
    return defaultBranding;
  }
}

export function saveBrandingToStorage(branding: CompanyBranding) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    // ignore storage errors (quota, privacy mode, etc.)
  }
}

/**
 * Hook to manage company branding settings (logo, company details, colors)
 * at user / browser level. This is used by all reports and quotations.
 * 
 * Gold Tier Update: Now syncs with Database via AuthContext preferences.
 */
export function useCompanyBranding() {
  const { user, updateProfile } = useAuth();
  
  // Initialize from local storage first for immediate render
  const [branding, setBranding] = useState<CompanyBranding>(() =>
    loadBrandingFromStorage(),
  );
  
  // Track if we've synced with DB to avoid overwriting DB with local stale data on first load
  const [isSyncedWithDB, setIsSyncedWithDB] = useState(false);
  
  // Debounce ref for saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect: Load from DB when user is available
  useEffect(() => {
    if (user && user.preferences) {
      const dbPrefs = user.preferences as any; // Cast for flexibility
      if (dbPrefs?.branding) {
        // Merge DB branding with defaults to ensure completeness
        const merged: CompanyBranding = {
          ...defaultBranding,
          ...dbPrefs.branding
        };
        
        // Only update state if different to prevent infinite loops
        // SimpleJSON stringify comparison is sufficient here
        if (JSON.stringify(merged) !== JSON.stringify(branding)) {
            setBranding(merged);
            // Also update local storage to keep it in sync
            saveBrandingToStorage(merged);
        }
        setIsSyncedWithDB(true);
      } else {
        // If DB has no branding but we have local branding, consider us synced
        // so the next 'setBranding' (user action) will write to DB.
        setIsSyncedWithDB(true);
      }
    } else if (user) {
        setIsSyncedWithDB(true);
    }
  }, [user, branding]); // Only re-run if user or branding changes

  /**
   * Enhanced setter that updates State, LocalStorage, and Database
   */
  const updateBranding = (newBranding: CompanyBranding) => {
    // 1. Update State & UI immediately
    setBranding(newBranding);
    
    // 2. Persist to Local Storage immediately (offline backup)
    saveBrandingToStorage(newBranding);
    
    // 3. Persist to Database (Debounced)
    if (user && isSyncedWithDB) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        const currentPrefs = (user.preferences || {}) as any;
        const updatedPrefs = {
          ...currentPrefs,
          branding: newBranding
        };
        
        updateProfile({ preferences: updatedPrefs })
          .then(() => {
             // success - silent save
             console.log('Branding saved to DB');
          })
          .catch(err => {
            console.error('Failed to save branding to DB', err);
            toast.error('Failed to save branding settings to cloud');
          });
      }, 1500); // 1.5s debounce
    }
  };

  return { branding, setBranding: updateBranding };
}


