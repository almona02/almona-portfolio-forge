---
name: Civilization-Style System Gallery
overview: Build the "National Industrial Systems Registry" UI - a Nafeza-inspired gallery showcasing the 10 Gold Tier window systems with blueprint aesthetics, live market data, and technical comparison capabilities.
todos:
  - id: create-gallery-types
    content: Create TypeScript interfaces for gallery system display (SystemGalleryCard, ComparisonMatrix, NationalHeader props)
    status: pending
  - id: create-gallery-data
    content: Create src/data/systemGallery.ts with enriched system data including U-value, wind load, certifications, market share, and pricing tiers
    status: pending
  - id: create-national-header
    content: Build NationalHeader component with live tickers (LME aluminum price, USD/EUR rates, market indicators) using Egyptian Blue + Gold design
    status: pending
  - id: create-system-card
    content: Build SystemPackCard component with blueprint-style design showing technical specs, certifications, market share badge, and "Use in Pilot" CTA
    status: pending
  - id: create-gallery-grid
    content: Build CivilizationGallery component with responsive grid layout, filtering (Aluminum/UPVC/All), sorting (Market Share/Price/U-Value), and search
    status: pending
  - id: create-comparison-matrix
    content: Build ComparisonMatrix component for side-by-side technical comparison (U-Value, Wind Load, Price Range, Certifications) with export functionality
    status: pending
  - id: integrate-gallery-route
    content: Add /gallery route to AppRoutes.tsx and integrate with navigation
    status: pending
  - id: enhance-market-data
    content: Enhance marketData.ts with USD/EUR rates, LME price fetching simulation, and market indicators
    status: pending
---

# Civilization-Style System Gallery Plan

## Objective

Build the "National Industrial Systems Registry" UI - a Nafeza-inspired gallery that establishes Almona as the authoritative source for Egyptian window systems. This gallery showcases the 10 Gold Tier systems with blueprint aesthetics, live market data, and technical comparison capabilities.

## Strategic Value

- **Credibility**: Establishes platform as "National Registry" for window systems
- **Scale**: Upsell path for Pilot users who want to explore more systems
- **Data Integrity**: Creates "Single Source of Truth" for the 10 Gold Tier systems
- **Market Authority**: Live tickers and technical specs demonstrate expertise

## Architecture Overview

The gallery creates a new presentation layer that:
- Displays all 10 Gold Tier systems from `SYSTEM_PACKS` array
- Enriches system data with market intelligence (pricing, market share, certifications)
- Provides blueprint-style visual cards with technical specifications
- Enables side-by-side comparison of technical specs
- Integrates with Pilot for seamless "Use in Pilot" workflow

## Design Language

