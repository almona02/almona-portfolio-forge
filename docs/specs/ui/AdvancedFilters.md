# AdvancedFilters Component Spec — Enterprise Filtering Interface
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide an advanced filtering interface with multi-select filters, date range picker, filter pills, clear all functionality, saved presets, and full keyboard accessibility. Filters combine instantly and persist via URL sync and localStorage.

Non-Functional Requirements
- Performance: Instant client-side filter application; server-side pagination for filtered results.
- UX: Clear filter affordances; visual filter state; quick clear; save/load presets; keyboard-accessible.
- Persistence: URL synchronization for shareable links; localStorage for user preferences.
- Accessibility: WCAG 2.1 AA; keyboard navigation; screen reader-friendly; ARIA labels.

Component Structure

AdvancedFilters Component
```
<AdvancedFilters
  domain: 'projects' | 'positions'
  filters: FilterSet
  onFiltersChange: (filters: FilterSet) => void
  presets?: FilterPreset[]
  onSavePreset?: (name: string, filters: FilterSet) => void
  className?: string
/>
```

Visual Design
- Filter button: Badge with count indicator (e.g., "Filters (3)")
- Dropdown panel: 300-400px width, positioned below button
- Filter groups: Collapsible sections for each filter type
- Filter pills: Display active filters as removable pills above/below grid
- Clear all button: Visible when filters are active

Filter Types

Projects Filters
- Status: Multi-select checkbox list (active, archived, draft, etc.)
- Date Range: Date range picker (from/to dates)
- Customer: Multi-select with search (customer names/IDs)
- System Pack: Multi-select with search (system pack names/IDs)
- Tags: Multi-select tag selector with autocomplete

Positions Filters
- Material: Multi-select (aluminum, uPVC, glass, wood, etc.)
- Profile: Multi-select with search (profile names)
- Production Status: Multi-select (pending, in-progress, completed, etc.)
- Dimensions: Range inputs (width min/max, height min/max)
- Tags: Multi-select tag selector with autocomplete

UX Patterns

Filter Button
- Default: "Filters" (no badge if no filters active)
- Active: "Filters (3)" (badge with count of active filters)
- Click: Toggle dropdown panel
- Keyboard: Space/Enter to toggle
- Visual: Highlight when filters are active

Dropdown Panel
- Opens below filter button
- Contains collapsible filter groups
- Scrollable if many filter groups
- Click outside to close
- Escape key to close

Multi-Select Filters
- Checkbox list for each filter option
- Search input for long lists (e.g., customers, profiles)
- "Select all" / "Deselect all" options for lists
- Selected count indicator (e.g., "3 selected")
- Keyboard navigation through options

Date Range Picker
- Two date inputs (from/to)
- Calendar popup for date selection
- Keyboard input support (ISO 8601 format)
- Clear button for each date
- Validation: from <= to

Range Inputs (Dimensions)
- Two number inputs (min/max)
- Unit display (e.g., "mm" for dimensions)
- Validation: min <= max
- Clear button for each input

Filter Pills
- Display active filters as pills/chips
- Show filter type and value(s)
- Remove button (X) on each pill
- Click pill to edit that filter
- "Clear all" button at end
- Keyboard navigation (Arrow keys, Delete/Backspace to remove)

Clear All
- Button visible when any filters active
- Click: Clear all filters, close dropdown
- Keyboard: Accessible via Tab
- Confirmation: Optional (for many active filters)

Save Preset
- Button in dropdown footer
- Click: Open dialog to name preset
- Save current filter state
- Presets appear in dropdown header
- Load preset: Click preset to apply filters
- Delete preset: Context menu option

Keyboard Navigation
- Tab: Navigate through filter controls
- Arrow keys: Navigate within multi-select lists
- Space/Enter: Toggle checkboxes, open dropdowns
- Escape: Close dropdown, clear focus
- Delete/Backspace: Remove filter pills

Accessibility

ARIA Attributes
- role="button" for filter button
- aria-expanded="true/false" for dropdown state
- aria-label for filter button ("Filters (3 active)")
- role="dialog" or "menu" for dropdown panel
- aria-checked for checkboxes
- aria-label for filter pills

Screen Reader Support
- Announce filter count changes
- Describe filter state clearly
- Announce when filters are applied/cleared
- Describe preset actions

Focus Management
- Focus trap in dropdown when open
- Return focus to button when closing
- Focus first filter control when opening
- Maintain focus during keyboard navigation

TypeScript Interface
```typescript
import { FilterSet, FilterPreset } from '@/services/FilterService';

export interface AdvancedFiltersProps {
  domain: 'projects' | 'positions';
  filters: FilterSet;
  onFiltersChange: (filters: FilterSet) => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: FilterSet) => void;
  className?: string;
}
```

Implementation Notes

Performance
- Instant filter application (client-side state)
- Virtualize long filter option lists (100+ items)
- Debounce search inputs in filter dropdowns (300ms)
- Lazy load filter options if needed

Integration
- Integrate with FilterService (see FilterService.md)
- Use FilterService for URL sync and persistence
- Apply filters to data grid/list component
- Sync filters to URL query parameters

Styling
- Use design tokens from colors.json
- Filter button: Design token button styles
- Dropdown: Design token dialog/panel styles
- Filter pills: Design token badge/chip styles
- Focus rings: amber-400 (design token)

Persistence
- URL sync via FilterService.toQueryString()
- Load from URL on mount via FilterService.loadFromUrl()
- Save presets to user profile (via FilterService)
- Recent filters in localStorage (optional)

Responsive Behavior
- Desktop: Dropdown panel below button
- Mobile: Full-screen modal or bottom sheet
- Filter pills: Wrap to multiple lines
- Touch targets: Min 44px for all controls

Error Handling
- Validate date ranges (from <= to)
- Validate number ranges (min <= max)
- Show validation errors inline
- Prevent invalid filter states

Testing Requirements

Unit Tests
- Filter state management
- Multi-select functionality
- Date range validation
- Preset save/load
- Clear all functionality

Integration Tests
- FilterService integration
- URL sync behavior
- Preset persistence
- Filter application to data

Accessibility Tests
- Keyboard navigation
- Screen reader announcements
- Focus management
- ARIA attributes

Acceptance Criteria
- Filters apply instantly to data
- Filter state persists in URL
- Presets save and load correctly
- Filter pills display and remove correctly
- Clear all works as expected
- Keyboard navigation is smooth
- Accessible via keyboard and screen readers
- Responsive on mobile devices
