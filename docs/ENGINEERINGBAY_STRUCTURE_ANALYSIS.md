# EngineeringBay.tsx Structure Analysis - Phase 1B Integration

## Current Structure Overview

### Main Container (Line 1480)
```tsx
return (
  <div className="flex flex-col h-full relative">
    {/* Enhanced Pricing Configuration Dialog - lines 1486-1527 */}
    <EnhancedPricingConfigDialog ... />
    
    {/* Scrollable Content Area - line 1529 */}
    <div className="flex-1 overflow-auto space-y-6 sm:space-y-8 p-6 sm:p-8">
      {/* Master Control Card - lines 1531-1855 */}
      <Card className="card-glass-dark shadow-glow-strong">
        <CardHeader>...</CardHeader>
        <CardContent>
          {/* System Configuration Card - lines 1717-1812 - → LEFT PANEL */}
          {/* Structure Card - lines 1814-1848 - → MAIN CONTENT */}
        </CardContent>
      </Card>
      
      {/* BOM Card - line 1858 - → RIGHT PANEL */}
      {renderBOM}
    </div>
  </div>
);
```

---

## Surgical Integration Points

### POINT 1: Main Container Replacement (Line 1480)

**CURRENT:**
```tsx
return (
  <div className="flex flex-col h-full relative">
    ...
  </div>
);
```

**REPLACE WITH:**
```tsx
return (
  <FabricatorSectionProvider sectionId="fabrication">
    <FabricatorWorkspaceLayout
      sectionId="fabrication"
      leftPanelContent={...}
      rightPanelContent={...}
      mainContent={...}
      ...
    />
  </FabricatorSectionProvider>
);
```

**LOCATION:** Line 1480
**ACTION:** Replace entire container, wrap with Provider

---

### POINT 2: System Configuration Card → Left Panel (Lines 1717-1812)

**CURRENT LOCATION:** Inside Master Control Card's CardContent (nested)

**STRUCTURE:**
```tsx
{/* System Configuration - Full Width */}
<Card className="card-glass-dark shadow-glow-strong mb-8">
  <CardHeader>
    <CardTitle>System Configuration</CardTitle>
    <Button onClick={handleToggleSystemConfig}>...</Button>
  </CardHeader>
  {!isSystemConfigCollapsed && (
    <CardContent>
      {/* Preset Selector Toggle */}
      {/* Egyptian Pattern Selector Panel */}
      {/* System Pack Info (profiles/parts count) */}
      {/* System constraints alert */}
      {/* Suggest AI Layout button */}
    </CardContent>
  )}
</Card>
```

**EXTRACT TO:** `leftPanelContent` prop

**CHANGES NEEDED:**
- Remove `<Card>` wrapper (CollapsiblePanel provides structure)
- Remove `CardHeader` with collapse button (panel header handles this)
- Keep `CardContent` content, wrap in scrollable div
- Remove `isSystemConfigCollapsed` state dependency
- Remove `handleToggleSystemConfig` handler

**NEW STRUCTURE:**
```tsx
leftPanelContent={
  <div className="h-full overflow-y-auto p-4 space-y-6">
    {/* Preset Selector Toggle */}
    {/* Egyptian Pattern Selector Panel */}
    {/* System Pack Info */}
    {/* System constraints alert */}
    {/* Suggest AI Layout button */}
  </div>
}
```

**LOCATION:** Extract lines 1736-1810 (CardContent inner content)

---

### POINT 3: BOM Card → Right Panel (Line 1858, Function: lines 645-946)

**CURRENT LOCATION:** After Master Control Card, as sibling

**STRUCTURE:**
```tsx
{renderBOM}  // Memoized function that returns a Card
```

**EXTRACT TO:** `rightPanelContent` prop

**FUNCTION DETAILS:**
- Located at lines 645-946
- Returns a `<Card>` component with BOM content
- Has internal collapse state: `isBOMCollapsed`
- Uses handler: `handleToggleBOMCollapsed`

**CHANGES NEEDED:**
- Call `renderBOM()` and pass result to `rightPanelContent`
- Optionally remove Card wrapper from renderBOM function (or keep for styling)
- Remove `isBOMCollapsed` state (if we want panel-level collapse only)
- OR keep internal BOM collapse for nested sections
- Remove `handleToggleBOMCollapsed` handler (if removing collapse)

**NEW STRUCTURE:**
```tsx
rightPanelContent={renderBOM()}
```

**OR if removing Card wrapper:**
```tsx
rightPanelContent={
  <div className="h-full overflow-y-auto">
    {renderBOMContent()}  // Extract content without Card
  </div>
}
```

**LOCATION:** Line 1858

---

### POINT 4: Main Content Area Structure (Lines 1529-1855)

**CURRENT STRUCTURE:**
```tsx
<div className="flex-1 overflow-auto space-y-6 sm:space-y-8 p-6 sm:p-8">
  <Card className="card-glass-dark shadow-glow-strong">
    <CardHeader>
      {/* Title + Buttons */}
    </CardHeader>
    <CardContent>
      {/* 3D Mode Toggle - lines 1589-1615 */}
      {/* Validation Alerts - lines 1617-1701 */}
      {/* System Pack Selector - lines 1701-1715 */}
      {/* System Configuration Card - EXTRACT */}
      {/* Structure Card - lines 1814-1848 - KEEP */}
    </CardContent>
  </Card>
</div>
```

