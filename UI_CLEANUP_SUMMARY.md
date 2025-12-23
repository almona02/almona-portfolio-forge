# UI Cleanup Summary - Gold Tier Focus & Reduced Noise

## Issues Addressed

### 1. Calibration Wizard in Engineering Bay ❌
**Problem:** Calibration wizard was showing in Engineering Bay (design tab) for frame profiles, creating noise. No need for sash calibration there.

**Solution:** Removed calibration wizard from Engineering Bay. Calibration is now only available in Profile Management / Inventory tabs where it's more appropriate.

**File:** `src/pages/FabricatorWorkflow.tsx` (Line 1735-1764)

**Before:**
```typescript
{/* Calibration Wizard Integration */}
{currentProject && currentProject.systemPackId && inventory.length > 0 && (
  <CalibrationWizard ... />
)}
```

**After:**
```typescript
{/* Calibration Wizard removed from Engineering Bay - reduces noise */}
{/* Calibration is available in Profile Management / Inventory tabs where it's more appropriate */}
```

---

### 2. Prestige Quote Visibility 🎯
**Problem:** CommercialOfferPanel (prestige quote) was visible in measuring/design/engineering stages, creating distraction. Users need focus during design phase.

**Solution:** Hide prestige quote in early workflow stages (measuring, design). Only show in later stages (optimization, production, quality) where pricing is relevant.

**Files:** `src/pages/FabricatorWorkflow.tsx`

**Changes:**
- **Mobile Panel** (Line 1428-1434): Conditional rendering based on `activeTab`
- **Desktop Panel** (Line 2120-2123): Conditional rendering based on `activeTab`

**Logic:**
```typescript
{/* Prestige Quote hidden in measuring/design stages - only show in later workflow stages */}
{activeTab !== 'measuring' && activeTab !== 'design' && (
  <CommercialOfferPanel ... />
)}
```

**When Shown:**
- ✅ Optimization tab
- ✅ Production tab
- ✅ Quality tab
- ✅ Later workflow stages

**When Hidden:**
- ❌ Measuring tab
- ❌ Design tab (Engineering Bay)

---

### 3. Side Menu Revision 🎨
**Problem:** Side menu was cluttered with long labels and redundant descriptions. Needed cleaner, more contextual navigation inspired by Supabase design.

**Solution:** Streamlined navigation with:
- Shorter, cleaner labels
- More contextual grouping
- Removed redundant descriptions
- Better icon usage
- Focused on value

**File:** `src/components/layout/EnterpriseSidebar.tsx` (Line 238-299)

**Before:**
```typescript
{
  id: 'workflow',
  label: 'AI Workflow',
  description: 'End‑to‑end fabrication pipeline',
  children: [
    { id: 'measuring', label: 'Smart Measuring', ... },
    { id: 'design', label: 'Technical Design', ... },
    { id: 'optimization', label: 'Cutting Optimization', ... },
    { id: 'inventory', label: 'Inventory Check', ... },
    { id: 'production', label: 'Production Planning', ... },
    { id: 'quality', label: 'Quality Control', ... }
  ]
}
```

**After:**
```typescript
{
  id: 'workflow',
  label: 'Workflow',  // Shorter, cleaner
  icon: Workflow,      // More appropriate icon
  description: 'Fabrication pipeline',  // Concise
  children: [
    { id: 'measuring', label: 'Measuring', ... },  // Removed "Smart"
    { id: 'design', label: 'Design', ... },        // Removed "Technical"
    { id: 'optimization', label: 'Optimization', ... },  // Removed "Cutting"
    { id: 'inventory', label: 'Inventory', ... },  // Removed "Check"
    { id: 'production', label: 'Production', ... },  // Removed "Planning"
    { id: 'quality', label: 'Quality', ... }        // Removed "Control"
  ]
}
```

**Other Improvements:**
- **Projects:** Changed icon from `Factory` to `FileText` (more appropriate)
- **Resources:** Changed icon from `Package` to `Settings` (configuration focus)
- **Commercial:** Shortened child labels ("Offers" vs "Commercial Offers")
- **Resources:** Removed "Accounting" (less common), kept essential items

---

## Design Philosophy Applied

### Supabase-Inspired Principles:
1. **Contextual Navigation:** Show only what's relevant to current stage
2. **Clean Labels:** Short, action-oriented names
3. **Value-Focused:** Group by workflow, not by feature
4. **Progressive Disclosure:** Hide advanced features until needed
5. **Visual Hierarchy:** Clear grouping with appropriate icons

### Gold Tier Focus:
- **Reduced Noise:** Remove distractions during design phase
- **Stage-Appropriate:** Show tools when they're needed
- **Professional:** Clean, enterprise-grade interface
- **Efficient:** Fewer clicks, better focus

---

## Testing Checklist

### Calibration Wizard:
- [ ] Verify calibration wizard NOT visible in Engineering Bay (design tab)
- [ ] Verify calibration wizard available in Inventory/Profile Management tabs
- [ ] Test calibration functionality in appropriate location

### Prestige Quote:
- [ ] Measuring tab: Prestige quote NOT visible
- [ ] Design tab: Prestige quote NOT visible
- [ ] Optimization tab: Prestige quote visible
- [ ] Production tab: Prestige quote visible
- [ ] Quality tab: Prestige quote visible

### Side Menu:
- [ ] Labels are shorter and cleaner
- [ ] Icons are appropriate and contextual
- [ ] Navigation flows logically
- [ ] No redundant descriptions
- [ ] Grouping makes sense

---

## Files Modified

1. `src/pages/FabricatorWorkflow.tsx`
   - Removed calibration wizard from Engineering Bay
   - Added conditional rendering for CommercialOfferPanel
   - Updated mobile and desktop side panels

2. `src/components/layout/EnterpriseSidebar.tsx`
   - Streamlined navigation items
   - Updated labels and icons
   - Improved grouping and descriptions

---

## Status
✅ **Calibration Wizard:** Removed from Engineering Bay
✅ **Prestige Quote:** Hidden in measuring/design stages
✅ **Side Menu:** Streamlined and cleaned up
✅ **Ready for Testing:** All changes applied

---

**Next Steps:**
1. Test UI changes in browser
2. Verify focus improvement in design stage
3. Confirm prestige quote appears in appropriate stages
4. Validate side menu navigation flow

