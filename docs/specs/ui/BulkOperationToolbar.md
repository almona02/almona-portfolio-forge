# BulkOperationToolbar Component Spec — Enterprise Bulk Actions
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide a professional bulk operations toolbar that appears when items are selected, offering edit, export, delete, and status change actions with progress tracking, error handling, confirmation dialogs, and toast notifications. Integrates with BulkOperationService.

Non-Functional Requirements
- Performance: Show/hide instantly; progress updates smoothly; cancel operations quickly.
- UX: Clear action affordances; progress indication; error summaries; confirmation dialogs.
- Resilience: Handle partial successes; show detailed errors; support cancellation and retry.
- Accessibility: WCAG 2.1 AA; keyboard navigation; screen reader announcements.

Component Structure

BulkOperationToolbar Component
```
<BulkOperationToolbar
  selectedCount: number
  selectedIds: string[]
  onOperationComplete?: () => void
  className?: string
/>
```

Visual Design
- Position: Fixed above grid or floating at bottom
- Background: Design token surface (slate-800/900)
- Border: Top border (amber accent, design token)
- Height: 56-64px (compact) or auto (with progress)
- Actions: Button group (Edit, Export, Delete, Status)
- Count: "X items selected" badge/text

States

Hidden State
- No items selected
- Component not rendered or height: 0
- Smooth transition when appearing

Visible State (No Active Operation)
- Toolbar visible with actions
- Selection count displayed
- Action buttons enabled
- Clear selection button visible

Progress State (Operation Running)
- Progress bar visible
- Operation name displayed
- Progress percentage (0-100%)
- Cancel button visible
- Action buttons disabled

Completed State
- Success message or result
- Download button (for exports)
- Undo button (for applicable operations)
- Auto-dismiss after 3-5 seconds

Error State
- Error message displayed
- Error count (X items failed)
- Retry button for failed items
- Expandable error list
- Action buttons re-enabled

Actions

Edit
- Button: "Edit X items"
- Click: Open edit dialog with common fields
- Operation: BulkEditOperation (see BulkOperationService.md)
- Confirmation: Optional (show preview of changes)

Export
- Button: "Export X items"
- Click: Open export format selector (PDF/CSV/DXF)
- Operation: BulkExportOperation
- Progress: Track file generation
- Result: Download button when complete

Delete
- Button: "Delete X items" (destructive styling)
- Click: Open confirmation dialog
- Operation: BulkDeleteOperation
- Confirmation: Required (show item names, type "DELETE")
- Undo: Available for 5-10 minutes

Status Change
- Button: "Change Status"
- Click: Open status selector
- Operation: BulkStatusOperation
- Confirmation: Show preview of status change
- Undo: Available for 5-10 minutes

Clear Selection
- Button: "Clear" or "X"
- Click: Clear all selections
- Keyboard: Escape key (optional)

UX Patterns

Confirmation Dialogs
- Delete: Require explicit confirmation
  - Title: "Delete X items?"
  - Body: List first 5 item names, "and X more..."
  - Input: Type "DELETE" or checkbox confirmation
  - Actions: Cancel, Delete
- Status Change: Show preview
  - Title: "Change status to 'archived'?"
  - Body: "X items will be changed to 'archived'"
  - Actions: Cancel, Change Status
- Edit: Show field preview
  - Title: "Edit X items"
  - Body: Form with fields to update
  - Actions: Cancel, Save Changes

Progress Display
- Progress bar: 0-100% with percentage
- Status text: "Exporting... 45% (23 of 50 items)"
- Estimated time: "~30 seconds remaining" (if available)
- Cancel button: Always visible during operation
- aria-live="polite" for screen readers

Error Handling
- Error summary: "3 items failed, 47 succeeded"
- Expandable error list: Click to view details
- Error items: Show itemId and error message
- Retry button: Retry only failed items
- Clear errors: Dismiss error state

Result Display
- Success: Brief success message
- Export: Download button with file size
- Undo: Undo button (if applicable)
- Auto-dismiss: After 3-5 seconds
- Manual dismiss: Close button

Toast Notifications
- Operation started: "Exporting 50 items..."
- Operation complete: "Export complete. Download ready."
- Operation failed: "Export failed. 3 items had errors."
- Operation canceled: "Export canceled."
- Use toast library (e.g., sonner, react-hot-toast)

Accessibility

ARIA Attributes
- role="toolbar"
- aria-label="Bulk operations toolbar"
- aria-live="polite" for progress updates
- aria-live="assertive" for errors
- aria-busy="true/false" during operations

Screen Reader Support
- Announce selection count changes
- Announce operation start ("Exporting 50 items")
- Announce progress updates ("45% complete")
- Announce completion ("Export complete")
- Announce errors ("3 items failed")

Focus Management
- Focus first action button when toolbar appears
- Maintain focus during operations
- Return focus after dialog closes
- Focus cancel button during operation

Keyboard Navigation
- Tab: Navigate action buttons
- Enter/Space: Activate button
- Escape: Close dialogs, cancel operation
- Arrow keys: Navigate within dialogs

TypeScript Interface
```typescript
import { BulkJob, BulkOperation } from '@/services/BulkOperationService';

export interface BulkOperationToolbarProps {
  selectedCount: number;
  selectedIds: string[];
  onOperationComplete?: () => void;
  onSelectionClear?: () => void;
  className?: string;
}
```

Implementation Notes

Integration
- Integrate with BulkOperationService (see BulkOperationService.md)
- Use service for all bulk operations
- Poll job status or use WebSocket for progress
- Handle all operation types (edit, export, delete, status)

State Management
- Track active job (jobId, status, progress)
- Store operation result (download URL, errors, etc.)
- Manage confirmation dialog state
- Handle undo/redo state

Performance
- Show/hide toolbar instantly (CSS transitions)
- Smooth progress bar updates (requestAnimationFrame)
- Efficient polling (1-2s interval)
- Cancel requests promptly

Styling
- Use design tokens from colors.json
- Background: slate-800/900 (design token)
- Border: amber accent (design token)
- Buttons: Design token button styles
- Progress bar: Design token progress styles
- Destructive actions: Red/error color (design token)

Error Handling
- Display user-friendly error messages
- Show detailed errors in expandable list
- Support retry for failed items
- Handle network errors gracefully
- Handle cancellation gracefully

Testing Requirements

Unit Tests
- Toolbar visibility logic
- Action button functionality
- Confirmation dialog behavior
- Progress display updates
- Error handling

Integration Tests
- BulkOperationService integration
- Progress polling
- Cancellation flow
- Error recovery
- Undo/redo functionality

Accessibility Tests
- Keyboard navigation
- Screen reader announcements
- Focus management
- ARIA attributes

Acceptance Criteria
- Toolbar appears/disappears smoothly
- All actions work correctly
- Progress updates accurately
- Errors are displayed clearly
- Cancellation works promptly
- Confirmation dialogs are clear
- Accessible via keyboard and screen readers
- Integrates seamlessly with grid selection
