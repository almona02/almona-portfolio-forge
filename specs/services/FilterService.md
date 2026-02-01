# Filter Service Spec — Advanced Faceted Filtering and State Persistence
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead

Objective
Provide an advanced, composable filter system for projects and positions with multi-select facets, combinations, URL synchronization, saved presets, and persistence. Filters must be fast, predictable, and resilient under large datasets.

Non-Functional Requirements
- Performance: Instant client application of filter state; server-side pagination for large datasets.
- Scalability: Efficient server queries with proper indexes; FE virtualization for large lists.
- UX: Clear filter affordances, filter pills, quick clear, save preset, keyboard-accessible.
- Resilience: Stable URLs for deep-linking and sharing; idempotent loading from URL or saved presets.
- Security: RBAC-aware filters; server enforces tenant scoping.
- Accessibility: All filter controls keyboard accessible; ARIA labels and roles; screen reader-friendly.

Domains & Facets
- Projects: status, date range, customer, system pack, tags
- Positions: dimensions (width/height), profile, material, production status, tags
- Common: text search coupling (optional), sort order

TypeScript Front-End Contract
/*
export type FilterDomain = 'projects' | 'positions';

export interface RangeNumber {
  min?: number;
  max?: number;
}

export interface DateRange {
  from?: string; // ISO 8601
  to?: string;   // ISO 8601
}

export interface ProjectFilters {
  status?: string[];        // e.g., ['active','archived','draft']
  dateRange?: DateRange;
  customerIds?: string[];
  systemPacks?: string[];
  tags?: string[];
}

export interface PositionFilters {
  material?: string[];      // e.g., ['aluminum','uPVC','glass']
  profile?: string[];
  productionStatus?: string[];
  width?: RangeNumber;
  height?: RangeNumber;
  tags?: string[];
}

export type FilterSet = {
  domain: FilterDomain;
  projects?: ProjectFilters;
  positions?: PositionFilters;
  sort?: { field: string; dir: 'asc' | 'desc' };
};

export interface FilterPreset {
  id: string;
  name: string;
  domain: FilterDomain;
  filters: FilterSet;
  createdAt: string;
  updatedAt: string;
}

export interface IFilterService {
  // State operations
  getCurrent(): FilterSet;
  set(filters: FilterSet): void;                  // programmatic set
  patch(partial: Partial<FilterSet>): void;       // partial update
  clear(domain?: FilterDomain): void;             // clear all or by domain

  // URL sync
  toQueryString(filters?: FilterSet): string;     // serialize to query params
  fromQueryString(qs: string): FilterSet;         // parse from query params
  syncToUrl(push?: boolean): void;                // write to window.location (SPA)
  loadFromUrl(): FilterSet;                       // read and apply

  // Persistence
  loadPersisted(): FilterSet | null;              // from localStorage or user profile
  persist(filters?: FilterSet): void;             // write to persistence

  // Presets (server-backed)
  savePreset(name: string, filters: FilterSet): Promise<{ id: string }>;
  listPresets(domain?: FilterDomain): Promise<FilterPreset[]>;
  deletePreset(id: string): Promise<void>;
}
*/

URL Serialization
- Flattening rules:
  - domain=projects|positions
  - For arrays: key[]=a&amp;key[]=b
  - For ranges: width.min=600&amp;width.max=1600
  - For dateRange: date.from=2026-01-01&amp;date.to=2026-01-31
  - Sort: sort.field=updatedAt&amp;sort.dir=desc
- Ensure stability and minimal noise: omit empty values; canonical ordering of params.

Server Integration
- Server endpoints should accept filter params consistent with SearchService or accept a JSON body (POST) for complex scenarios.
- Enforce RBAC and tenant scoping server-side.
- Return paginated results compatible with client components.

UX Requirements
- Filter Panel: accessible button to open; keyboard navigable; clear status of active filters.
- Multi-select: chip-style checkboxes with search for long lists.
- Date range: accessible date picker with keyboard support.
- Range sliders: numeric inputs with validation; aria-valuemin/max labels.
- Filter Pills: visible list of active filters; removable with keyboard; “Clear All” control.
- Save Preset: dialog to name preset; confirm overwrite for existing names; per-domain scope.

Accessibility
- ARIA roles for combobox/listbox; aria-selected and aria-checked states.
- Focus management when opening filter dropdown or panel; Esc closes.
- Screen reader announcements for filter added/removed.

Performance &amp; State
- Debounce expensive operations (e.g., applying complex filter combos) at 150–300ms.
- Use memoization for derived data; avoid recomputes when toggling.
- For very large datasets, rely on server filtering and pagination, not client filtering.

Validation &amp; Error Handling
- Validate ranges (min ≤ max).
- Validate dates, ensure from ≤ to.
- Gracefully handle corrupted URL params (ignore invalid values; log in dev).
- Show non-intrusive error toasts for preset save/delete failures.

Examples

Query String
// Projects: status active+draft, customerIds [1,2], date range
domain=projects&amp;status[]=active&amp;status[]=draft&amp;customerIds[]=1&amp;customerIds[]=2&amp;date.from=2026-01-01&amp;date.to=2026-01-31&amp;sort.field=updatedAt&amp;sort.dir=desc

Programmatic Patch
/*
filterService.patch({
  projects: { status: ['active','draft'] },
  sort: { field: 'updatedAt', dir: 'desc' }
});
filterService.syncToUrl(true);
*/

Preset Saving
/*
await filterService.savePreset('Active Jan Projects', filterService.getCurrent());
const presets = await filterService.listPresets('projects');
*/

Testing
- Unit: serialization/deserialization round-trip; range/date validation; patch/clear behaviors.
- Integration: URL sync in SPA routing; persistence across reload; presets lifecycle.
- E2E: cross-browser behavior; keyboard navigation; a11y roles/announcements.

Acceptance Criteria
- Filters serialize/deserialize reliably and idempotently via URL.
- Presets can be saved/listed/deleted with correct domain scoping.
- Filter UI remains responsive with instant feedback; server paginates results.
- Accessibility and keyboard navigation validated.
