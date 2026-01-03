/**
 * @file ACCURACY_CONTRACT.ts
 * @description Immutable definitions of system accuracy claims.
 * WARNING: Changing these values requires legal/product sign-off.
 * 
 * These values are frozen and must not be modified without:
 * 1. Legal review
 * 2. Product sign-off
 * 3. Update to FABRICATOR_AUTHORITY_RESPONSIBILITY_MODEL.md
 * 
 * AICS-001 Reference: Section 7.3 (Certification Levels)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export const ACCURACY_CONTRACT = Object.freeze({
  visual_preview: 0.85,
  production_output: 0.998,
  
  // Human-readable labels for UI consistency
  labels: Object.freeze({
    visual: Object.freeze({
      en: 'Visual Preview (Approximate)',
      ar: 'معاينة مرئية (تقريبية)'
    }),
    production: Object.freeze({
      en: 'Production Data (Certified)',
      ar: 'بيانات الإنتاج (معتمدة)'
    })
  })
});

// Runtime check to prevent accidental modification in dev
if (process.env.NODE_ENV !== 'production') {
  // Double-check immutability
  try {
    (ACCURACY_CONTRACT as any).visual_preview = 0.9;
    throw new Error('ACCURACY_CONTRACT is not properly frozen!');
  } catch (e) {
    if (e instanceof TypeError) {
      // Expected - contract is frozen
      console.log('[ACCURACY_CONTRACT] Immutability verified');
    } else {
      throw e;
    }
  }
  
  // Validate contract integrity
  if (ACCURACY_CONTRACT.visual_preview >= ACCURACY_CONTRACT.production_output) {
    throw new Error('Accuracy contract invalid: visual >= production');
  }
}

