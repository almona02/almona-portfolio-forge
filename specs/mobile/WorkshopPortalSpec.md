# Workshop Portal Specification — Enterprise Shop Floor Interface
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Define a comprehensive workshop portal specification for shop floor usage with today's jobs dashboard, quick status updates, QR code scanning for remnants, issue photo capture, offline/PWA support, and large-button UI optimized for mobile devices. Enables workshop staff to interact with the system efficiently on mobile devices.

Non-Functional Requirements
- Performance: Fast loading (< 2s on 4G); smooth interactions (60fps); efficient battery usage.
- UX: Large-button UI; simple workflows; minimal taps; clear feedback.
- Reliability: Offline support (PWA); data sync when online; error handling.
- Usability: Optimized for one-handed use; clear visual hierarchy; minimal cognitive load.

Screens

Today's Jobs Dashboard

Purpose
- Display production jobs scheduled for today
- Quick overview of job status
- Easy access to job details

Layout
- Header: Date, refresh button, filter button
- Job cards: List of jobs (scrollable)
- Each job card: Job ID, customer name, status, priority, actions
- Bottom navigation: Jobs, Scan, Issues, Settings

Job Card Structure
- Job ID: Large, prominent (typography-h3)
- Customer name: Secondary text
- Status badge: Color-coded (pending, in-progress, completed, on-hold)
- Priority indicator: High/Medium/Low (optional)
- Quick actions: Start, Pause, Complete, View Details
- Progress indicator: Visual progress bar (optional)

Data Display
- Jobs sorted by: Priority → Start time
- Status colors: Design token colors (success, warning, error, info)
- Refresh: Pull-to-refresh or manual refresh button
- Filters: By status, by worker, by priority

Quick Status Screen

Purpose
- Quick status updates for jobs
- Minimal input required
- Fast workflow

Layout
- Job selector: Large dropdown or card list
- Status selector: Large buttons (Start, Pause, Complete, On Hold)
- Notes field: Optional text input (large textarea)
- Submit button: Large, prominent button

Workflow
1. Select job (tap job card or dropdown)
2. Select status (tap status button)
3. Add notes (optional, tap textarea)
4. Submit (tap submit button)
5. Confirmation: Toast notification or success message

QR Scan Screen

Purpose
- Scan QR codes on material remnants
- Link remnants to jobs
- Track material usage

Layout
- Camera view: Full-screen camera preview
- Overlay: Scan frame (guide for QR code placement)
- Instructions: "Point camera at QR code" (clear, visible)
- Manual entry: Button to manually enter QR code
- History: Recent scans (optional)

Features
- QR code detection: Real-time detection
- Feedback: Visual/audio feedback on successful scan
- Error handling: Retry on failed scan
- Manual entry: Fallback for damaged QR codes
- Linking: Link remnant to job/material

Issue Photo Capture Screen

Purpose
- Capture photos of production issues
- Attach photos to jobs
- Document problems for resolution

Layout
- Camera view: Full-screen camera preview
- Capture button: Large, prominent button (bottom center)
- Gallery button: Access photo gallery (bottom left)
- Job selector: Select job to attach photo (top)
- Description field: Optional text input (below camera)
- Submit button: Submit photo with description

Features
- Camera access: Request camera permission
- Photo capture: Capture photo (high quality)
- Photo preview: Preview before submitting
- Retake: Option to retake photo
- Gallery: Access device gallery
- Multiple photos: Support multiple photos per issue
- Compression: Compress photos for upload

Flows

Job Status Update Flow
1. User opens "Quick Status" screen
2. User selects job (from list or search)
3. User selects new status (large buttons)
4. User adds notes (optional)
5. User taps "Update Status" button
6. System validates and updates status
7. System shows success message
8. System syncs to server (if online)
9. System stores locally (if offline, sync later)

QR Scan Flow
1. User opens "Scan" screen
2. User points camera at QR code
3. System detects QR code (real-time)
4. System shows preview of scanned data
5. User confirms scan
6. System links remnant to job/material
7. System shows success message
8. System syncs to server (if online)

Issue Photo Capture Flow
1. User opens "Issues" screen
2. User taps "Report Issue" button
3. User selects job (if not pre-selected)
4. User opens camera
5. User captures photo
6. User previews photo
7. User adds description (optional)
8. User taps "Submit" button
9. System uploads photo (if online) or stores locally (if offline)
10. System creates issue record
11. System shows success message

Offline/PWA Constraints

Offline Support
- Service Worker: Cache critical assets and data
- Local Storage: Store job data locally
- Sync Queue: Queue updates for sync when online
- Offline Indicator: Show offline status clearly

Data Synchronization
- Auto-sync: Sync when connection restored
- Manual sync: Manual sync button (optional)
- Conflict resolution: Handle conflicts (last-write-wins or manual resolution)
- Sync status: Show sync status and pending items

