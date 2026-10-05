# Template Editor Tab Analysis - Drafting Workbench

## Overview

The **Template Editor** is the fourth tab in the Drafting Workbench, providing a comprehensive tool for reverse-engineering ALMONA designs to extract reusable templates. It enables workshop knowledge extraction, template recommendations, and pattern analysis.

---

## Integration Points

### 1. Main Workbench Integration
- **Location**: `src/components/fabricator/drafting/DraftingWorkbench.tsx`
- **Tab Value**: `'templates'`
- **Tab Label**: "Template Editor" (with Sparkles icon)
- **Lazy Loading**: ✅ Yes (React.lazy for code splitting)
- **Position**: 4th tab (after 2D Drafting, 3D Preview, Validation)

### 2. Component Location
- **Component**: `src/components/fabricator/drafting/components/TemplateEditor.tsx`
- **Type**: React Functional Component
- **Props Interface**: `TemplateEditorProps`

---

## Component Architecture

### Props Interface
```typescript
interface TemplateEditorProps {
  currentDesign?: WindowUnit;           // Current design to extract template from
  onTemplateCreated?: (template: ExtractedTemplate) => void;
  onTemplateSelected?: (template: ExtractedTemplate) => void;
}
```

### State Management
- **Active Tab**: `'extract' | 'history' | 'recommendations' | 'knowledge'`
- **Templates**: Extracted templates from design/history/recommendations
- **Knowledge**: Workshop knowledge base data
- **Loading States**: Async operation tracking
- **Filters**: Search, material, confidence filters

---

## Features & Functionality

### 1. Extract from Design Tab
- **Purpose**: Extract template from current drafting design
- **Trigger**: Automatic when `currentDesign` changes and tab is active
- **Logic**: Uses `extractTemplateFromDesign(currentDesign)`
- **Output**: Single `ExtractedTemplate` object
- **UI**: Template card with details and action buttons

### 2. Workshop History Tab
- **Purpose**: Extract templates from historical workshop projects
- **Trigger**: "Extract from History" button
- **Logic**: `extractTemplatesFromHistory(jobs, options)`
- **Options**:
  - `minFrequency: 2` - Minimum occurrence count
  - `minConfidence: 60` - Minimum confidence threshold
  - `includeMaterialPreferences: true`
  - `includeSuccessMetrics: true`
- **Output**: Array of extracted templates
- **UI**: Grid layout of template cards

### 3. Recommendations Tab
- **Purpose**: Get AI/ML-based template recommendations
- **Trigger**: "Get Recommendations" button (requires currentDesign)
- **Logic**: `getTemplateRecommendations(workshopId, dimensions, context)`
- **Context**:
  - Material type (aluminum/UPVC)
  - Room type/zone
  - Dimensions (width, height)
- **Output**: Array of recommendations with confidence scores and reasons
- **UI**: List of recommendation cards with match percentages

### 4. Knowledge Base Tab
- **Purpose**: View extracted workshop knowledge and patterns
- **Trigger**: "Extract Knowledge" button
- **Logic**: `extractWorkshopKnowledge(workshopId, jobs)`
- **Output**: `TemplateKnowledge` object with:
  - Workshop insights (total projects, average dimensions)
  - Common patterns
  - Most common pattern
  - Success patterns (high success rate patterns)
- **UI**: Dashboard-style view with statistics and pattern cards

---

## Data Flow

### Input Data Sources
1. **Current Design** (from DraftingWorkbench):
   - Geometry from `draftingEngine.getGeometry()`
   - Active template from `draftingEngine.getActiveTemplate()`
   - Converted to `WindowUnit` via `convertDraftingToWindowGrid()`
   - Includes: grid, dimensions, systemPackId

2. **Workshop History** (from JobsStore):
   - Uses `useJobsStore()` hook
   - Loads jobs on mount if empty
   - Filters jobs for template extraction

### Output Actions
1. **onTemplateCreated**: 
   - Called when user saves a template
   - Shows success toast
   - Logs to console in DEV mode

2. **onTemplateSelected**:
   - Sets template in drafting engine: `draftingEngine.setTemplate(template.id)`
   - Switches to 2D Drafting tab
   - Applies template to current design

---

## Utility Dependencies

### templateExtractor.ts
- **Functions**:
  - `extractTemplateFromDesign(design: WindowUnit): ExtractedTemplate`
  - `extractTemplatesFromHistory(jobs, options): Promise<ExtractedTemplate[]>`
- **Purpose**: Extract template patterns from designs/jobs

### templateKnowledgeExtractor.ts
- **Functions**:
  - `extractWorkshopKnowledge(workshopId, jobs): Promise<TemplateKnowledge>`
  - `getTemplateRecommendations(workshopId, dimensions, context): Promise<Recommendation[]>`
- **Purpose**: Extract knowledge and generate recommendations

---

## UI Components

### Main Layout
- **Header**: Title, description, action buttons
- **Tabs**: 4 internal tabs (Extract, History, Recommendations, Knowledge)
- **Filters**: Search input, material filter, confidence filter
- **Content Area**: Tab-specific content (scrollable)

