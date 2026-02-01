# Pricing Tuning Studio - User Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** Production Ready

---

## 📖 Overview

The **Pricing Tuning Studio** is Almona's comprehensive workspace for managing system pricing configurations. It provides a full-featured, enterprise-grade interface for configuring, validating, and managing pricing for window systems, following Almona's proven studio pattern (inspired by ProfileTuningStudio).

### Key Features

- ✅ **Three-Tier Architecture**: Quick Panel → Full Studio → Integrated Context
- ✅ **Comprehensive Pricing Management**: Profile prices, hardware, glazing, gaskets
- ✅ **Price History & Rollback**: Track changes and revert when needed
- ✅ **Validation & Quality Assurance**: Real-time validation with warnings and errors
- ✅ **Bulk Operations**: Percentage adjustments, copy pricing, import/export
- ✅ **Multi-Currency Support**: EGP, USD, EUR, GBP with conversion
- ✅ **Customer Tiers & Rules**: Quantity breaks, seasonal adjustments, custom rules
- ✅ **Integration**: Deep integration with BOM calculations, quotes, and Engineering Bay

---

## 🚀 Quick Start

### Accessing the Pricing Tuning Studio

The Pricing Tuning Studio can be accessed from multiple entry points:

#### 1. From Reports/Inventory Page (Tier 1 - Quick Panel)

1. Navigate to **Reports** or **Inventory** page
2. Find the **Rock60 Pricing Setup** panel in the sidebar
3. Click **"Open Studio"** button to launch the full studio

#### 2. From Engineering Bay (Tier 3 - Integrated Context)

1. Open a project in **Engineering Bay**
2. In the **BOM Sidebar**, look for the pricing source badge (Custom/Default Pricing)
3. Click **"Configure Pricing"** button to open the studio

#### 3. From Commercial/Quotes (Tier 3 - Integrated Context)

1. Open a project and navigate to **Commercial/Quotes** section
2. In the **Commercial Offer Panel** header, find the pricing badge
3. Click **"Pricing"** button (with Settings icon) to open the studio

---

## 🎯 Workflow: Setting Up Pricing for a System Pack

### Step 1: Select System Pack and Profile

1. Open the **Pricing Tuning Studio**
2. In the header, use the **System Pack Selector** to choose your system (e.g., "ROCK60")
3. The studio will automatically load the first profile for that system pack
4. If needed, select a different profile from the dropdown

### Step 2: Configure Profile Prices (Tab 1: System Pack Pricing)

1. Navigate to **Tab 1: System Pack Pricing**
2. You'll see a list of profiles for the selected system pack
3. For each profile, enter the **price per meter** in the currency selected
4. Prices are saved automatically when you click **"Save Pricing"**

**Tips:**
- Use the quick percentage adjustment in the Bulk Operations tab for bulk changes
- Prices are stored per profile code (e.g., "frame-ROCK60", "sash-ROCK60")
- Changes are marked as "dirty" (unsaved) until you click Save

### Step 3: Configure Hardware Prices (Tab 2: Hardware & Accessories)

1. Navigate to **Tab 2: Hardware & Accessories**
2. Configure prices for hardware items (locks, handles, hinges, etc.)
3. Enter prices per unit in the selected currency
4. Hardware prices apply across all profiles in the system pack

### Step 4: Configure Glazing Prices (Tab 3: Glazing Types)

1. Navigate to **Tab 3: Glazing Types**
2. Configure prices per square meter for different glazing types
3. Common types: Single pane, Double pane, Triple pane, Laminated, etc.
4. Prices are used in BOM calculations for window units

### Step 5: Configure Gaskets (Tab 4: Gaskets & Seals)

1. Navigate to **Tab 4: Gaskets & Seals**
2. Configure prices per meter for gasket types
3. Gaskets are used in material calculations for window units

### Step 6: Set Up Pricing Rules (Tab 5: Pricing Rules)

1. Navigate to **Tab 5: Pricing Rules**
2. Configure customer tiers (Bronze, Silver, Gold, Platinum)
3. Set up quantity breaks (discounts for larger orders)
4. Configure seasonal adjustments (if applicable)
5. Add custom material rules if needed

**Example Quantity Break:**
- 0-10 units: Base price
- 11-50 units: 5% discount
- 51-100 units: 10% discount
- 100+ units: 15% discount

### Step 7: Review History (Tab 6: History & Rollback)

1. Navigate to **Tab 6: History & Rollback**
2. Review pricing change history
3. Compare versions if needed
4. Use **"Rollback"** to revert to a previous version if necessary

### Step 8: Validate Configuration (Tab 7: Validation & Quality)

1. Navigate to **Tab 7: Validation & Quality**
2. Review validation score and any warnings/errors
3. Fix any issues before saving
4. Validation checks for:
   - Missing prices
   - Invalid values (negative, zero, etc.)
   - Inconsistencies
   - Best practices

### Step 9: Save Your Configuration

1. Click **"Save Pricing"** button in the header (or press `Ctrl+S` / `Cmd+S`)
2. Wait for the success confirmation
3. Your pricing is now active and will be used in BOM calculations and quotes

---

## 💡 Advanced Features

### Bulk Operations (Tab 8: Bulk Ops)

