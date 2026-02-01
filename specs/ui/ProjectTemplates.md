# ProjectTemplates Component Spec — Enterprise Template Library
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide a professional project template library interface with template browsing, cloning, creation from existing projects, metadata editing, categories, and search. Enables users to quickly start new projects from proven templates.

Non-Functional Requirements
- Performance: Fast template loading; efficient image/thumbnail rendering; smooth navigation.
- UX: Clear template previews; easy cloning; intuitive metadata editing; search and filtering.
- Scalability: Support 100+ templates; efficient thumbnail loading; pagination or virtualization.
- Accessibility: WCAG 2.1 AA; keyboard navigation; screen reader support.

Component Structure

ProjectTemplates Component
```
<ProjectTemplates
  onTemplateSelect?: (template: ProjectTemplate) => void
  onCreateFromTemplate?: (templateId: string) => void
  className?: string
/>
```

Visual Design
- Layout: Grid of template cards (3-4 columns desktop)
- Template card: 280-320px width, 200-240px height
- Thumbnail: Top section (60-70% of card)
- Metadata: Bottom section (title, description, tags)
- Hover: Lift effect, show actions

Template Card Components
- Thumbnail: Preview image or generated visualization
- Title: Template name (typography-h3)
- Description: Brief description (1-2 lines)
- Tags: Category tags (badges)
- Actions: Clone, Preview, Edit (on hover or click)

Template Library Views

Grid View (Default)
- 3-4 columns on desktop
- 2 columns on tablet
- 1 column on mobile
- Scrollable grid with pagination or infinite scroll
- Search and filter bar at top

List View (Optional)
- Compact list with thumbnails
- More metadata visible
- Better for many templates
- Toggle between grid/list

Categories/Tags
- Filter by category (e.g., Residential, Commercial, Custom)
- Filter by tags (e.g., Sliding, Fixed, Large)
- Active filters displayed as pills
- Clear filters button

Search
- Search bar: Filter templates by name, description, tags
- Real-time filtering (debounced 300ms)
- Highlight matched text
- Clear search button

UX Patterns

Template Selection
- Click card: Open template preview/detail
- Hover: Show action buttons (Clone, Preview, Edit)
- Keyboard: Arrow keys to navigate, Enter to select

Clone Template
- Button: "Clone" or "Use Template"
- Click: Open clone dialog
- Dialog: Edit template name, select destination folder
- Action: Create new project from template
- Result: Navigate to new project

Create from Existing
- Button: "Create Template from Project"
- Click: Open project selector
- Select: Choose existing project
- Action: Save as template with metadata
- Result: Template added to library

Preview Template
- Button: "Preview"
- Click: Open preview modal/drawer
- Display: Full template details, thumbnail, metadata
- Actions: Clone, Edit, Close

Edit Template Metadata
- Button: "Edit" (if user has permission)
- Click: Open edit dialog
- Fields: Name, description, category, tags, thumbnail
- Save: Update template metadata
- Cancel: Discard changes

Template Metadata

Required Fields
- Name: Template name (string, required)
- Description: Brief description (string, optional)
- Category: Primary category (enum, required)

Optional Fields
- Tags: Array of tags (string[], optional)
- Thumbnail: Image URL or generated (string, optional)
- Author: Template creator (user ID, auto)
- Created At: Creation timestamp (datetime, auto)
- Updated At: Last update timestamp (datetime, auto)
- Usage Count: Number of times cloned (number, auto)

TypeScript Interface
```typescript
export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  thumbnail?: string;
  projectData: ProjectData;  // Template project structure
  authorId: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isPublic: boolean;  // Public templates vs user templates
}

export type TemplateCategory = 
  | 'residential'
  | 'commercial'
  | 'custom'
  | 'standard'
  | 'user';

export interface ProjectTemplatesProps {
  onTemplateSelect?: (template: ProjectTemplate) => void;
  onCreateFromTemplate?: (templateId: string) => void;
  onCreateFromExisting?: (projectId: string) => void;
  className?: string;
  showUserTemplates?: boolean;
  showPublicTemplates?: boolean;
}
```

Accessibility

Keyboard Navigation
- Arrow keys: Navigate template grid
- Enter: Select template
- Tab: Navigate action buttons
- Escape: Close dialogs

ARIA Attributes
- role="grid" for template grid
- aria-label for template cards
- aria-describedby for template descriptions
- aria-live for search results

Screen Reader Support
- Announce template selection
- Describe template metadata
- Announce search results count
- Describe actions available

Implementation Notes

Performance
- Lazy load template thumbnails
- Virtualize template grid for 50+ templates
- Cache template data
- Efficient search/filtering (client-side or API)

Integration
- Integrate with project service for cloning
- Store templates in database or file system
- Generate thumbnails from project data (optional)
- Track usage statistics

Styling
- Use design tokens from colors.json and typography.json
- Template cards: Design token card styles
- Hover effects: Design token hover styles
- Actions: Design token button styles

Thumbnail Generation
- Option 1: User-uploaded images
- Option 2: Generated from project visualization
- Option 3: Default placeholder image
- Lazy load thumbnails for performance

Testing Requirements

Unit Tests
- Template filtering
- Template search
- Clone functionality
- Metadata editing
- Category/tag filtering

Integration Tests
- Template creation from project
- Template cloning to project
- Template metadata updates
- Thumbnail generation

Accessibility Tests
- Keyboard navigation
- Screen reader support
- Focus management

Acceptance Criteria
- Templates load quickly
- Search and filter work correctly
- Clone creates new project successfully
- Metadata editing saves correctly
- Preview displays template details
- Keyboard navigation works smoothly
- Accessible via keyboard and screen readers
- Responsive on all devices
