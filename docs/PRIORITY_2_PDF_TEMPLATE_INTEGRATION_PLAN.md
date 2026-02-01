# Priority 2: PDF Template Integration Plan

**Date:** January 2026  
**Status:** Planning  
**Priority:** P1 (Commercial Page Enhancement)

---

## Overview

Integrate quote/invoice template configurations into PDF generation. This allows users to customize the layout and styling of generated PDFs using templates created in the template editor.

---

## Implementation Approach

### 1. Template Configuration Types

Reuse the template configuration types from the editor components:

```typescript
interface TemplateConfig {
  header: {
    logo_position: 'left' | 'center' | 'right';
    company_info: boolean;
    show_date: boolean;
  };
  body: {
    sections: string[];
    item_columns: string[];
    show_taxes: boolean;
    show_discounts: boolean;
  };
  footer: {
    notes: string;
    terms_conditions: string;
    payment_terms: boolean;
  };
  styling: {
    primary_color: string;  // Hex color
    font_family: string;
    show_borders: boolean;
  };
}
```

### 2. Modify CommercialPDFService

**Changes:**
- Add optional `templateConfig` parameter to `generateQuotePDF()` and `generateInvoicePDF()`
- Apply template configuration settings (header layout, styling, footer content)
- Use template primary color instead of hardcoded amber
- Apply template font family (if supported by pdf-lib)
- Apply template border settings
- Apply template footer content (notes, terms)

**Limitations:**
- pdf-lib has limited font support (StandardFonts only: Helvetica, TimesRoman, Courier)
- Template font_family will map to closest StandardFonts equivalent
- Logo position can be applied (left/center/right alignment)
- Primary color can be converted from hex to RGB
- Border settings can be applied to table lines

### 3. Update PDF Generation Methods

**For Quotes:**
- Accept optional `templateConfig?: TemplateConfig` parameter
- Apply header configuration (logo position, company info, date)
- Apply styling (primary color, font, borders)
- Apply footer configuration (notes, terms, payment terms)

**For Invoices:**
- Same approach as quotes
- Apply template configuration to invoice PDF layout

### 4. Integration Points

**Current Usage:**
- `handleDownloadQuotePDF()` in CommercialPage calls `CommercialPDFService.generateQuotePDF(quote)`
- `handleDownloadInvoicePDF()` in CommercialPage calls `CommercialPDFService.generateInvoicePDF(invoice)`

**Future Enhancement:**
- Add template selection UI in quote/invoice generation flows
- Store selected template ID in quote/invoice data
- Fetch template config when generating PDF
- Pass template config to PDF generation methods

**Initial Implementation:**
- Support optional template config parameter
- If not provided, use default styling (current behavior)
- This allows gradual integration without breaking existing functionality

---

## Implementation Steps

1. ✅ Define template config type (reuse from editor components)
2. ✅ Modify `generateQuotePDF()` to accept optional template config
3. ✅ Apply template config in quote PDF generation
4. ✅ Modify `generateInvoicePDF()` to accept optional template config
5. ✅ Apply template config in invoice PDF generation
6. ⚠️ Future: Add template selection in UI (deferred for now)

---

## Code Changes

### Files to Modify:
- `src/services/commercial/CommercialPDFService.ts` - Add template config support

### Files for Future Enhancement:
- `src/pages/CommercialPage.tsx` - Add template selection UI
- Quote/Invoice data structures - Store template ID reference

---

**Status:** Ready for Implementation  
**Complexity:** Medium (template config application logic)  
**Breaking Changes:** None (optional parameter, backward compatible)
