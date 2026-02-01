# ProjectActivityTimeline Component Spec — Enterprise Activity Tracking
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide a comprehensive activity timeline component that displays project history with attribution, change details, revert capabilities, and comment integration. Enables users to track project evolution and revert changes when needed.

Non-Functional Requirements
- Performance: Efficient rendering of 100+ activities; virtualized timeline; smooth scrolling.
- UX: Clear activity grouping; easy navigation; intuitive revert; comment threading.
- Scalability: Support 1000+ activities per project; pagination or infinite scroll.
- Accessibility: WCAG 2.1 AA; keyboard navigation; screen reader support.

Component Structure

ProjectActivityTimeline Component
```
<ProjectActivityTimeline
  projectId: string
  activities: Activity[]
  onRevert?: (activityId: string) => void
  onComment?: (activityId: string, comment: string) => void
  className?: string
/>
```

Visual Design
- Layout: Vertical timeline with left-aligned activities
- Timeline line: Vertical line connecting activities
- Activity cards: Left side, 280-320px width
- Grouping: Group activities by date/time
- Spacing: 16-24px between activities (design token spacing)

Activity Types

Project Created
- Icon: Plus or File
- Title: "Project created"
- Metadata: Creator, timestamp
- Details: Project name, initial settings

Field Changed
- Icon: Edit
- Title: "Field changed: {fieldName}"
- Metadata: User, timestamp
- Details: Old value → New value (diff display)

Status Changed
- Icon: Status icon (circle, checkmark, etc.)
- Title: "Status changed to {status}"
- Metadata: User, timestamp
- Details: Previous status → New status

File Uploaded
- Icon: Upload or File
- Title: "File uploaded: {fileName}"
- Metadata: User, timestamp
- Details: File name, size, type

Comment Added
- Icon: Message or Comment
- Title: "Comment added"
- Metadata: User, timestamp
- Details: Comment text, thread context

Bulk Operation
- Icon: Multiple items icon
- Title: "Bulk operation: {operation}"
- Metadata: User, timestamp
- Details: Item count, operation type, summary

Activity Card Structure

Header
- Icon: Activity type icon (left)
- Title: Activity description (bold)
- Timestamp: Relative time (e.g., "2 hours ago") or absolute
- User: Avatar and name (if applicable)

Body
- Details: Change details, diff, or description
- Metadata: Additional context (file size, item count, etc.)
- Attachments: Links to files, items, etc.

Actions (on hover or menu)
- Revert: Revert this change (if applicable)
- View Details: Expand for full details
- Comment: Add comment
- Share: Share activity link

UX Patterns

Timeline Navigation
- Scroll: Vertical scrolling through timeline
- Jump to date: Date picker or calendar
- Filter: Filter by activity type, user, date range
- Search: Search activity descriptions

Grouping
- By date: Group activities by date ("Today", "Yesterday", "Jan 15, 2026")
- By user: Optional grouping by user
- By type: Optional grouping by activity type
- Collapsible: Collapse/expand groups

Revert Functionality
- Button: "Revert" on applicable activities
- Click: Open confirmation dialog
- Confirmation: "Revert this change? This will {description}"
- Action: Create reverse activity, update project
- Result: New activity showing revert, update timeline

Comments
- Display: Comments below activity card
- Add: "Add comment" button or inline input
- Thread: Nested comments (optional)
- Mentions: @mention users (optional)
- Notifications: Notify mentioned users (optional)

Activity Details Expansion
- Click: Expand activity for full details
- Display: Complete change diff, metadata, related items
- Actions: Revert, comment, share
- Collapse: Click again to collapse

Filtering
- By type: Filter by activity type (created, changed, commented, etc.)
- By user: Filter by user (who made the change)
- By date: Date range picker
- Clear: Clear all filters

Accessibility

Keyboard Navigation
- Arrow keys: Navigate activities
- Enter: Expand activity details
- Tab: Navigate actions and filters
- Escape: Collapse expanded activity

ARIA Attributes
- role="list" for timeline
- role="listitem" for activities
- aria-label for activity descriptions
- aria-expanded for expandable details
- aria-live for new activities

Screen Reader Support
- Announce activity additions
- Describe activity changes clearly
- Announce revert actions
- Describe comment additions

TypeScript Interface
```typescript
export interface Activity {
  id: string;
  type: ActivityType;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;  // ISO 8601
  title: string;
  description?: string;
  details?: ActivityDetails;
  metadata?: Record<string, any>;
  canRevert?: boolean;
  comments?: Comment[];
}

export type ActivityType =
  | 'project_created'
  | 'field_changed'
  | 'status_changed'
  | 'file_uploaded'
  | 'comment_added'
  | 'bulk_operation'
  | 'reverted';

export interface ActivityDetails {
  field?: string;
  oldValue?: any;
  newValue?: any;
  diff?: string;  // Formatted diff
  file?: {
    name: string;
    size: number;
    type: string;
    url?: string;
  };
  operation?: {
    type: string;
    count: number;
    summary: string;
  };
}

export interface Comment {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  parentId?: string;  // For threaded comments
}

export interface ProjectActivityTimelineProps {
  projectId: string;
  activities: Activity[];
  onRevert?: (activityId: string) => void;
  onComment?: (activityId: string, comment: string) => void;
  onLoadMore?: () => void;
  className?: string;
  groupBy?: 'date' | 'user' | 'type' | 'none';
  filters?: ActivityFilters;
}
```

Implementation Notes

Performance
- Virtualize timeline for 100+ activities (react-window)
- Lazy load activity details
- Efficient diff rendering
- Pagination or infinite scroll
- Debounce filter inputs (300ms)

Integration
- Integrate with activity/audit service
- Real-time updates via WebSocket (optional)
- Revert functionality via project service
- Comments via comment service

Styling
- Use design tokens from colors.json and typography.json
- Timeline line: Design token border color
- Activity cards: Design token card styles
- Icons: Consistent icon set (lucide-react)
- Spacing: Design token spacing system

Revert Implementation
- Create reverse activity
- Update project state
- Add revert activity to timeline
- Handle conflicts gracefully
- Support undo of revert

Comments Integration
- Store comments with activities
- Support threaded comments (optional)
- Real-time comment updates (optional)
- Mention notifications (optional)

Testing Requirements

Unit Tests
- Activity rendering
- Timeline grouping
- Filter functionality
- Revert logic
- Comment functionality

Integration Tests
- Activity loading
- Revert operations
- Comment creation
- Real-time updates

Accessibility Tests
- Keyboard navigation
- Screen reader support
- Focus management

Acceptance Criteria
- Activities display correctly
- Timeline groups activities appropriately
- Revert works for applicable activities
- Comments can be added and displayed
- Filtering works correctly
- Keyboard navigation is smooth
- Accessible via keyboard and screen readers
- Responsive on all devices
- Performance is good with 100+ activities
