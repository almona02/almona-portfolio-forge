# System Price Setup in Reports Page - Analysis

## Overview

The system price setup functionality in the Reports page is integrated through the `InventoryDashboard` component, which embeds the `Rock60PricingSetup` component. This analysis examines the architecture, data flow, user interaction patterns, and integration points.

## Component Hierarchy

```
FabricatorReports (Page)
  └─ InventoryDashboard (Component)
      └─ Overview Tab
          └─ Grid Layout (lg:grid-cols-3)
              ├─ Left Column (lg:col-span-2)
              │   ├─ Search and Filters Card
              │   └─ Profile Inventory Card (Collapsible)
              │       └─ VirtualizedInventoryList
              │           └─ Profile Cards with "Edit System Pricing" buttons
              └─ Right Column
                  ├─ Customer Inventory Card
                  └─ Rock60PricingSetup Component (data-pricing-panel)
```

## Key Components

### 1. FabricatorReports Page (`src/pages/FabricatorReports.tsx`)

**Location in UI:**
- Route: `/fabricator/reports`
- Tab: "Material & Inventory" tab (default activeTab='material')

**Key Features:**
- Displays inventory statistics and KPIs
- Integrates `InventoryDashboard` component via Suspense wrapper
- Passes inventory data, user ID, and null project to InventoryDashboard

**Data Flow:**
```typescript
useQuery<Profile[]> → inventory data → InventoryDashboard
```

### 2. InventoryDashboard Component (`src/components/fabricator/InventoryDashboard.tsx`)

**Key Features:**
- Multi-tab interface (Overview, Remnants, Alerts, History, Analytics, Purchases)
- **Overview Tab** contains the system pricing setup integration
- Uses grid layout (3 columns on large screens)
- Left column (span 2): Profile inventory list
- Right column (span 1): Customer inventory + System pricing setup

**State Management:**
- `selectedRock60ProfileId`: Tracks which profile is selected for pricing setup
- `isProfileInventoryOpen`: Controls collapsible state of Profile Inventory card
- `filteredInventory`: Filtered list of profiles based on search/filters

### 3. Rock60PricingSetup Component (`src/components/fabricator/Rock60PricingSetup.tsx`)

**Location in UI:**
- Right sidebar of Overview tab
- Marked with `data-pricing-panel` attribute for scroll-to functionality
- Positioned below Customer Inventory card

**Key Features:**
- Generic system pricing editor for any window system pack
- Supports multiple system packs (ROCK 60, JUMBO 100, etc.)
- Manages pricing for:
  - **Profiles** (frame, sash, beads, accessories)
  - **Glazing types** (single, double, triple, Georgian, Low-E, laminated)
  - **Hardware** (hinges, handles, locking kits)
  - **Gaskets** (glass, central, frame, sash striker)
- Auto-calculates profile prices based on aluminum price per kg and weight
- Manual pricing for accessories (not weight-based)

**Data Structure:**
```typescript
Rock60PricingState {
  currency: string;
  aluminumPricePerKg: number;  // Main input for auto-calculation
  framePricePerMeter: number;
  sashPricePerMeter: number;
  beadPricePerMeter: number;
  glassPricePerSquareMeter: number;  // Legacy
  glazingTypes: GlazingType[];  // New array-based approach
  hardware: Record<string, number>;
  gaskets: Record<string, number>;
  profilePrices: Record<string, number>;  // Dynamic profile prices
}
```

**Storage:**
- Prices stored in `fabricator_profiles.specifications.system_pricing` JSONB field
- Also supports legacy `rock60_pricing` key for backward compatibility
- Includes `initialized: true` flag when saved

## User Interaction Flow

### Scenario: Setting up pricing for a system pack profile

1. **Navigation:**
   - User navigates to `/fabricator/reports`
   - Clicks "Material & Inventory" tab (default)

2. **Discovery:**
   - User sees Profile Inventory list in left column
   - Profiles with system packs show "Edit System Pricing" button

3. **Selection:**
   - User clicks "Edit System Pricing" on a profile card
   - System scrolls to pricing panel (smooth scroll)
   - Panel highlights briefly (amber ring)
   - Selected profile ID is set via `setSelectedRock60ProfileId`