PWA Features
- Install prompt: Allow installation to home screen
- Offline page: Fallback page when offline
- Background sync: Sync in background (if supported)
- Push notifications: Notifications for job updates (optional)

Large-Button UI

Button Sizing
- Primary actions: 56×56px minimum (large, prominent)
- Secondary actions: 48×48px minimum
- Touch targets: 44×44px minimum (all interactive elements)
- Spacing: 16px minimum between buttons

Button Styles
- Background: Design token button colors (primary, secondary)
- Text: Large, bold text (16-18px minimum)
- Icons: 24×24px icons (if used)
- Feedback: Clear visual feedback on touch
- Disabled: Clear disabled state

Layout Principles
- Single column: Stack buttons vertically
- Center alignment: Center buttons (easy thumb access)
- Bottom placement: Primary actions near bottom (thumb zone)
- Spacing: Generous spacing (16-24px)

Visual Hierarchy
- Primary actions: Most prominent (larger, bold, primary color)
- Secondary actions: Less prominent (smaller, secondary color)
- Destructive actions: Red/warning color, confirmation required
- Disabled actions: Grayed out, non-interactive

TypeScript Interface
```typescript
export interface WorkshopJob {
  id: string;
  jobNumber: string;
  customerName: string;
  status: JobStatus;
  priority: 'high' | 'medium' | 'low';
  scheduledDate: string;  // ISO 8601
  assignedWorker?: string;
  progress?: number;  // 0-100
}

export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';

export interface QRScanResult {
  code: string;
  type: 'remnant' | 'material' | 'job';
  linkedId?: string;
  timestamp: string;  // ISO 8601
}

export interface IssuePhoto {
  id: string;
  jobId: string;
  photoUrl: string;
  description?: string;
  timestamp: string;  // ISO 8601
  synced: boolean;
}

export interface WorkshopPortalProps {
  userId: string;
  onJobUpdate?: (jobId: string, status: JobStatus) => void;
  onQRScan?: (result: QRScanResult) => void;
  onIssueReport?: (issue: IssuePhoto) => void;
}
```

Device Test Plan

iOS Devices
- iPhone SE (small screen): Test layout, touch targets, performance
- iPhone 13/14 (standard): Test standard experience
- iPhone 13/14 Pro Max (large screen): Test large screen layout
- iPad (tablet): Test tablet layout, orientation

Android Devices
- Small Android (480px width): Test small screen layout
- Standard Android (720-1080px): Test standard experience
- Large Android/Tablet: Test large screen layout
- Various Android versions: Test compatibility (latest 2 versions)

Test Scenarios

Functional Tests
- Job list loads correctly
- Status updates work
- QR scanning works
- Photo capture works
- Offline mode works
- Sync works when online

Performance Tests
- Load time < 2s on 4G
- Smooth scrolling (60fps)
- Camera performance (QR scan, photo capture)
- Battery usage acceptable

Usability Tests
- Buttons easily tappable
- Navigation intuitive
- Workflows efficient
- Error handling clear
- Feedback clear

Accessibility Tests
- Screen reader support (VoiceOver, TalkBack)
- Touch targets accessible
- Color contrast sufficient
- Text readable

Implementation Notes

Camera Integration
- Use device camera API (getUserMedia)
- Handle permissions gracefully
- Fallback to file input if camera unavailable
- Optimize camera performance

QR Code Scanning
- Use QR code library (e.g., jsQR, qr-scanner)
- Real-time detection (requestAnimationFrame)
- Handle multiple QR codes (if needed)
- Error handling for failed scans

Photo Capture
- Use device camera API
- Compress photos before upload
- Store photos locally (if offline)
- Upload when online

Offline Support
- Service Worker for caching
- IndexedDB for local storage
- Sync queue for updates
- Conflict resolution strategy

Performance Optimization
- Lazy load camera (only when needed)
- Optimize images (compression, formats)
- Virtualize job lists (if many jobs)
- Debounce/throttle handlers

Styling
- Use design tokens (colors, typography, spacing)
- Large touch targets (44×44px minimum)
- Clear visual hierarchy
- Responsive layouts

Testing Requirements

Unit Tests
- Job status updates
- QR code scanning logic
- Photo capture logic
- Offline sync logic

Integration Tests
- End-to-end workflows
- Camera integration
- Offline/online sync
- Error handling

Device Tests
- iOS devices (various models)
- Android devices (various models)
- Tablet devices
- Orientation handling

Accessibility Tests
- Screen reader support
- Touch target accessibility
- Color contrast
- Keyboard navigation (external keyboards)

Acceptance Criteria
- Jobs dashboard loads and displays correctly
- Status updates work smoothly
- QR scanning works reliably
- Photo capture works correctly
- Offline mode functions properly
- Sync works when online
- Buttons are easily tappable
- Navigation is intuitive
- Performance targets met (< 2s load, 60fps)
- Accessibility requirements met
- Device compatibility verified