- **Primary Colors**: Egyptian Blue (#003366), Gold (#FFD700)
- **Aesthetics**: Blueprint-style cards with technical drawings feel
- **Typography**: Cairo font for Arabic, monospace for technical specs
- **Layout**: Responsive grid with RTL support

## Implementation Steps

### Phase 1: Data Layer

**File:** `src/data/systemGallery.ts`

Create enriched system gallery data that extends `SystemPack` with:
- Market share percentage
- Price range (EGP/m²)
- U-Value (thermal performance)
- Wind load capacity
- Certifications array
- Market tier (Gold/Silver/Bronze)
- Pilot availability flag
- Technical drawing thumbnail URL

**Key Systems to Include:**
- Panda 50 (90% market share - Gold Tier)
- ROCK 60 (Commercial - Gold Tier)
- CALUMINIUM PS (Premium - Gold Tier)
- Kompen UPVC (40% UPVC market - Gold Tier)
- EMAPEN UPVC (Premium UPVC - Gold Tier)
- KATRA UPVC (Economy UPVC - Gold Tier)
- FOXYWIN UPVC (Modern UPVC - Gold Tier)
- Plus 3 additional systems from SYSTEM_PACKS

### Phase 2: Type Definitions

**File:** `src/types/gallery.ts`

Create interfaces:
- `SystemGalleryCard` - Display data for gallery cards
- `ComparisonMatrixProps` - Props for comparison component
- `NationalHeaderProps` - Props for header with tickers
- `GalleryFilter` - Filter state (category, tier, search)

### Phase 3: National Header Component

**File:** `src/components/gallery/NationalHeader.tsx`

Features:
- Live aluminum price ticker (from `getLiveAluminumPrice()`)
- USD/EUR exchange rates (simulated or API)
- Market status indicators
- "National Registry" branding with gold seal
- Egyptian flag colors accent

### Phase 4: System Pack Card Component

**File:** `src/components/gallery/SystemPackCard.tsx`

Blueprint-style card showing:
- System name (Arabic + English)
- Market share badge (Gold/Silver/Bronze)
- Technical specs preview (U-Value, Wind Load, Price)
- Certifications icons
- "Use in Pilot" button (if available in Pilot)
- "View Details" button
- Blueprint-style border and technical drawing aesthetic

### Phase 5: Gallery Grid Component

**File:** `src/components/gallery/CivilizationGallery.tsx`

Main gallery component with:
- Responsive grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Filter tabs (All / Aluminum / UPVC)
- Sort dropdown (Market Share / Price / U-Value / Name)
- Search bar (system name, brand, certifications)
- Integration with NationalHeader
- Loading states and empty states

### Phase 6: Comparison Matrix Component

**File:** `src/components/gallery/ComparisonMatrix.tsx`

Side-by-side comparison table showing:
- System names (selectable checkboxes)
- U-Value comparison
- Wind Load capacity
- Price range
- Certifications
- Market share
- Export to PDF/Excel functionality

### Phase 7: Market Data Enhancement

**File:** `src/utils/marketData.ts` (enhance existing)

Add functions:
- `getUSDExchangeRate()` - USD to EGP rate
- `getEURExchangeRate()` - EUR to EGP rate
- `getMarketIndicators()` - Market status (stable/volatile)
- `getSystemPriceRange()` - Price range for specific system

### Phase 8: Route Integration

**File:** `src/routes/AppRoutes.tsx`

Add route:
```typescript
<Route path="/gallery" element={<CivilizationGallery />} />
```

## Critical Integration Points

### System Pack Data Source
- Use existing `SYSTEM_PACKS` array from `src/data/systemPacks.ts`
- Map to Pilot systems via `systemPackId` in `pilot-systems.ts`
- Enrich with market data from `systemGallery.ts`

### Pilot Integration
- "Use in Pilot" button navigates to `/pilot?system={systemId}`
- Pre-selects system in Maalem Dashboard
- Maintains user context

### Market Data
- Live tickers use simulated data (can be replaced with API later)
- Prices match Pilot pricing for consistency
- Exchange rates can be static or fetched from API

## Files to Create

1. `src/data/systemGallery.ts` - Enriched gallery data
2. `src/types/gallery.ts` - Type definitions
3. `src/components/gallery/NationalHeader.tsx` - Header with tickers
4. `src/components/gallery/SystemPackCard.tsx` - Blueprint-style card
5. `src/components/gallery/CivilizationGallery.tsx` - Main gallery component
6. `src/components/gallery/ComparisonMatrix.tsx` - Comparison table

## Files to Modify

1. `src/utils/marketData.ts` - Add exchange rate functions
2. `src/routes/AppRoutes.tsx` - Add `/gallery` route

## Success Criteria

- All 10 Gold Tier systems displayed in gallery
- Blueprint-style cards with technical specs visible
- Live market tickers showing aluminum price and exchange rates
- Filtering and sorting working correctly
- Comparison matrix allows side-by-side technical comparison
- "Use in Pilot" button navigates correctly with system pre-selected
- Responsive design works on mobile, tablet, desktop
- RTL layout correct for Arabic content
- No TypeScript errors
- No runtime errors

## Design Specifications

### System Card Dimensions
- Desktop: 380px × 480px
- Tablet: 340px × 420px
- Mobile: Full width, auto height

### Color Palette
- Primary: #003366 (Egyptian Blue)
- Accent: #FFD700 (Gold)
- Background: #F5F5F5 (Light Gray)
- Text: #1A1A1A (Dark Gray)
- Success: #27AE60 (Green for certifications)

### Typography
- Headings: Cairo Bold, 24px-32px
- Body: Cairo Regular, 14px-16px
- Technical Specs: Monospace, 12px-14px

## Technical Specifications to Display

For each system card:
- U-Value (W/m²K) - Thermal performance
- Wind Load (Pa) - Structural capacity
- Air Permeability (Class) - Weather sealing
- Water Tightness (Class) - Weather sealing
- Sound Reduction (dB) - Acoustic performance
- Certifications (EN, ASTM, Egyptian Standards)
- Market Share (%)
- Price Range (EGP/m²)
- Stock Length (mm)
- Material (Aluminum/UPVC)

