# Phase 1B EngineeringBay Integration - Step-by-Step Execution Plan

## Execution Strategy

Due to the file size (~1970 lines), executing in focused steps:

### Step 1: Create Left Panel Content (System Configuration) - useMemo
- Location: Before return statement (after renderBOM useMemo, around line 947)
- Extract lines 1736-1810 content
- Wrap in scrollable div
- Remove Card wrapper and collapse logic

### Step 2: Modify renderBOM to remove Card wrapper (optional)
- Keep Card wrapper for now (easier integration)
- Can refactor later if needed

### Step 3: Replace Main Return Structure
- Location: Line 1480
- Wrap with FabricatorSectionProvider
- Replace container with FabricatorWorkspaceLayout
- Configure all props

### Step 4: Clean Up State/Handlers
- Remove isSystemConfigCollapsed state
- Remove isBOMCollapsed state  
- Remove handleToggleSystemConfig
- Remove handleToggleBOMCollapsed

### Step 5: Remove Height Constraint from SmartDrawCanvas
- Line 1835: Remove maxHeight: '500px'

### Step 6: Add Breadcrumbs
- Before return statement

### Step 7: Configure Layout Props
- Calculate cost from bomData.totals.materialCost
- Determine status from validationResult
- Set breadcrumbs
- Configure titles/icons

## Critical Dependencies

- systemPack (useMemo, line 160)
- fabricatorSystemPack (useMemo, line 166)
- selectedProfiles (useMemo, line 195)
- liveProject (useMemo, line 258)
- bomData (useMemo, line 409)
- renderBOM (useMemo, line 649)
- validationResult (state)
- All handlers (handleSystemPackSelect, handlePresetSelect, etc.)

## Status/StatusMessage Logic

```typescript
const layoutStatus = validationResult 
  ? (validationResult.isValid ? 'success' : 'error')
  : 'normal';

const layoutStatusMessage = validationResult
  ? (validationResult.isValid 
      ? t('engineering_bay.design_valid', 'Design is valid - All constraints satisfied')
      : t('engineering_bay.design_invalid', 'Design validation failed'))
  : undefined;
```

## Cost Calculation

```typescript
const layoutCost = bomData?.totals?.materialCost || 0;
```

## Breadcrumbs

```typescript
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Fabricator', href: '/fabricator' },
  { label: t('engineering_bay.title', 'Engineering Bay'), href: '#' },
];
```
