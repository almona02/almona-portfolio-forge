# Phase 1C Structure Replacement Plan

## Current State
- ✅ Panel extractions created (toolsPanelContent, propertiesPanelContent, mainContent)
- ✅ Layout configuration (breadcrumbs, status)
- ✅ Provider wrapper added
- ⏳ Structure replacement pending

## Structure to Replace

**Lines 1054-1742**: Main div structure
- Header (1055-1242): Complex header with many buttons
- DraftingMenuBar (1244-1308)
- Main Content div (1310-1311)
  - Left Panel (1313-1318): w-16, DraftingToolbar
  - Center Tabs (1320-1452): Already extracted to mainContent
  - Right Panel (1454-1715): w-56/w-64, Properties/Layers/Blocks
- EnhancedStatusBar (1717-1733)
- RecoveryDialog (1735-1741)

## Replacement Strategy

Replace lines 1054-1742 with:

```tsx
<FabricatorWorkspaceLayout
  sectionId="drafting"
  leftPanelContent={toolsPanelContent}
  rightPanelContent={propertiesPanelContent}
  mainContent={mainContent}
  header={customHeader}  // Simplified for now, preserve essential buttons
  footer={<EnhancedStatusBar ... />}
  title="Drafting Workbench"
  status={layoutStatus}
  statusMessage={layoutStatusMessage}
  breadcrumbs={breadcrumbs}
  leftPanelTitle="Tools"
  rightPanelTitle="Properties"
  leftPanelIcon={<Ruler size={18} />}
  rightPanelIcon={<Settings size={18} />}
/>
<RecoveryDialog ... />  // Keep outside layout
<DraftingMenuBar ... />  // Keep for now, can move to toolbar later
```

## Custom Header Strategy

For now, create a simplified custom header with:
- Breadcrumbs
- Title
- Essential buttons (Save, Validate, Optimize)
- Move complex viewport/zoom controls to QuickAccessToolbar later

This preserves functionality while simplifying the integration.