4. **Pricing Setup:**
   - Rock60PricingSetup component detects selected profile
   - Loads existing pricing from profile specifications
   - User can:
     - Select system pack (if multiple available)
     - Select specific profile within system pack
     - Enter daily aluminum price per kg (auto-calculates frame/sash prices)
     - Manually set accessory prices
     - Configure glazing type prices (dropdown interface)
     - Set hardware prices (dropdown interface)
     - Set gasket prices (dropdown interface)
   - Click "Save [System Name] Pricing" to persist

5. **Persistence:**
   - Prices saved to database via Supabase
   - Updates `fabricator_profiles.specifications.system_pricing`
   - Shows success toast notification

## Integration Points

### 1. Profile Selection Integration

**Trigger Mechanism:**
```typescript
// In VirtualizedInventoryList renderProfile callback
<Button onClick={() => {
  setSelectedRock60ProfileId(profile.id);
  setTimeout(() => {
    const pricingPanel = document.querySelector('[data-pricing-panel]');
    if (pricingPanel) {
      pricingPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      pricingPanel.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
      setTimeout(() => {
        pricingPanel.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
      }, 2000);
    }
  }, 100);
}}>
  Edit System Pricing
</Button>
```

**Reception:**
```typescript
<Rock60PricingSetup
  profiles={inventory}
  userId={userId}
  selectedProfileId={selectedRock60ProfileId}  // Prop binding
  onProfileChange={setSelectedRock60ProfileId}  // Callback
/>
```

### 2. Data Integration

**Profile Data Source:**
- InventoryDashboard receives `inventory` prop from FabricatorReports
- FabricatorReports queries `fabricator_profiles` table
- Syncs stock from movements before loading

**System Pack Data:**
- Rock60PricingSetup uses `SYSTEM_PACKS` constant from `@/data/systemPacks`
- Creates virtual profiles for system pack items not in inventory
- Groups profiles by system pack name

### 3. Regional Configuration

**Currency Detection:**
```typescript
const { config: regionalConfig } = useRegionalConfig();
const currency = regionalConfig.currency.code || 'EGP';
```

- Defaults to EGP (Egypt)
- Uses regional config hook for currency display
- Prices stored with currency in state

## Data Flow Diagram

```
User Action (Click "Edit System Pricing")
    ↓
setSelectedRock60ProfileId(profileId)
    ↓
Rock60PricingSetup receives selectedProfileId prop
    ↓
useEffect detects profile change
    ↓
Load pricing from profile.specifications.system_pricing
    ↓
Populate state with existing pricing or defaults
    ↓
User edits prices in UI
    ↓
handleSave() triggered
    ↓
Update profile.specifications.system_pricing in database
    ↓
Toast notification + state update
```

## Key Features Analysis

### 1. Auto-Calculation System

**Frame/Sash/Other Profiles:**
- Price = `aluminumPricePerKg × weight_kg_per_meter`
- Automatically updates when aluminum price changes
- Read-only display (green text, calculated)

**Accessories:**
- Manual pricing only (yellow input fields)
- Not weight-based
- Requires explicit user input

### 2. Multi-System Pack Support

- Automatically detects system pack from profile specifications
- Supports ROCK 60, JUMBO 100, and other system packs
- System pack selector dropdown (if multiple systems available)
- Profile selector within system pack

### 3. Glazing Types Management

- Dropdown interface for selecting glazing type
- Add/delete custom glazing types
- Price per square meter per type
- Migrates legacy `glassPricePerSquareMeter` to array format

### 4. Hardware & Gaskets

- Dropdown interface (similar to glazing types)
- Fixed lists from constants (HARDWARE_LIST, GASKET_LIST)
- Price per piece/set (hardware) or per meter (gaskets)

### 5. Configuration Status

- Badge indicator: "Configured" (green) vs "Required" (red)
- First-time setup alert shown if not initialized
- Prevents using system for quotations without pricing

## UI/UX Patterns

### Visual Indicators

1. **Profile Cards:**
   - "Edit System Pricing" button only shown for system pack profiles
   - Button scrolls and highlights pricing panel