#### Percentage Adjustment

1. Navigate to **Tab 8: Bulk Ops**
2. Enter a percentage (e.g., `+10` for 10% increase, `-5` for 5% decrease)
3. Click **"Apply Percentage"**
4. Confirm the operation
5. All prices (profiles, hardware, glazing, gaskets) will be adjusted

#### Copy Pricing from Another System Pack

1. Navigate to **Tab 8: Bulk Ops**
2. Select a source system pack from the dropdown
3. Click **"Copy Pricing"**
4. Confirm the operation
5. Pricing will be copied (system pack name will be updated to current system)

#### Import/Export

**Export:**
1. Navigate to **Tab 8: Bulk Ops**
2. Click **"Export Pricing"** button
3. Choose format: JSON or CSV
4. File will be downloaded

**Import:**
1. Navigate to **Tab 8: Bulk Ops**
2. Click **"Choose File"** and select your pricing file (JSON or CSV)
3. Choose import mode:
   - **Replace**: Replace all current pricing
   - **Merge**: Merge with existing pricing (new prices override, missing prices kept)
4. Click **"Import Pricing"**
5. Review import results (success count, errors, warnings)

### Multi-Currency Support

1. In the studio header, use the **Currency Selector** dropdown
2. Select your currency: EGP, USD, EUR, or GBP
3. All prices will be displayed and saved in the selected currency
4. Currency conversion is handled automatically by the system

### Customer Tiers

Configure different pricing tiers for different customer segments:

- **Bronze**: Base pricing
- **Silver**: Small discount (e.g., 2-3%)
- **Gold**: Moderate discount (e.g., 5-7%)
- **Platinum**: Highest discount (e.g., 10-15%)

Customer tiers can be applied in quotes and commercial offers.

### Quantity Breaks

Set up automatic discounts based on order quantity:

- Define breakpoints (e.g., 10, 50, 100 units)
- Set discount percentages for each breakpoint
- System automatically applies the correct pricing in quotes

---

## ⌨️ Keyboard Shortcuts

- **`Ctrl+S`** (Windows/Linux) or **`Cmd+S`** (Mac): Save pricing configuration
- **`Esc`**: Close the studio (will prompt if unsaved changes)

---

## 🔍 Understanding Pricing Sources

### Custom Pricing (system_pricing)

When a system pack has custom pricing configured:
- ✅ Badge shows **"Custom Pricing"** (green badge)
- ✅ Prices are stored in profile specifications (`system_pricing` field)
- ✅ Prices are used in BOM calculations and quotes
- ✅ Can be edited in the Pricing Tuning Studio

### Default Pricing (constants)

When a system pack uses default pricing:
- ⚠️ Badge shows **"Default Pricing"** (amber badge)
- ⚠️ Prices come from system constants (fallback values)
- ⚠️ To customize, open the Pricing Tuning Studio and configure pricing

---

## 🔄 Integration Points

### Engineering Bay

- Pricing source is displayed in the BOM Sidebar
- Click "Configure Pricing" to open the studio
- BOM calculations use system_pricing when available

### Commercial/Quotes

- Pricing source is displayed in the Commercial Offer Panel header
- Click "Pricing" button to open the studio
- Quotes use system_pricing for accurate pricing

### Reports/Inventory

- Quick pricing panel (Rock60PricingSetup) provides quick access
- "Open Studio" button launches the full studio
- Pricing status is visible in inventory views

---

## ⚠️ Best Practices

1. **Always Validate Before Saving**: Check the Validation tab for warnings/errors
2. **Use History for Safety**: Review change history regularly, use rollback if needed
3. **Test Pricing Changes**: Use the Impact Preview to see how changes affect quotes
4. **Bulk Operations Carefully**: Double-check percentage adjustments and copy operations
5. **Currency Consistency**: Ensure all prices are in the same currency
6. **Backup Before Major Changes**: Export pricing before making bulk changes

---

## 🐛 Troubleshooting

### Pricing Not Showing in Quotes

1. Verify pricing is saved (check for "Saved" status in header)
2. Check that the correct system pack is selected
3. Verify pricing source badge shows "Custom Pricing" (not "Default Pricing")
4. Refresh the quote/commercial offer page

### Validation Errors

1. Navigate to the Validation tab
2. Review error messages
3. Fix missing prices or invalid values
4. Save and re-validate

### Import Errors

1. Check file format (JSON or CSV)
2. Verify file structure matches expected format
3. Review import results for specific error messages
4. Try importing in "Merge" mode if "Replace" fails

### Currency Conversion Issues

1. Verify currency is selected correctly
2. Check that all prices are in the same currency
3. Currency conversion rates are managed by the system (not user-configurable)

---

## 📚 Related Documentation

- **ProfileTuningStudio Guide**: Similar studio pattern for profile tuning
- **BOM Calculation Guide**: How pricing is used in BOM calculations
- **Quoting Guide**: How pricing affects quotes and commercial offers

---

## 🆘 Support

For issues or questions:
1. Check the Validation tab for configuration issues
2. Review the History tab for recent changes
3. Contact your system administrator
4. Refer to technical documentation for developers

---

**Last Updated:** 2025-01-XX  
**Status:** Production Ready - All Critical & High Priority Features Complete
