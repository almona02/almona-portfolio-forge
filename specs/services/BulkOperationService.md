# Bulk Operation Service Spec — Enterprise Multi-Item Operations
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead

Objective
Provide a robust, scalable bulk operation system for editing, exporting, deleting, and status-changing multiple items (projects, positions) with async job tracking, progress monitoring, cancellation, retries, idempotency, and safe error handling. Supports partial successes and undo/redo strategies.

Non-Functional Requirements
- Performance: Operations run asynchronously; jobs are polled or use WebSocket for progress updates. Target: start job < 200ms, progress updates every 500ms-2s.
- Scalability: Batch operations support 100-1000 items efficiently; use job queues for large batches.
- UX: Clear progress indication, cancellation affordances, error summaries, undo/redo support where applicable.
- Resilience: Idempotent operations; safe retries; partial success handling with detailed error reporting.
- Security: RBAC checks on all operations; tenant isolation; audit logging for all bulk operations.
- Accessibility: Progress announced via aria-live; keyboard-accessible controls; clear error messages.

Operation Types
- Edit: Update common fields across multiple items (e.g., tags, status, metadata)
- Export: Generate PDF/CSV/DXF files for selected items (async, progress-tracked)
- Delete: Remove items with confirmation and undo capability (soft delete recommended)
- Status Change: Change status field across items (e.g., active → archived)

TypeScript Front-End Contract
/*
export type BulkOperationType = 'edit' | 'export' | 'delete' | 'status';

export interface BulkEditOperation {
  op: 'edit';
  fields: Record<string, any>;  // field → value mapping
}

export interface BulkExportOperation {
  op: 'export';
  format: 'pdf' | 'csv' | 'dxf';
  options?: {
    includeDetails?: boolean;
    templateId?: string;
    watermark?: boolean;
  };
}

export interface BulkDeleteOperation {
  op: 'delete';
  softDelete?: boolean;  // default: true (recommended)
}

export interface BulkStatusOperation {
  op: 'status';
  status: string;  // target status value
}

export type BulkOperation =
  | BulkEditOperation
  | BulkExportOperation
  | BulkDeleteOperation
  | BulkStatusOperation;

export type BulkJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface BulkJobError {
  itemId: string;
  message: string;
  code?: string;  // error code for programmatic handling
}

export interface BulkJob {
  jobId: string;
  status: BulkJobStatus;
  progress: number;  // 0..100
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  errors?: BulkJobError[];  // errors for failed items
  result?: {
    // For export: download URL, file size, expiresAt
    // For edit/delete/status: summary of changes
    downloadUrl?: string;
    fileSize?: number;
    expiresAt?: string;
    summary?: Record<string, any>;
  };
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  estimatedCompletionAt?: string;  // ISO 8601
}

export interface IBulkOperationService {
  // Start a bulk operation
  start(itemIds: string[], operation: BulkOperation): Promise<BulkJob>;

  // Get job status (polling or WebSocket)
  getStatus(jobId: string): Promise<BulkJob>;

  // Cancel a running job
  cancel(jobId: string): Promise<BulkJob>;

  // Retry failed items from a job (if supported)
  retry(jobId: string, itemIds?: string[]): Promise<BulkJob>;

  // Get job history for user
  listJobs(options?: { status?: BulkJobStatus; limit?: number }): Promise<BulkJob[]>;
}
*/

Service Implementation Contract

Start Operation
- Endpoint: POST /api/bulk-operations
- Request Body:
  ```typescript
  {
    itemIds: string[];
    operation: BulkOperation;
  }
  ```
- Response: BulkJob (with status: 'queued' or 'running')
- Errors:
  - 400: Invalid operation or itemIds
  - 403: Insufficient permissions
  - 429: Too many concurrent jobs (rate limit)
- Behavior:
  - Validates itemIds (existence, permissions, tenant isolation)
  - Creates async job
  - Returns jobId immediately
  - Job executes asynchronously

Get Status
- Endpoint: GET /api/bulk-operations/{jobId}
- Response: BulkJob
- Errors:
  - 404: Job not found
  - 403: Not authorized to view job
- Behavior:
  - Returns current job status and progress
  - Polling recommended: 1-2s interval while running