2. **Pricing Panel:**
   - Card with dark background (`bg-gray-900/70`)
   - Header shows system name and configuration status badge
   - Sections organized with clear typography hierarchy

3. **Color Coding:**
   - Auto-calculated prices: Green text
   - Manual prices: Yellow input fields
   - Accessories: Opacity reduced (75%) to indicate manual entry required

### Responsive Design

- Grid layout: 2 columns on large screens, 1 column on mobile
- Pricing panel moves below inventory list on smaller screens
- Virtualized list for performance with large inventories

## Storage Schema

### Database Structure

**Table:** `fabricator_profiles`

**Field:** `specifications` (JSONB)

**Structure:**
```json
{
  "system_pricing": {
    "currency": "EGP",
    "aluminumPricePerKg": 45.50,
    "framePricePerMeter": 125.30,
    "sashPricePerMeter": 98.20,
    "beadPricePerMeter": 35.00,
    "glassPricePerSquareMeter": 180.00,  // Legacy
    "glazingTypes": [
      {
        "id": "double",
        "name": "Double Glass",
        "description": "Double pane glass 24mm",
        "pricePerSquareMeter": 180.00
      }
    ],
    "hardware": {
      "0253": 25.50,  // Hinges
      "0707": 15.00,  // Handle
      "KIT 10451": 120.00  // Locking Kit
    },
    "gaskets": {
      "GT 0122": 8.50,
      "GT 0118": 8.50,
      "GT 0137": 12.00,
      "GT 0146": 10.00,
      "GT 0152": 10.00
    },
    "profilePrices": {
      "RC 6111-8": 125.30,
      "RC 6122": 98.20,
      "RC 6166": 35.00
    },
    "initialized": true,
    "systemName": "ROCK 60"
  }
}
```

## Potential Issues & Recommendations

### Current Limitations

1. **Fixed Container Height:**
   - VirtualizedInventoryList uses fixed `containerHeight={1400}`
   - May not adapt well to different viewport sizes
   - **Recommendation:** Use viewport-based calculation or flex layout

2. **Scroll-to Behavior:**
   - Uses setTimeout and DOM query for scrolling
   - May fail if panel not yet rendered
   - **Recommendation:** Use refs for more reliable scrolling

3. **Profile Selection:**
   - Only one profile can be selected at a time
   - No bulk pricing operations
   - **Recommendation:** Add bulk pricing update feature

4. **Price History:**
   - No price history tracking
   - Cannot revert to previous prices
   - **Recommendation:** Integrate with pricing engine price history

5. **Currency Conversion:**
   - No automatic currency conversion
   - Prices stored in single currency
   - **Recommendation:** Add multi-currency support

### Enhancement Opportunities

1. **Integration with Pricing Engine:**
   - Currently uses local state only
   - Could integrate with `PricingEngine` class for validation
   - Could use `PricingConfiguration` from pricing_configurations table

2. **Bulk Operations:**
   - Set prices for all profiles in a system pack at once
   - Copy pricing from one system pack to another
   - Import/export pricing configurations

3. **Price Validation:**
   - Warn if prices seem too high/low
   - Compare with market prices
   - Validate profit margins

4. **Reporting Integration:**
   - Show pricing usage statistics
   - Track which prices are most used
   - Price impact on quote profitability

## Testing Considerations

### Unit Tests Needed

1. Rock60PricingSetup component rendering
2. Price calculation logic (aluminum price × weight)
3. State management (loading, saving, errors)
4. System pack detection and grouping

### Integration Tests Needed

1. Profile selection flow (button click → panel scroll → state update)
2. Save flow (form submit → database update → toast notification)
3. Multi-system pack handling
4. Virtual profile creation

### E2E Tests Needed

1. Complete pricing setup flow from reports page
2. Pricing persistence across page reloads
3. Profile switching and state preservation
4. Error handling (network failures, validation errors)

## Summary

The system price setup in the Reports page provides a comprehensive interface for configuring pricing for window system packs. It's well-integrated through the InventoryDashboard component, with clear user interaction patterns and data persistence. The component supports multiple system packs, auto-calculation for weight-based profiles, and manual pricing for accessories. Key areas for improvement include better responsive design, price history tracking, and integration with the broader pricing engine infrastructure.
