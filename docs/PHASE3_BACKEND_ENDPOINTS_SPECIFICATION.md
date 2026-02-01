# Phase 3 Enterprise Features - Backend API Endpoints Specification

**Date:** January 2026  
**Status:** 📋 **SPECIFICATION**  
**Purpose:** Detailed breakdown of backend API endpoints required for Phase 3 Enterprise Features components  
**Target Audience:** Backend developers, API architects

---

## Executive Summary

This document specifies all backend API endpoints required to fully integrate the Phase 3 Enterprise Features components. The frontend components are complete and production-ready, but require backend APIs for full functionality.

**Components Requiring Backend Integration:**
1. **FilterService** - Filter preset management
2. **BulkOperationToolbar** - Bulk operations service
3. **ProjectTemplates** - Template storage and management
4. **ProjectActivityTimeline** - Activity/audit tracking and comments

---

## 1. FilterService - Filter Preset Management

### Overview
FilterService currently uses localStorage for persistence. Backend API integration enables server-side preset storage, sharing, and cross-device synchronization.

### Endpoints Required

#### 1.1. Save Filter Preset
**Endpoint:** `POST /api/v2/filter-presets`  
**Method:** POST  
**Authentication:** Required (user-scoped)

**Request Body:**
```json
{
  "name": "Active Projects Q1 2026",
  "domain": "projects",
  "filters": {
    "domain": "projects",
    "projects": {
      "status": ["active"],
      "dateRange": {
        "from": "2026-01-01",
        "to": "2026-03-31"
      },
      "tags": ["urgent"]
    },
    "sort": {
      "field": "updatedAt",
      "dir": "desc"
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": "preset-uuid-123",
  "name": "Active Projects Q1 2026",
  "domain": "projects",
  "filters": { /* same as request */ },
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z",
  "userId": "user-uuid-456"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid filters format, missing required fields
- `401 Unauthorized`: Authentication required
- `409 Conflict`: Preset name already exists for user

**Implementation Notes:**
- Tenant-scoped (user can only see/modify their own presets)
- Validate filter structure matches FilterSet interface
- Maximum presets per user: 50 (configurable)
- Name must be unique per user (case-insensitive)

---

#### 1.2. List Filter Presets
**Endpoint:** `GET /api/v2/filter-presets?domain={domain}&limit={limit}`  
**Method:** GET  
**Authentication:** Required

**Query Parameters:**
- `domain` (optional): Filter by domain (`projects` | `positions`)
- `limit` (optional): Maximum results (default: 50, max: 100)

**Response (200 OK):**
```json
{
  "presets": [
    {
      "id": "preset-uuid-123",
      "name": "Active Projects Q1 2026",
      "domain": "projects",
      "filters": { /* FilterSet object */ },
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "total": 12,
  "limit": 50
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required

**Implementation Notes:**
- Return user's presets only (tenant-scoped)
- Sort by `updatedAt` descending (most recent first)
- Pagination can be added if needed (offset/cursor-based)

---

#### 1.3. Get Filter Preset
**Endpoint:** `GET /api/v2/filter-presets/{presetId}`  
**Method:** GET  
**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "preset-uuid-123",
  "name": "Active Projects Q1 2026",
  "domain": "projects",
  "filters": { /* FilterSet object */ },
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Preset belongs to different user
- `404 Not Found`: Preset not found

---

#### 1.4. Update Filter Preset
**Endpoint:** `PUT /api/v2/filter-presets/{presetId}`  
**Method:** PUT  
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Active Projects Q1 2026 (Updated)",
  "filters": { /* Updated FilterSet object */ }
}
```

**Response (200 OK):**
```json
{
  "id": "preset-uuid-123",
  "name": "Active Projects Q1 2026 (Updated)",
  "domain": "projects",
  "filters": { /* Updated filters */ },
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T14:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid filters format
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Preset belongs to different user
- `404 Not Found`: Preset not found
- `409 Conflict`: Name conflict (if name changed)

---

#### 1.5. Delete Filter Preset
**Endpoint:** `DELETE /api/v2/filter-presets/{presetId}`  
**Method:** DELETE  
**Authentication:** Required

**Response (204 No Content):**
- Empty body on success

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Preset belongs to different user
- `404 Not Found`: Preset not found

---

### Database Schema (Suggested)

```sql
CREATE TABLE filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(20) NOT NULL CHECK (domain IN ('projects', 'positions')),
  filters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, LOWER(name)),
  CONSTRAINT max_presets_per_user CHECK (
    (SELECT COUNT(*) FROM filter_presets WHERE user_id = user_id) <= 50
  )
);

CREATE INDEX idx_filter_presets_user_domain ON filter_presets(user_id, domain);
CREATE INDEX idx_filter_presets_user_updated ON filter_presets(user_id, updated_at DESC);
```

---

## 2. BulkOperationService - Bulk Operations API

### Overview
BulkOperationToolbar requires a backend service that handles async bulk operations (edit, export, delete, status change) with job tracking, progress updates, and error handling.

### Endpoints Required

#### 2.1. Start Bulk Operation
**Endpoint:** `POST /api/v2/bulk-operations`  
**Method:** POST  
**Authentication:** Required

**Request Body:**
```json
{
  "itemIds": ["project-uuid-1", "project-uuid-2", "project-uuid-3"],
  "operation": {
    "type": "status_change",
    "params": {
      "status": "archived"
    }
  }
}
```

**Supported Operation Types:**
- `edit`: Bulk edit fields (systemPack, color, etc.)
- `export`: Export to PDF/CSV/DXF
- `delete`: Bulk delete
- `status_change`: Change status for multiple items

**Export Operation Example:**
```json
{
  "itemIds": ["project-uuid-1", "project-uuid-2"],
  "operation": {
    "type": "export",
    "params": {
      "format": "pdf",
      "includeBOM": true,
      "includeDrawings": false
    }
  }
}
```

**Edit Operation Example:**
```json
{
  "itemIds": ["project-uuid-1", "project-uuid-2"],
  "operation": {
    "type": "edit",
    "params": {
      "fields": {
        "systemPackId": "new-system-pack-id",
        "color": "white"
      }
    }
  }
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "job-uuid-789",
  "status": "queued",
  "itemCount": 3,
  "operation": {
    "type": "status_change",
    "params": { "status": "archived" }
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "estimatedCompletion": "2026-01-15T10:30:05Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid operation, empty itemIds, invalid params
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions for operation
- `404 Not Found`: One or more itemIds not found
- `429 Too Many Requests`: Too many concurrent jobs (rate limit)

**Implementation Notes:**
- Validate all itemIds exist and user has permission
- Enforce tenant isolation (user can only operate on their tenant's items)
- Create async job (Celery task or background worker)
- Return immediately with jobId
- Job executes asynchronously
- Rate limiting: Max 5 concurrent jobs per user

---

#### 2.2. Get Bulk Operation Status
**Endpoint:** `GET /api/v2/bulk-operations/{jobId}`  
**Method:** GET  
**Authentication:** Required

**Response (200 OK):**
```json
{
  "jobId": "job-uuid-789",
  "status": "running",
  "progress": {
    "completed": 2,
    "total": 3,
    "percentage": 66.67
  },
  "operation": {
    "type": "status_change",
    "params": { "status": "archived" }
  },
  "result": {
    "succeeded": 2,
    "failed": 0,
    "errors": []
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "startedAt": "2026-01-15T10:30:01Z",
  "completedAt": null,
  "estimatedCompletion": "2026-01-15T10:30:04Z"
}
```

**Completed Job Response:**
```json
{
  "jobId": "job-uuid-789",
  "status": "completed",
  "progress": {
    "completed": 3,
    "total": 3,
    "percentage": 100
  },
  "operation": {
    "type": "export",
    "params": { "format": "pdf" }
  },
  "result": {
    "succeeded": 3,
    "failed": 0,
    "errors": [],
    "downloadUrl": "https://storage.example.com/exports/job-uuid-789.pdf",
    "downloadExpiresAt": "2026-01-16T10:30:00Z"
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "startedAt": "2026-01-15T10:30:01Z",
  "completedAt": "2026-01-15T10:30:03Z"
}
```

**Failed Job Response:**
```json
{
  "jobId": "job-uuid-789",
  "status": "failed",
  "progress": {
    "completed": 1,
    "total": 3,
    "percentage": 33.33
  },
  "operation": {
    "type": "delete",
    "params": {}
  },
  "result": {
    "succeeded": 1,
    "failed": 2,
    "errors": [
      {
        "itemId": "project-uuid-2",
        "message": "Project is locked and cannot be deleted"
      },
      {
        "itemId": "project-uuid-3",
        "message": "Insufficient permissions"
      }
    ]
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "startedAt": "2026-01-15T10:30:01Z",
  "completedAt": "2026-01-15T10:30:02Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Job belongs to different user
- `404 Not Found`: Job not found

**Implementation Notes:**
- Frontend should poll every 1.5-2 seconds while status is `running` or `queued`
- Stop polling when status is `completed`, `failed`, or `canceled`
- Include progress percentage for progress bar display
- For export operations, include downloadUrl and expiration
- For failed jobs, include detailed error list with itemId and message

---

#### 2.3. Cancel Bulk Operation
**Endpoint:** `POST /api/v2/bulk-operations/{jobId}/cancel`  
**Method:** POST  
**Authentication:** Required

**Response (200 OK):**
```json
{
  "jobId": "job-uuid-789",
  "status": "canceled",
  "progress": {
    "completed": 1,
    "total": 3,
    "percentage": 33.33
  },
  "result": {
    "succeeded": 1,
    "failed": 0,
    "canceled": 2,
    "errors": []
  },
  "canceledAt": "2026-01-15T10:30:02Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Job belongs to different user
- `404 Not Found`: Job not found
- `409 Conflict`: Job cannot be canceled (already completed/failed)

**Implementation Notes:**
- Only cancelable if status is `queued` or `running`
- Graceful cancellation: stop processing, mark as canceled
- Return partial results for items already processed

---

#### 2.4. Retry Failed Items
**Endpoint:** `POST /api/v2/bulk-operations/{jobId}/retry`  
**Method:** POST  
**Authentication:** Required

**Request Body (optional):**
```json
{
  "itemIds": ["project-uuid-2", "project-uuid-3"]
}
```
- If omitted, retries all failed items from original job

**Response (202 Accepted):**
```json
{
  "jobId": "job-uuid-790",
  "status": "queued",
  "itemCount": 2,
  "operation": {
    "type": "delete",
    "params": {}
  },
  "originalJobId": "job-uuid-789",
  "createdAt": "2026-01-15T10:35:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: No failed items to retry
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Original job belongs to different user
- `404 Not Found`: Original job not found

**Implementation Notes:**
- Creates new job with only failed items
- Applies same operation from original job
- Idempotent (safe to retry multiple times)
- Links to original job via `originalJobId`

---

#### 2.5. List Bulk Operation Jobs
**Endpoint:** `GET /api/v2/bulk-operations?status={status}&limit={limit}`  
**Method:** GET  
**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status (`queued`, `running`, `completed`, `failed`, `canceled`)
- `limit` (optional): Maximum results (default: 50, max: 100)

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "jobId": "job-uuid-789",
      "status": "completed",
      "operation": {
        "type": "export",
        "params": { "format": "pdf" }
      },
      "itemCount": 3,
      "progress": {
        "completed": 3,
        "total": 3,
        "percentage": 100
      },
      "createdAt": "2026-01-15T10:30:00Z",
      "completedAt": "2026-01-15T10:30:03Z"
    }
  ],
  "total": 25,
  "limit": 50
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required

**Implementation Notes:**
- Return user's jobs only (tenant-scoped)
- Sort by `createdAt` descending (most recent first)
- Pagination can be added if needed

---

### Database Schema (Suggested)

```sql
CREATE TABLE bulk_operation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')),
  operation_type VARCHAR(50) NOT NULL,
  operation_params JSONB NOT NULL,
  item_ids UUID[] NOT NULL,
  item_count INTEGER NOT NULL,
  progress_completed INTEGER NOT NULL DEFAULT 0,
  progress_total INTEGER NOT NULL,
  result_succeeded INTEGER DEFAULT 0,
  result_failed INTEGER DEFAULT 0,
  result_errors JSONB DEFAULT '[]'::jsonb,
  result_download_url TEXT,
  result_download_expires_at TIMESTAMP WITH TIME ZONE,
  original_job_id UUID REFERENCES bulk_operation_jobs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bulk_ops_user_status ON bulk_operation_jobs(user_id, status);
CREATE INDEX idx_bulk_ops_user_created ON bulk_operation_jobs(user_id, created_at DESC);
CREATE INDEX idx_bulk_ops_status ON bulk_operation_jobs(status) WHERE status IN ('queued', 'running');
```

---

## 3. ProjectTemplates - Template Management API

### Overview
ProjectTemplates component requires backend API for template storage, retrieval, creation, updating, and deletion. Templates store project structure/snapshots for reuse.

### Endpoints Required

#### 3.1. List Templates
**Endpoint:** `GET /api/v2/project-templates?category={category}&tags={tags}&search={search}&limit={limit}&offset={offset}&includePublic={includePublic}`  
**Method:** GET  
**Authentication:** Required (optional for public templates)

**Query Parameters:**
- `category` (optional): Filter by category (`residential`, `commercial`, `custom`, `standard`, `user`)
- `tags` (optional): Comma-separated tags (e.g., `tag1,tag2`)
- `search` (optional): Search in name, description, tags
- `limit` (optional): Maximum results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `includePublic` (optional): Include public templates (default: true)

**Response (200 OK):**
```json
{
  "templates": [
    {
      "id": "template-uuid-123",
      "name": "Standard Sliding Window",
      "description": "Standard 2-panel sliding window template",
      "category": "residential",
      "tags": ["sliding", "standard", "2-panel"],
      "thumbnail": "https://storage.example.com/templates/template-uuid-123/thumbnail.jpg",
      "authorId": "user-uuid-456",
      "authorName": "John Doe",
      "createdAt": "2026-01-10T08:00:00Z",
      "updatedAt": "2026-01-10T08:00:00Z",
      "usageCount": 42,
      "isPublic": true
    }
  ],
  "total": 87,
  "limit": 50,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required (if includePublic=false)

**Implementation Notes:**
- Return public templates + user's own templates
- Search across name, description, tags (full-text search recommended)
- Filter by category and tags (AND logic for multiple tags)
- Sort by usageCount descending (most used first), then updatedAt descending

---

#### 3.2. Get Template
**Endpoint:** `GET /api/v2/project-templates/{templateId}`  
**Method:** GET  
**Authentication:** Required (optional for public templates)

**Response (200 OK):**
```json
{
  "id": "template-uuid-123",
  "name": "Standard Sliding Window",
  "description": "Standard 2-panel sliding window template",
  "category": "residential",
  "tags": ["sliding", "standard", "2-panel"],
  "thumbnail": "https://storage.example.com/templates/template-uuid-123/thumbnail.jpg",
  "projectData": {
    /* Full project structure/snapshot */
    "systemPackId": "system-pack-uuid",
    "grid": { /* WindowGrid structure */ },
    "components": [ /* WindowComponent[] */ ],
    "settings": { /* Project settings */ }
  },
  "authorId": "user-uuid-456",
  "authorName": "John Doe",
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-10T08:00:00Z",
  "usageCount": 42,
  "isPublic": true
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required (if template is private)
- `403 Forbidden`: Template is private and belongs to different user
- `404 Not Found`: Template not found

**Implementation Notes:**
- Include full `projectData` for cloning
- Increment `usageCount` on access (optional, can be on clone only)
- Thumbnail URL should be signed/expiring for private templates

---

#### 3.3. Create Template from Project
**Endpoint:** `POST /api/v2/project-templates`  
**Method:** POST  
**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Custom Template",
  "description": "Template created from my project",
  "category": "custom",
  "tags": ["custom", "my-template"],
  "projectId": "project-uuid-789",
  "thumbnail": "data:image/jpeg;base64,..." // Optional: base64 image
}
```

**Response (201 Created):**
```json
{
  "id": "template-uuid-124",
  "name": "My Custom Template",
  "description": "Template created from my project",
  "category": "custom",
  "tags": ["custom", "my-template"],
  "thumbnail": "https://storage.example.com/templates/template-uuid-124/thumbnail.jpg",
  "authorId": "user-uuid-456",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z",
  "usageCount": 0,
  "isPublic": false
}
```

**Error Responses:**
- `400 Bad Request`: Invalid category, missing name, project not found
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have access to project
- `409 Conflict`: Template name already exists for user

**Implementation Notes:**
- Create template from existing project snapshot
- Validate user has access to source project
- Store full project structure as `projectData`
- If thumbnail provided (base64), upload to storage and store URL
- Generate thumbnail if not provided (optional: render project preview)
- Name must be unique per user (case-insensitive)

---

#### 3.4. Update Template Metadata
**Endpoint:** `PUT /api/v2/project-templates/{templateId}`  
**Method:** PUT  
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "category": "commercial",
  "tags": ["updated", "tags"],
  "thumbnail": "data:image/jpeg;base64,..." // Optional: new thumbnail
}
```

**Response (200 OK):**
```json
{
  "id": "template-uuid-124",
  "name": "Updated Template Name",
  "description": "Updated description",
  "category": "commercial",
  "tags": ["updated", "tags"],
  "thumbnail": "https://storage.example.com/templates/template-uuid-124/thumbnail.jpg",
  "updatedAt": "2026-01-15T14:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid category, invalid data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Template belongs to different user
- `404 Not Found`: Template not found
- `409 Conflict`: Name conflict (if name changed)

**Implementation Notes:**
- User can only update their own templates
- Cannot update `projectData` via this endpoint (use create from project)
- If thumbnail provided, replace existing thumbnail
- Update `updatedAt` timestamp

---

#### 3.5. Delete Template
**Endpoint:** `DELETE /api/v2/project-templates/{templateId}`  
**Method:** DELETE  
**Authentication:** Required

**Response (204 No Content):**
- Empty body on success

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Template belongs to different user (or is public/system template)
- `404 Not Found`: Template not found
- `409 Conflict`: Template is system template and cannot be deleted

**Implementation Notes:**
- User can only delete their own templates
- System templates (category: `standard`) cannot be deleted
- Delete thumbnail from storage
- Soft delete option: mark as deleted, don't return in listings (optional)

---

#### 3.6. Clone Template (Create Project from Template)
**Endpoint:** `POST /api/v2/project-templates/{templateId}/clone`  
**Method:** POST  
**Authentication:** Required

**Request Body:**
```json
{
  "projectName": "New Project from Template",
  "projectDescription": "Project created from template"
}
```

**Response (201 Created):**
```json
{
  "projectId": "project-uuid-790",
  "templateId": "template-uuid-123",
  "projectName": "New Project from Template",
  "createdAt": "2026-01-15T10:35:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid project name, missing required fields
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Template is private and belongs to different user
- `404 Not Found`: Template not found

**Implementation Notes:**
- Create new project from template's `projectData`
- Set project name/description from request
- Copy template structure (grid, components, settings)
- Increment template's `usageCount`
- Return new project ID (frontend navigates to project)
- Validate template is accessible (public or user's own)

---

#### 3.7. Upload Template Thumbnail
**Endpoint:** `POST /api/v2/project-templates/{templateId}/thumbnail`  
**Method:** POST  
**Content-Type:** `multipart/form-data`  
**Authentication:** Required

**Request:**
- `file`: Image file (JPEG, PNG, WebP)
- Max size: 5MB
- Recommended dimensions: 1280x720 or 16:9 ratio

**Response (200 OK):**
```json
{
  "thumbnail": "https://storage.example.com/templates/template-uuid-123/thumbnail.jpg",
  "updatedAt": "2026-01-15T14:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type, file too large
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Template belongs to different user
- `404 Not Found`: Template not found

**Implementation Notes:**
- Replace existing thumbnail
- Resize/optimize image (recommended: 1280x720, WebP format)
- Upload to object storage (S3, Supabase Storage, etc.)
- Generate signed URL for private templates

---

### Database Schema (Suggested)

```sql
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL CHECK (category IN ('residential', 'commercial', 'custom', 'standard', 'user')),
  tags TEXT[] DEFAULT '{}',
  thumbnail TEXT,
  project_data JSONB NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
  UNIQUE(author_id, LOWER(name)) WHERE deleted_at IS NULL
);

CREATE INDEX idx_project_templates_category ON project_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_templates_tags ON project_templates USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_templates_author ON project_templates(author_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_templates_public ON project_templates(is_public, category, usage_count DESC) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_project_templates_search ON project_templates USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, ''))) WHERE deleted_at IS NULL;
```

---

## 4. ProjectActivityTimeline - Activity Tracking API

### Overview
ProjectActivityTimeline requires backend API for activity/audit log storage, retrieval, filtering, comments, and revert operations.

### Endpoints Required

#### 4.1. List Project Activities
**Endpoint:** `GET /api/v2/projects/{projectId}/activities?type={type}&userId={userId}&from={from}&to={to}&search={search}&limit={limit}&offset={offset}`  
**Method:** GET  
**Authentication:** Required

**Query Parameters:**
- `type` (optional): Filter by activity type (`project_created`, `field_changed`, `status_changed`, `file_uploaded`, `comment_added`, `bulk_operation`, `reverted`)
- `userId` (optional): Filter by user ID (who made the change)
- `from` (optional): Start date (ISO 8601, e.g., `2026-01-01T00:00:00Z`)
- `to` (optional): End date (ISO 8601)
- `search` (optional): Search in activity descriptions, field names, comments
- `limit` (optional): Maximum results (default: 100, max: 500)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "activities": [
    {
      "id": "activity-uuid-123",
      "projectId": "project-uuid-789",
      "type": "field_changed",
      "title": "Field changed: System Pack",
      "description": "System Pack changed from 'Standard Aluminum' to 'Premium Aluminum'",
      "metadata": {
        "fieldName": "systemPackId",
        "oldValue": "system-pack-uuid-1",
        "newValue": "system-pack-uuid-2",
        "oldValueDisplay": "Standard Aluminum",
        "newValueDisplay": "Premium Aluminum"
      },
      "userId": "user-uuid-456",
      "userName": "John Doe",
      "userAvatar": "https://storage.example.com/avatars/user-uuid-456.jpg",
      "createdAt": "2026-01-15T10:30:00Z",
      "commentCount": 2,
      "canRevert": true
    },
    {
      "id": "activity-uuid-124",
      "projectId": "project-uuid-789",
      "type": "comment_added",
      "title": "Comment added",
      "description": "Please review the system pack change",
      "metadata": {
        "commentId": "comment-uuid-789",
        "commentText": "Please review the system pack change"
      },
      "userId": "user-uuid-457",
      "userName": "Jane Smith",
      "userAvatar": null,
      "createdAt": "2026-01-15T10:35:00Z",
      "commentCount": 0,
      "canRevert": false
    }
  ],
  "total": 127,
  "limit": 100,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have access to project
- `404 Not Found`: Project not found

**Implementation Notes:**
- Return activities in reverse chronological order (newest first)
- Filter by type, user, date range (inclusive)
- Search across title, description, field names, comments
- Include user info (name, avatar) for each activity
- Include comment count and revert capability flag
- Pagination for large activity lists

---

#### 4.2. Get Activity Details
**Endpoint:** `GET /api/v2/projects/{projectId}/activities/{activityId}`  
**Method:** GET  
**Authentication:** Required

**Response (200 OK):**
```json
{
  "id": "activity-uuid-123",
  "projectId": "project-uuid-789",
  "type": "field_changed",
  "title": "Field changed: System Pack",
  "description": "System Pack changed from 'Standard Aluminum' to 'Premium Aluminum'",
  "metadata": {
    "fieldName": "systemPackId",
    "oldValue": "system-pack-uuid-1",
    "newValue": "system-pack-uuid-2",
    "oldValueDisplay": "Standard Aluminum",
    "newValueDisplay": "Premium Aluminum"
  },
  "userId": "user-uuid-456",
  "userName": "John Doe",
  "userAvatar": "https://storage.example.com/avatars/user-uuid-456.jpg",
  "createdAt": "2026-01-15T10:30:00Z",
  "comments": [
    {
      "id": "comment-uuid-789",
      "text": "Please review the system pack change",
      "userId": "user-uuid-457",
      "userName": "Jane Smith",
      "createdAt": "2026-01-15T10:35:00Z"
    }
  ],
  "canRevert": true,
  "revertedBy": null,
  "revertedAt": null
}
```

**Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have access to project
- `404 Not Found`: Activity not found

**Implementation Notes:**
- Include full activity details and metadata
- Include all comments for this activity
- Include revert status (if reverted, include revertedBy and revertedAt)

---

#### 4.3. Add Comment to Activity
**Endpoint:** `POST /api/v2/projects/{projectId}/activities/{activityId}/comments`  
**Method:** POST  
**Authentication:** Required

**Request Body:**
```json
{
  "text": "Please review the system pack change"
}
```

**Response (201 Created):**
```json
{
  "id": "comment-uuid-790",
  "activityId": "activity-uuid-123",
  "text": "Please review the system pack change",
  "userId": "user-uuid-457",
  "userName": "Jane Smith",
  "userAvatar": null,
  "createdAt": "2026-01-15T10:40:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Empty comment text, text too long (max 5000 chars)
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have access to project
- `404 Not Found`: Activity not found

**Implementation Notes:**
- Create comment linked to activity
- Return comment with user info
- Update activity's comment count
- Optional: Notify activity creator and project owner (webhook/notification)

---

#### 4.4. Revert Activity
**Endpoint:** `POST /api/v2/projects/{projectId}/activities/{activityId}/revert`  
**Method:** POST  
**Authentication:** Required

**Request Body (optional):**
```json
{
  "comment": "Reverting due to error"
}
```

**Response (201 Created):**
```json
{
  "revertActivityId": "activity-uuid-125",
  "originalActivityId": "activity-uuid-123",
  "projectId": "project-uuid-789",
  "type": "reverted",
  "title": "Reverted: Field changed: System Pack",
  "description": "Reverted change: System Pack changed back to 'Standard Aluminum'",
  "metadata": {
    "revertedActivityId": "activity-uuid-123",
    "fieldName": "systemPackId",
    "revertedValue": "system-pack-uuid-1",
    "revertedValueDisplay": "Standard Aluminum"
  },
  "createdAt": "2026-01-15T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Activity cannot be reverted (type not revertable, already reverted)
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have permission to revert (or project access)
- `404 Not Found`: Activity not found
- `409 Conflict`: Project state has changed, revert may cause conflicts

**Implementation Notes:**
- Only certain activity types are revertable (`field_changed`, `status_changed`, etc.)
- Create new activity of type `reverted` that reverses the original change
- Update project state to previous value
- Mark original activity as reverted (set `revertedBy` and `revertedAt`)
- Validate project state hasn't changed in conflicting way (optional: conflict detection)
- Include optional comment explaining revert reason
- Return new revert activity

---

#### 4.5. Get Activity Groups (by Date)
**Endpoint:** `GET /api/v2/projects/{projectId}/activities/groups?groupBy={groupBy}&from={from}&to={to}`  
**Method:** GET  
**Authentication:** Required

**Query Parameters:**
- `groupBy` (optional): Grouping method (`date`, `user`, `type`) - default: `date`
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)

**Response (200 OK):**
```json
{
  "groups": [
    {
      "groupKey": "2026-01-15",
      "groupLabel": "Today",
      "activityCount": 12,
      "activities": [
        /* Activity objects */
      ]
    },
    {
      "groupKey": "2026-01-14",
      "groupLabel": "Yesterday",
      "activityCount": 8,
      "activities": [
        /* Activity objects */
      ]
    },
    {
      "groupKey": "2026-01-13",
      "groupLabel": "Jan 13, 2026",
      "activityCount": 5,
      "activities": [
        /* Activity objects */
      ]
    }
  ],
  "total": 25
}
```

**Error Responses:**
- `400 Bad Request`: Invalid groupBy value
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: User doesn't have access to project
- `404 Not Found`: Project not found

**Implementation Notes:**
- Group activities by date/user/type for timeline display
- Return grouped structure for efficient rendering
- Group labels: "Today", "Yesterday", date strings for older dates
- Include activity count per group
- Limit activities per group (e.g., 50) for performance

---

### Database Schema (Suggested)

```sql
CREATE TABLE project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reverted_by UUID REFERENCES auth.users(id),
  reverted_at TIMESTAMP WITH TIME ZONE,
  reverted_activity_id UUID REFERENCES project_activities(id)
);

CREATE TABLE activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES project_activities(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 5000),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_project_created ON project_activities(project_id, created_at DESC);
CREATE INDEX idx_activities_project_type ON project_activities(project_id, type);
CREATE INDEX idx_activities_project_user ON project_activities(project_id, user_id);
CREATE INDEX idx_activities_project_date ON project_activities(project_id, DATE(created_at));
CREATE INDEX idx_comments_activity ON activity_comments(activity_id, created_at ASC);
```

---

## Implementation Priority & Notes

### Priority Order
1. **BulkOperationService** - Highest priority (core enterprise feature)
2. **ProjectActivityTimeline** - High priority (audit trail, compliance)
3. **ProjectTemplates** - Medium priority (productivity feature)
4. **FilterService Presets** - Lower priority (enhancement, localStorage works)

### Common Implementation Patterns

#### Authentication & Authorization
- All endpoints require authentication (JWT token or session)
- Tenant isolation: Users can only access their tenant's data
- RBAC: Check user permissions for operations (e.g., delete, revert)

#### Error Handling
- Consistent error format:
  ```json
  {
    "error": "Error code",
    "message": "Human-readable error message",
    "details": { /* Optional additional details */ }
  }
  ```
- HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error)

#### Rate Limiting
- Bulk operations: Max 5 concurrent jobs per user
- Template creation: Max 100 templates per user
- Activity creation: No hard limit (audit trail)
- Filter presets: Max 50 presets per user

#### Performance
- Use database indexes for filtering/sorting
- Pagination for large result sets
- Async processing for bulk operations (Celery/background workers)
- Caching for frequently accessed templates (optional)
- Full-text search indexes for search functionality

#### Testing
- Unit tests for business logic
- Integration tests for API endpoints
- Test tenant isolation
- Test error cases and edge cases
- Test concurrent operations (bulk jobs)

---

**Document Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** ✅ **IMPLEMENTATION COMPLETE** (See `docs/PHASE3_BACKEND_IMPLEMENTATION_COMPLETE.md` for details)

**Implementation Status:**
- ✅ All 23 endpoints implemented across 4 services
- ✅ All routers registered and integrated
- ✅ Production-ready, error-free, type-safe
- ✅ Database migration created (`058_phase3_enterprise_features.sql`)
- ✅ Ready for frontend integration
