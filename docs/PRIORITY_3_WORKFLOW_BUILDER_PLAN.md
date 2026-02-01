# Priority 3: Workflow Builder - Implementation Plan

**Date:** January 2026  
**Status:** 🚧 **IN PROGRESS**  
**Priority:** P1 (Enterprise Feature)

---

## Overview

Implement a visual workflow builder that enables users to create, manage, and execute custom workflows for business process automation. This is an enterprise feature that improves workflow management capabilities.

**Reference:** Based on `UNIFIED_GOLD_TIER_IMPLEMENTATION_PLAN.md` (Day 1-4: Visual Workflow Builder)

---

## Current State Analysis

### Existing Infrastructure
- ✅ State Machine Framework (`src/core/state/StateMachine.ts`, `stateMachines.ts`)
- ✅ Notification Infrastructure (complete, can be integrated)
- ✅ Activity Log System (can be integrated for workflow execution tracking)
- ✅ ProductionWorkflow class (`src/lib/fabricator/ProductionWorkflow.ts`) - execution patterns

### Missing Components
- ❌ Workflow database schema (workflows, nodes, edges, executions)
- ❌ Workflow Builder UI components
- ❌ Workflow execution engine (backend)
- ❌ Workflow API endpoints
- ❌ Visual workflow designer (React Flow integration)

---

## Implementation Approach

Following Phase 3/4 patterns (repository, service, router architecture):

### Phase 1: Database Schema

**File:** `python_backend/migrations/061_workflows.sql`

**Tables:**
1. `workflows` - Workflow definitions
   - id, user_id, name, description, category
   - workflow_data (JSONB) - Full workflow definition (nodes, edges)
   - is_active, is_public, is_template
   - version, usage_count
   - created_at, updated_at, deleted_at

2. `workflow_executions` - Workflow execution instances
   - id, workflow_id, user_id, triggered_by
   - status (pending, running, completed, failed, cancelled)
   - execution_data (JSONB) - Current execution state
   - started_at, completed_at, error_message
   - created_at, updated_at

3. `workflow_execution_logs` - Execution step logs
   - id, execution_id, node_id, node_type
   - status (pending, running, completed, failed, skipped)
   - input_data, output_data (JSONB)
   - started_at, completed_at, error_message
   - created_at

**RLS Policies:**
- Users can view public workflows + their own
- Users can create/update/delete their own workflows
- Users can view their own executions
- Service role can manage workflow executions

**Indexes:**
- workflows: user_id, is_active, is_public, category, deleted_at
- workflow_executions: workflow_id, user_id, status, started_at
- workflow_execution_logs: execution_id, node_id, status

---

### Phase 2: Backend Implementation

**Pydantic Models:**
**File:** `python_backend/models/api_v2_models.py`

- `WorkflowNode` (BaseModel) - Node definition
- `WorkflowEdge` (BaseModel) - Edge/connection definition
- `WorkflowDefinition` (BaseModel) - Complete workflow structure
- `WorkflowResponse` - Workflow with metadata
- `WorkflowCreateRequest` - Create workflow request
- `WorkflowUpdateRequest` - Update workflow request
- `WorkflowListResponse` - List response with pagination
- `WorkflowExecutionResponse` - Execution status and data
- `WorkflowExecutionLogResponse` - Execution step log
- `WorkflowCategory` (Enum: business, automation, approval, custom)

**Repository:**
**File:** `python_backend/apis/v2/repositories/workflows_repository.py`