### TemplateCard Component
- **Displays**: Template name, confidence badge, grid preview, dimensions, material preferences, success metrics, compatible system packs
- **Actions**: "Use Template" button, "Save" button
- **Grid Preview**: Visual representation of template grid (colored cells for cell types)

### TemplateDetails Component
- Grid visualization
- Dimension ranges (width/height)
- Material preferences with counts
- Success metrics (success rate, accuracy, issue count)
- Compatible system packs

### KnowledgeView Component
- Workshop insights dashboard
- Most common pattern display
- High success patterns list

---

## Filtering & Search

### Filters Applied
1. **Search Query**: Filters by template name or ID (case-insensitive)
2. **Material Filter**: `'all' | 'aluminum' | 'upvc'`
3. **Confidence Filter**: Minimum confidence percentage (default: 60%)

### Filter Logic
```typescript
const filteredTemplates = useMemo(() => {
  // Get templates based on active tab
  // Apply search filter
  // Apply material filter
  // Apply confidence filter
  return templates;
}, [activeTab, historyTemplates, recommendations, extractedTemplate, searchQuery, filterMaterial, minConfidence]);
```

---

## Integration with Drafting Engine

### Data Conversion (DraftingWorkbench → TemplateEditor)
```typescript
currentDesign = {
  geometry: draftingEngine.getGeometry(),
  template: draftingEngine.getAvailableTemplates().find(...),
  grid: convertDraftingToWindowGrid(geometry, template),
  dimensions: calculateDimensions(rectangles),
  systemPackId: selectedSystemPackId
}
```

### Template Selection (TemplateEditor → DraftingWorkbench)
```typescript
onTemplateSelected(template) => {
  draftingEngine.setTemplate(template.id);
  setActiveTab('2d'); // Switch to 2D drafting tab
}
```

---

## Performance Considerations

### Optimizations
- ✅ **Lazy Loading**: TemplateEditor is lazy-loaded
- ✅ **Memoization**: `filteredTemplates` uses `useMemo`
- ✅ **Code Splitting**: Component split from main bundle
- ✅ **Suspense Fallback**: Loading state while component loads

### Potential Issues
- ⚠️ **Jobs Loading**: Jobs loaded on mount - could be slow with large datasets
- ⚠️ **History Extraction**: Async operation without cancellation token
- ⚠️ **Knowledge Extraction**: Hardcoded workshop ID (`'current-workshop'`)
- ⚠️ **Template Conversion**: Runs on every render in mainContent useMemo

---

## Styling & Theme

### Current Theme
- **Background**: Light theme (`bg-gray-50`, `bg-white`)
- **Contrast**: Dark text on light background
- **Inconsistency**: DraftingWorkbench uses dark theme, TemplateEditor uses light theme

### UI Components
- Uses shadcn/ui components (Card, Button, Input, Select, Tabs, Badge)
- Material Design-inspired spacing and colors
- Grid preview with color-coded cell types

---

## Known Issues & TODOs

### Issues
1. **Hardcoded Workshop ID**: `'current-workshop'` should come from user context
2. **Theme Inconsistency**: Light theme in dark-themed workbench
3. **Error Handling**: Limited error handling for async operations
4. **Loading States**: Some operations don't show loading indicators

### TODOs (from code comments)
- Get workshop ID from user context (line 104)
- Improve error handling for template extraction failures

---

## Recommendations

### 1. Theme Consistency
- Match TemplateEditor styling to DraftingWorkbench dark theme
- Use amber/gold accent colors to match ALMONA prestige theme
- Update background colors: `bg-slate-900` instead of `bg-gray-50`

### 2. Performance Improvements
- Add cancellation tokens for async operations
- Implement pagination for history templates
- Debounce search input
- Cache extracted templates

### 3. Error Handling
- Add error boundaries
- Display user-friendly error messages
- Add retry mechanisms for failed operations

### 4. User Experience
- Add tooltips for template cards
- Show progress indicators for extraction operations
- Add keyboard shortcuts
- Implement template preview before selection

### 5. Integration Improvements
- Use actual workshop ID from user context
- Add template validation before saving
- Support template editing/editing capabilities
- Add template versioning

---

## File Structure

```
src/components/fabricator/drafting/
├── components/
│   └── TemplateEditor.tsx          # Main component (418 lines)
├── utils/
│   ├── templateExtractor.ts        # Template extraction logic
│   └── templateKnowledgeExtractor.ts # Knowledge extraction logic
└── DraftingWorkbench.tsx           # Integration point (lines 1216-1273)
```

---

## Summary

The Template Editor is a comprehensive tool for template management in the drafting workflow. It provides:
- ✅ Template extraction from current designs
- ✅ Historical pattern analysis
- ✅ AI/ML-based recommendations
- ✅ Workshop knowledge extraction
- ✅ Filtering and search capabilities
- ✅ Visual template previews

**Areas for improvement**:
- Theme consistency with workbench
- Performance optimizations for large datasets
- Better error handling
- User context integration (workshop ID)
- Enhanced UX with loading states and feedback
