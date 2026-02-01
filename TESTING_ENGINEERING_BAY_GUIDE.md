# Testing EngineeringBay & DraftingWorkbench Locally

## Quick Start

### 1. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5173` (or next available port)

### 2. Access EngineeringBay

**Main Route:**
```
http://localhost:5173/fabricator/workflow/engineering-bay
```

**With Drafting Mode:**
```
http://localhost:5173/fabricator/workflow/engineering-bay?mode=drafting
```

**With Project ID:**
```
http://localhost:5173/fabricator/workflow/engineering-bay/{projectId}
```

### 3. Testing Scenarios

#### Scenario 1: EngineeringBay (SmartDraw Mode)
1. Navigate to: `http://localhost:5173/fabricator/workflow/engineering-bay`
2. **Expected Behavior:**
   - Shows "No Project Data" message if no project in context
   - If project exists, shows:
     - System Configuration panel (collapsible)
     - SmartDraw Canvas for grid layout
     - Bill of Materials (BOM) panel
     - 3D Preview toggle (Standard/Pro)
     - Menu bar with save/export options

#### Scenario 2: DraftingWorkbench (Drafting Mode)
1. Navigate to: `http://localhost:5173/fabricator/workflow/engineering-bay?mode=drafting`
2. **Expected Behavior:**
   - Shows ALMONA Drafting Workbench
   - Tier 0 Visual Drafting interface
   - 2D Drafting canvas
   - Toolbar with drafting tools
   - Properties panel
   - Validation tab
   - Template editor

#### Scenario 3: Mode Switching
1. Start in SmartDraw mode
2. Click "Drafting Mode" button
3. **Expected:** Switches to DraftingWorkbench
4. Click "Back to SmartDraw"
5. **Expected:** Returns to EngineeringBay

### 4. Key Features to Test

#### EngineeringBay Features:
- ✅ System Pack Selection
- ✅ Preset Pattern Selection (Egyptian patterns)
- ✅ SmartDraw Canvas (grid layout)
- ✅ Bill of Materials (BOM) calculation
- ✅ 3D Preview toggle
- ✅ Properties panel
- ✅ Save/Export functionality
- ✅ Design validation
- ✅ Component generation

#### DraftingWorkbench Features:
- ✅ 2D Drafting tools (rectangle, circle, line, etc.)
- ✅ Viewport controls (zoom, pan, fit)
- ✅ Layer management
- ✅ Properties panel
- ✅ Template selection
- ✅ Validation gate
- ✅ DXF/JSON export
- ✅ Optimization integration
- ✅ State persistence

### 5. Common Issues & Solutions

#### Issue: "No Project Data" Message
**Solution:** 
- Create a project first via `/fabricator-workflow` (measuring step)
- Or navigate with a project ID: `/fabricator/workflow/engineering-bay/{projectId}`

#### Issue: Drafting Mode Not Loading
**Solution:**
- Check URL parameter: `?mode=drafting` must be present
- Check browser console for errors
- Verify DraftingWorkbench component imports

#### Issue: Components Not Rendering
**Solution:**
- Check browser console for import errors
- Verify all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run type-check`

#### Issue: Performance Issues
**Solution:**
- Check browser DevTools Performance tab
- Verify lazy loading is working
- Check for memory leaks in React DevTools

### 6. Testing Checklist

#### EngineeringBay:
- [ ] Component loads without errors
- [ ] System pack selector works
- [ ] Preset pattern selector opens/closes
- [ ] SmartDraw canvas renders
- [ ] Grid can be modified
- [ ] BOM updates when grid changes
- [ ] 3D toggle switches modes
- [ ] Properties panel opens/closes
- [ ] Save button works
- [ ] Export buttons work
- [ ] Design validation works
- [ ] "Confirm Design" button works

#### DraftingWorkbench:
- [ ] Component loads without errors
- [ ] Drafting tools are selectable
- [ ] Canvas renders correctly
- [ ] Viewport controls work (zoom, pan)
- [ ] Properties panel shows selected element
- [ ] Layer manager works
- [ ] Template selector works
- [ ] Validation tab shows results
- [ ] Export DXF works
- [ ] Export JSON works
- [ ] Optimization button works (if profiles available)
- [ ] State persistence works

### 7. Browser Console Checks

Open DevTools (F12) and check for:
- ✅ No red errors
- ✅ No failed imports
- ✅ No React warnings
- ✅ Performance warnings (if any)

### 8. Network Tab Checks

Verify:
- ✅ Components lazy load correctly
- ✅ No failed chunk loads
- ✅ Assets load properly

### 9. React DevTools Checks

Verify:
- ✅ Component tree renders correctly
- ✅ State updates properly
- ✅ No unnecessary re-renders
- ✅ Context providers work

### 10. Quick Test Commands

```bash
# Type check
npm run type-check

# Lint check
npm run lint

# Build test (should succeed)
npm run build
```

## Expected URLs

| Component | URL |
|-----------|-----|
| EngineeringBay (SmartDraw) | `/fabricator/workflow/engineering-bay` |
| EngineeringBay (Drafting) | `/fabricator/workflow/engineering-bay?mode=drafting` |
| With Project ID | `/fabricator/workflow/engineering-bay/{projectId}` |

## Notes

- EngineeringBay requires a project in context (from measuring step)
- DraftingWorkbench can work standalone (no project required)
- Both components use MasterLayout for consistent theming
- All routes are wrapped with Suspense for lazy loading

