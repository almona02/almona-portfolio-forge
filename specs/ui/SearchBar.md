# SearchBar Component Spec — Enterprise Search Interface
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide a professional, accessible search bar component with debounced input, keyboard navigation, autocomplete suggestions, grouped results, recent search history, and comprehensive empty/error/loading states. Inspired by market leaders (GitHub, Linear, Notion).

Non-Functional Requirements
- Performance: 300ms debounce; cancel stale requests; virtualize result lists for 100+ items.
- UX: Keyboard-first navigation; clear visual hierarchy; instant feedback; smooth animations.
- Accessibility: WCAG 2.1 AA; keyboard navigation; screen reader announcements; focus management.
- Responsive: Mobile-friendly (full-width, touch targets, bottom sheet on mobile).

Component Structure

SearchBar Component
```
<SearchBar
  placeholder?: string
  domains?: SearchType[]  // ['projects', 'positions', 'history']
  onSearch?: (query: string) => void
  onSelect?: (item: SearchResultItem) => void
  recentSearches?: string[]
  savedSearches?: SavedSearch[]
  className?: string
/>
```

Visual Design
- Input field: Full-width or constrained width (e.g., 400-600px)
- Height: 40-44px (touch-friendly)
- Border: Focus ring using design tokens (amber-400)
- Icon: Search icon (left), clear button (right when text exists)
- Background: Design token background (slate-900/800)

States

Default State
- Empty input field
- Search icon visible (left)
- Placeholder text: "Search projects, positions, history..."
- No suggestions visible

Typing State (Active Search)
- Input value visible
- Clear button (X) visible (right)
- Debounced search triggered (300ms)
- Loading indicator (spinner) while searching
- Suggestions dropdown appears below input

Results State
- Suggestions dropdown visible
- Grouped results by domain (Projects, Positions, History)
- Keyboard navigation active
- Scrollable if many results (virtualized for 100+ items)

Empty State
- No results found message
- "Try different keywords" suggestion
- Show recent searches as fallback

Error State
- Error icon and message
- Retry button
- Fallback to recent searches

Loading State
- Spinner in input or dropdown
- Skeleton loaders for result items (optional)
- Disable input during search

UX Patterns

Debouncing
- Debounce delay: 300ms (configurable)
- Cancel previous request when new input
- Show loading indicator during debounce + request
- Immediate clear on backspace (no debounce)

Keyboard Navigation
- Enter: Select first result or execute search
- Arrow Down/Up: Navigate through suggestions
- Escape: Close suggestions, clear focus
- Tab: Move to next element (close suggestions)
- Ctrl/Cmd + K: Focus search bar (global shortcut)

Suggestions Display
- Max height: 400-500px (scrollable)
- Grouped by domain (Projects, Positions, History)
- Show max 5-10 items per group
- "Show all results" link at bottom
- Highlight matched text in results

Recent Searches
- Show when input is empty or focused
- Max 5-10 recent searches
- Click to execute search
- Clear history option

Saved Searches (Optional)
- Display as quick filters
- Icon indicator for saved searches
- Click to execute saved query
- Edit/delete options

Clear Button
- Visible when input has text
- Position: Right side of input
- Click: Clear input, close suggestions, focus input
- Keyboard: Tab-accessible

Accessibility

Keyboard Navigation
- Tab: Focus search input
- Escape: Close suggestions, maintain focus on input
- Arrow keys: Navigate suggestions (when dropdown open)
- Enter: Select highlighted suggestion
- Screen reader: Announce result count, loading state

ARIA Attributes
- role="searchbox"
- aria-label="Search projects, positions, and history"
- aria-autocomplete="list"
- aria-expanded="true/false" (suggestions visibility)
- aria-controls="search-results-list"
- aria-activedescendant="result-{id}" (keyboard navigation)

Screen Reader Announcements
- "Searching..." (loading state)
- "X results found" (results state)
- "No results found" (empty state)
- "Error searching. {message}" (error state)

Focus Management
- Focus input on mount (if configured)
- Maintain focus during keyboard navigation
- Return focus to input when closing suggestions
- Trap focus in suggestions dropdown (optional)

TypeScript Interface
```typescript
import { SearchResultItem, SearchType } from '@/services/SearchService';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  domains: SearchType[];
  createdAt: string;
}

export interface SearchBarProps {
  placeholder?: string;
  domains?: SearchType[];
  onSearch?: (query: string) => void;
  onSelect?: (item: SearchResultItem) => void;
  recentSearches?: string[];
  savedSearches?: SavedSearch[];
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;  // default: 300
  maxResults?: number;  // default: 10 per domain
}

export interface SearchBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}
```

Implementation Notes

Performance
- Use React.memo for result items
- Virtualize long result lists (react-window or similar)
- Cancel requests with AbortController
- Debounce with useDebouncedCallback or similar
- Lazy load suggestions (only when input focused)

Styling
- Use design tokens from colors.json and typography.json
- Focus ring: amber-400 (design token)
- Background: slate-900/800 (design token)
- Text: slate-100/300 (design token)
- Border: slate-700 (design token)

Integration
- Integrate with SearchService (see SearchService.md)
- Use search service for queries
- Handle errors gracefully
- Persist recent searches to localStorage

Responsive Behavior
- Desktop: Inline search bar (400-600px width)
- Mobile: Full-width search bar
- Mobile: Suggestions in bottom sheet or full-screen overlay
- Touch targets: Min 44px height

Error Handling
- Network errors: Show error message, allow retry
- API errors: Display user-friendly error message
- Timeout: Show timeout message, allow retry
- Empty results: Show empty state, suggest alternatives

Testing Requirements

Unit Tests
- Debounce behavior
- Keyboard navigation
- Clear button functionality
- Recent searches display

Integration Tests
- Search service integration
- Result display and selection
- Error handling
- Recent search persistence

Accessibility Tests
- Keyboard navigation
- Screen reader announcements
- Focus management
- ARIA attributes

Acceptance Criteria
- Search debounced at 300ms
- Keyboard navigation works smoothly
- Results display within 500ms (including debounce)
- Clear button functions correctly
- Recent searches persist and display
- Empty/error/loading states are clear
- Accessible via keyboard and screen readers
- Responsive on mobile devices
