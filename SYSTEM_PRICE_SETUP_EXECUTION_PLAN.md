# System Price Setup - Execution Plan
**Date:** 2025-01-XX  
**Status:** In Progress  
**Approach:** Precision, Discipline, Gold-Tier Quality

## Execution Strategy

### Phase 1: Critical Integrations (Immediate)
1. ✅ Engineering Bay Integration - LiveCostConsole enhancements
2. ✅ Commercial/Quotes Integration - Pricing source display
3. ✅ Accessibility - Keyboard shortcuts (Ctrl+S, Esc)
4. ✅ CostCalculator Integration - SystemPricingService direct integration

### Phase 2: High Priority Enhancements
5. ✅ Currency Selector UI - PricingTuningStudio header
6. ✅ Reports Page Integration - Already complete (InventoryDashboard)
7. ✅ Scroll-to-Panel Enhancement - React refs (if time permits)

## Implementation Order

1. **LiveCostConsole Enhancement** (Engineering Bay)
   - Add pricing source detection (system_pricing vs constants)
   - Add pricing source indicator badge
   - Add link to PricingTuningStudio
   - Integrate SystemPricingService for source detection

2. **PricingTuningStudio Accessibility**
   - Keyboard shortcut: Ctrl+S for save
   - Keyboard shortcut: Esc for close
   - ARIA labels for key interactive elements
   - Focus management

3. **CostCalculator Integration**
   - Uncomment SystemPricingService integration code
   - Implement proper integration with profile ID passing
   - Add pricing source indicator in return value

4. **Commercial/Quotes Integration**
   - Add pricing source detection to CommercialOfferPanel
   - Display pricing source badge in quote display
   - Add link to PricingTuningStudio

5. **Currency Selector UI**
   - Add currency selector to PricingTuningStudio header
   - Integrate with SystemPricingService currency conversion
   - Display exchange rates (optional enhancement)