Methods:
- `insert_workflow()` - Create workflow
- `get_workflow_by_id()` - Get by ID (public + user's own)
- `list_workflows()` - List with filtering (category, search, is_active)
- `count_workflows()` - Count workflows
- `update_workflow()` - Update workflow
- `delete_workflow()` - Soft delete workflow
- `insert_execution()` - Create execution instance
- `get_execution_by_id()` - Get execution
- `update_execution()` - Update execution status
- `list_executions()` - List executions for workflow/user
- `insert_execution_log()` - Create execution log entry
- `get_execution_logs()` - Get logs for execution

**Service:**
**File:** `python_backend/apis/v2/services/workflow_service.py`

Business Logic:
- Workflow validation (nodes, edges, cycles)
- Workflow execution orchestration
- Node execution (start, task, decision, approval, notification, end)
- Condition evaluation
- Error handling and retries
- Integration with notification system
- Activity logging integration

**Router:**
**File:** `python_backend/apis/v2/workflows.py`

Endpoints (8 core endpoints):
- GET /workflows - List workflows (with filters)
- GET /workflows/{workflowId} - Get workflow by ID
- POST /workflows - Create workflow
- PUT /workflows/{workflowId} - Update workflow
- DELETE /workflows/{workflowId} - Delete workflow
- POST /workflows/{workflowId}/execute - Execute workflow
- GET /workflows/{workflowId}/executions - List executions
- GET /workflows/executions/{executionId} - Get execution status
- GET /workflows/executions/{executionId}/logs - Get execution logs

**Router Registration:**
- Add to `python_backend/apis/v2/routers/__init__.py`

---

### Phase 3: Frontend Implementation

**API Service:**
**File:** `src/services/workflowsApi.ts`

TypeScript types and async functions:
- `listWorkflows()` - List workflows with filters
- `getWorkflow()` - Get workflow by ID
- `createWorkflow()` - Create workflow
- `updateWorkflow()` - Update workflow
- `deleteWorkflow()` - Delete workflow
- `executeWorkflow()` - Execute workflow
- `getWorkflowExecutions()` - List executions
- `getWorkflowExecution()` - Get execution status
- `getWorkflowExecutionLogs()` - Get execution logs

**Components:**

1. **WorkflowBuilder.tsx** - Main builder component
   - Layout: Canvas area + Node palette + Properties panel
   - State management for workflow definition
   - Save/load workflow functionality
   - Validation feedback

2. **WorkflowCanvas.tsx** - React Flow canvas
   - React Flow integration (`reactflow` package)
   - Node rendering (custom node types)
   - Edge rendering and validation
   - Zoom, pan, minimap
   - Node selection and connection handling

3. **NodePalette.tsx** - Node library sidebar
   - Drag-drop node types
   - Node categories (Start/End, Task, Decision, Automation, Approval, Notification)
   - Search/filter nodes
   - Node descriptions

4. **NodeEditor.tsx** - Node configuration panel
   - Properties form based on node type
   - Condition builder for decision nodes
   - Action configuration for automation nodes
   - Approval configuration
   - Notification configuration

5. **WorkflowValidator.ts** - Validation engine
   - Validate workflow structure (must have start/end nodes)
   - Check for cycles (if not allowed)
   - Validate node connections
   - Validate node configurations
   - Return validation errors/warnings

**Integration:**
- Create Workflow Builder page/route (or integrate into existing workflow page)
- Connect to workflow API service
- Real-time execution status updates (if using WebSocket/Supabase realtime)

---

## Node Types

### 1. Start Node
- Entry point of workflow
- No configuration needed
- Must have exactly one outgoing edge

### 2. End Node
- Exit point of workflow
- No configuration needed
- Can have multiple incoming edges

### 3. Task Node
- Manual task assignment
- Configuration: task name, assignee, due date, description

### 4. Decision Node
- Conditional branching
- Configuration: condition expression, true/false branches
- Must have exactly two outgoing edges (true/false)

### 5. Automation Node
- Automated action
- Configuration: action type (email, update status, create record, etc.), action parameters

### 6. Approval Node
- Approval step
- Configuration: approver(s), approval type (single, multiple, majority), timeout

### 7. Notification Node
- Send notification
- Configuration: notification type, recipient, message template

---

## Workflow Data Structure

```typescript
interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    name: string;
    description?: string;
    version: string;
  };
}

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'decision' | 'automation' | 'approval' | 'notification';
  position: { x: number; y: number };
  data: {
    label: string;
    // Type-specific configuration
    config?: Record<string, any>;
  };
}

interface WorkflowEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  sourceHandle?: string; // for decision nodes: 'true' or 'false'
  label?: string;
}
```

---

## Success Criteria

- Backend API complete (9 endpoints)
- Workflow builder UI functional (React Flow canvas)
- Node palette with 7+ node types
- Node editor for configuration
- Workflow validation
- Workflow execution engine (basic execution)
- Code quality: zero errors, follows Phase 3/4 patterns
- Integration with notification system for notification nodes

---

## Implementation Order

1. **Database Schema** (migration file)
2. **Backend: Pydantic Models**
3. **Backend: Repository Layer**
4. **Backend: Service Layer**
5. **Backend: Router/API Endpoints**
6. **Frontend: API Service**
7. **Frontend: WorkflowBuilder Component (with React Flow)**
8. **Frontend: NodePalette Component**
9. **Frontend: NodeEditor Component**
10. **Frontend: WorkflowValidator**
11. **Integration: Connect to API and test**

---

## Dependencies

**Frontend:**
- `reactflow` - React Flow library for visual workflow builder
- `@reactflow/core` - Core React Flow components
- `@reactflow/controls` - Zoom/pan controls
- `@reactflow/background` - Background grid

**Backend:**
- Existing: FastAPI, Pydantic, Supabase
- Existing: Celery (for async workflow execution if needed)

---

## Notes

- Start with basic execution engine (sequential node execution)
- Advanced features (parallel execution, loops, sub-workflows) can be added later
- Integration with notification infrastructure for notification nodes
- Activity logging for workflow executions
- Workflow templates can be stored as workflows with `is_template = true`

---

**Last Updated:** January 2026  
**Status:** Planning Complete, Implementation Starting
