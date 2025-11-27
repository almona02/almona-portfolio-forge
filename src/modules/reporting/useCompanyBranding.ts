import { useEffect, useState } from 'react';
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
 */
export function useCompanyBranding() {
  const [branding, setBranding] = useState<CompanyBranding>(() =>
    loadBrandingFromStorage(),
  );

  useEffect(() => {
    saveBrandingToStorage(branding);
  }, [branding]);

  return { branding, setBranding };
}