**NEW STRUCTURE FOR mainContent:**
```tsx
mainContent={
  <div className="h-full flex flex-col overflow-hidden">
    {/* Scrollable content area */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Master Control Card Header content */}
      <Card>
        <CardHeader>
          {/* Buttons: Properties, Drafting Mode, Back, Confirm, Save & Next */}
        </CardHeader>
        <CardContent>
          {/* 3D Mode Toggle */}
          {/* Validation Alerts */}
          {/* System Pack Selector */}
          {/* Structure Card with SmartDrawCanvas */}
        </CardContent>
      </Card>
    </div>
  </div>
}
```

**KEY CHANGES:**
- Remove outer scroll container's padding/spacing classes
- Keep Master Control Card structure
- Remove System Configuration Card (moved to left panel)
- Keep Structure Card (lines 1814-1848)
- Remove height constraint from SmartDrawCanvas (line 1835: `maxHeight: '500px'`)

**LOCATION:** Lines 1529-1855 (Master Control Card)

---

### POINT 5: Structure Card - Remove Height Constraint (Line 1835)

**CURRENT:**
```tsx
<div className="w-full" style={{ maxHeight: '500px', overflow: 'auto' }}>
  <SmartDrawCanvas ... />
</div>
```

**CHANGE TO:**
```tsx
<div className="w-full h-full">
  <SmartDrawCanvas ... />
</div>
```

**OR:**
```tsx
<SmartDrawCanvas 
  className="w-full h-full"
  ... 
/>
```

**LOCATION:** Line 1835

---

### POINT 6: State Variables to Remove (Lines 111-113)

**CURRENT STATE:**
```tsx
const [isSystemConfigCollapsed, setIsSystemConfigCollapsed] = useState(false);
const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);  // KEEP THIS
const [isBOMCollapsed, setIsBOMCollapsed] = useState(false);
```

**CHANGES:**
- ✅ **REMOVE:** `isSystemConfigCollapsed` (panel handles collapse)
- ✅ **KEEP:** `isStructureCollapsed` (Structure Card still needs internal collapse)
- ✅ **REMOVE:** `isBOMCollapsed` (if using panel-level collapse only)

**LOCATION:** Lines 111-113

---

### POINT 7: Handlers to Remove (Lines 291, 1120)

**CURRENT HANDLERS:**
```tsx
const handleToggleBOMCollapsed = useCallback(() => {
  setIsBOMCollapsed(prev => !prev);
}, []);

const handleToggleSystemConfig = useCallback(() => {
  setIsSystemConfigCollapsed(prev => !prev);
}, []);

const handleToggleStructure = useCallback(() => {
  setIsStructureCollapsed(prev => !prev);
}, []);  // KEEP THIS
```

**CHANGES:**
- ✅ **REMOVE:** `handleToggleSystemConfig` (line 1120)
- ✅ **REMOVE:** `handleToggleBOMCollapsed` (line 291) - if removing BOM collapse
- ✅ **KEEP:** `handleToggleStructure` (Structure Card still needs it)

---

### POINT 8: Header Integration Strategy

**CURRENT HEADER:** Master Control Card Header (lines 1532-1587)

**CONTENT:**
- Title: "Engineering Bay" with icon
- Buttons: Properties, Drafting Mode, Back to Measuring, Confirm Design, Save & Next

**OPTIONS:**

**Option A: Custom Header Prop** (Recommended for initial integration)
- Pass custom header component via `header` prop
- Preserves all existing buttons and styling
- Easier initial integration

**Option B: Integrate into UniversalHeader**
- Move buttons to UniversalHeader
- More complex refactoring
- Better long-term consistency

**RECOMMENDATION:** Start with Option A (custom header), refactor later if needed.

**LOCATION:** Lines 1532-1587

---

### POINT 9: Enhanced Pricing Config Dialog

**CURRENT LOCATION:** Line 1486 (before scrollable content)

**ACTION:** Keep in same position (before FabricatorWorkspaceLayout or as sibling)

**LOCATION:** Line 1486-1527

---

### POINT 10: Breadcrumbs Setup

**CURRENT:** No breadcrumbs in component

**NEW:**
```tsx
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Fabricator', href: '/fabricator' },
  { label: 'Engineering Bay', href: '#' },
];
```

**LOCATION:** Before return statement

---

## Integration Summary

### Extraction Map

| Current Location | Target Location | Content |
|-----------------|----------------|---------|
| Lines 1717-1812 | `leftPanelContent` | System Configuration Card content |
| Line 1858 (renderBOM) | `rightPanelContent` | BOM Card |
| Lines 1529-1855 | `mainContent` | Master Control Card (minus System Config) |
| Lines 1532-1587 | `header` prop OR UniversalHeader | Title + Action Buttons |

### State Cleanup

| State Variable | Action | Reason |
|---------------|--------|--------|
| `isSystemConfigCollapsed` | Remove | Panel handles collapse |
| `isBOMCollapsed` | Remove (optional) | Panel handles collapse (or keep for nested) |
| `isStructureCollapsed` | Keep | Structure Card needs internal collapse |

### Handler Cleanup

| Handler | Action | Reason |
|---------|--------|--------|
| `handleToggleSystemConfig` | Remove | No longer needed |
| `handleToggleBOMCollapsed` | Remove (optional) | Panel handles collapse |
| `handleToggleStructure` | Keep | Structure Card still needs it |

---

## Integration Order

1. ✅ Add imports (DONE)
2. Wrap with FabricatorSectionProvider
3. Extract System Configuration to leftPanelContent
4. Extract BOM to rightPanelContent
5. Structure mainContent (remove System Config, keep Structure Card)
6. Configure layout props (breadcrumbs, title, status, cost, etc.)
7. Remove obsolete state/handlers
8. Test integration