Cancel Job
- Endpoint: POST /api/bulk-operations/{jobId}/cancel
- Response: BulkJob (updated status)
- Errors:
  - 404: Job not found
  - 409: Job cannot be canceled (already completed/failed)
- Behavior:
  - Cancels running job gracefully
  - Updates status to 'canceled'
  - Returns partial results if available

Retry Failed Items
- Endpoint: POST /api/bulk-operations/{jobId}/retry
- Request Body: { itemIds?: string[] }  // optional: retry specific items
- Response: BulkJob (new job for retry)
- Errors:
  - 404: Original job not found
  - 400: No failed items to retry
- Behavior:
  - Creates new job with only failed items
  - Applies same operation
  - Idempotent (safe to retry multiple times)

List Jobs
- Endpoint: GET /api/bulk-operations?status={status}&limit={limit}
- Response: BulkJob[]
- Errors: 403 if not authorized
- Behavior:
  - Returns user's jobs (tenant-scoped)
  - Filterable by status
  - Paginated (limit default: 50)

UX Patterns

Progress Display
- Show progress bar (0-100%)
- Display: "Processing X of Y items"
- Show estimated time remaining (if available)
- Allow cancellation (if status: 'running')
- Use aria-live="polite" for screen readers

Error Handling
- Show error summary if errors.length > 0
- Display: "X items failed, Y succeeded"
- Provide expandable error list (itemId + message)
- Offer retry button for failed items
- Use aria-live="assertive" for critical errors

Export Results
- Show download button when job.status === 'completed' and result.downloadUrl
- Display file size and expiration time
- Auto-download option (user preference)
- Clear indication if file expired

Confirmation Patterns
- Delete operations: Require explicit confirmation
  - Show count: "Delete 25 items?"
  - List first 5 item names
  - Require typing "DELETE" or checkbox confirmation
- Status changes: Show preview of changes
  - "Change status to 'archived' for 25 items?"
- Edit operations: Show field change preview
  - "Update 'tags' to ['urgent', 'production'] for 25 items?"

Undo/Redo Strategy
- For edit/delete/status operations: Store operation metadata
- Provide "Undo" action for 5-10 minutes after completion
- Undo creates reverse operation job
- Track undo history (limited depth)
- For exports: No undo (idempotent regeneration)

Accessibility
- Progress announcements via aria-live="polite"
- Error announcements via aria-live="assertive"
- Keyboard navigation for all controls
- Focus management during job lifecycle
- Screen reader-friendly progress and error messages

Performance Considerations
- Batch size limits: 100-1000 items per operation (configurable)
- Job queue: Use queue system for large batches
- Progress updates: Poll every 1-2s, or use WebSocket
- Cancellation: Graceful shutdown, cleanup resources
- Rate limiting: Max 3-5 concurrent jobs per user

Error Scenarios

Partial Success
- Operation completes but some items fail
- Status: 'completed' with errors array populated
- successfulItems + failedItems = totalItems
- Allow retry of failed items only

Timeout
- Long-running operations (e.g., export 1000 items)
- Job status: 'running' with progress updates
- Set reasonable timeout (e.g., 30 minutes)
- On timeout: status → 'failed', provide error message

Rate Limiting
- Too many concurrent jobs
- Return 429 with Retry-After header
- Queue job or reject with clear message
- Suggest waiting or reducing batch size

Permission Errors
- Some items not accessible
- Fail those items, continue with others
- Include permission errors in errors array
- Status: 'completed' (partial success)

Testing Requirements

Unit Tests
- Service contract implementation
- Error handling paths
- Idempotency verification
- Retry logic

Integration Tests
- End-to-end bulk operations
- Progress polling
- Cancellation flow
- Error recovery

Performance Tests
- Large batch operations (1000 items)
- Concurrent job handling
- Progress update frequency
- Cancellation responsiveness

Acceptance Criteria
- Bulk operations start within 200ms
- Progress updates every 1-2s while running
- Cancellation completes within 2s
- Error summaries are clear and actionable
- Export downloads are accessible and valid
- Undo/redo works for applicable operations
- All operations are audit-logged
- RBAC enforced on all operations
