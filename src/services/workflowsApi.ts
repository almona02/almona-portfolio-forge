/**
 * Workflows API
 * 
 * Priority 3: Workflow Builder - Backend API Integration
 * Workflow storage, retrieval, creation, updating, deletion, and execution.
 */

import { supabase } from "@/lib/supabase";

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8003";
  }
  console.error(
    "⚠️ VITE_API_URL not set in production! API calls will fail."
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin;
};

const API_BASE = getApiBase();

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

/**
 * Workflow category
 */
export type WorkflowCategory =
  | "business"
  | "automation"
  | "approval"
  | "custom";

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
  };
}

/**
 * Workflow edge definition
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

/**
 * Workflow definition structure
 */
export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
}

/**
 * Workflow response from backend
 */
export interface WorkflowResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  workflow_data: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  is_template: boolean;
  version: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow list response
 */
export interface WorkflowListResponse {
  workflows: WorkflowResponse[];
  total: number;
}

/**
 * Create workflow request
 */
export interface WorkflowCreateRequest {
  name: string;
  description?: string;
  category?: WorkflowCategory;
  workflow_data?: Record<string, any>;
  is_active?: boolean;
  is_public?: boolean;
  is_template?: boolean;
}

/**
 * Update workflow request
 */
export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  category?: WorkflowCategory;
  workflow_data?: Record<string, any>;
  is_active?: boolean;
  is_public?: boolean;
  is_template?: boolean;
}

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Workflow execution response
 */
export interface WorkflowExecutionResponse {
  id: string;
  workflow_id: string;
  user_id: string;
  triggered_by?: string;
  status: WorkflowExecutionStatus;
  execution_data: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow execution list response
 */
export interface WorkflowExecutionListResponse {
  executions: WorkflowExecutionResponse[];
  total: number;
}

/**
 * Create workflow execution request
 */
export interface WorkflowExecutionCreateRequest {
  workflow_id: string;
  execution_data?: Record<string, any>;
}

/**
 * Workflow execution log status
 */
export type WorkflowExecutionLogStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Workflow execution log response
 */
export interface WorkflowExecutionLogResponse {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: WorkflowExecutionLogStatus;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

/**
 * Workflow execution logs response
 */
export interface WorkflowExecutionLogsResponse {
  logs: WorkflowExecutionLogResponse[];
  total: number;
}

/**
 * List workflows
 */
export async function listWorkflows(
  category?: WorkflowCategory,
  search?: string,
  is_active?: boolean,
  is_template?: boolean,
  limit: number = 50,
  offset: number = 0
): Promise<WorkflowListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (category) {
    params.append("category", category);
  }
  if (search) {
    params.append("search", search);
  }
  if (is_active !== undefined) {
    params.append("is_active", String(is_active));
  }
  if (is_template !== undefined) {
    params.append("is_template", String(is_template));
  }
  if (limit) {
    params.append("limit", String(limit));
  }
  if (offset) {
    params.append("offset", String(offset));
  }

  const url = `${API_BASE}/api/v2/workflows${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list workflows");
  }

  return await response.json();
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(
  workflowId: string
): Promise<WorkflowResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/workflows/${workflowId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get workflow");
  }

  return await response.json();
}

/**
 * Create workflow
 */
export async function createWorkflow(
  request: WorkflowCreateRequest
): Promise<WorkflowResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/workflows`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create workflow");
  }

  return await response.json();
}

/**
 * Update workflow
 */
export async function updateWorkflow(
  workflowId: string,
  request: WorkflowUpdateRequest
): Promise<WorkflowResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/workflows/${workflowId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update workflow");
  }

  return await response.json();
}

/**
 * Delete workflow
 */
export async function deleteWorkflow(
  workflowId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/workflows/${workflowId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete workflow");
  }
}

/**
 * Execute workflow
 */
export async function executeWorkflow(
  workflowId: string,
  executionData?: Record<string, any>
): Promise<WorkflowExecutionResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const request: WorkflowExecutionCreateRequest = {
    workflow_id: workflowId,
    execution_data: executionData || {},
  };

  const response = await fetch(`${API_BASE}/api/v2/workflows/${workflowId}/execute`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to execute workflow");
  }

  return await response.json();
}

/**
 * List workflow executions
 */
export async function listWorkflowExecutions(
  workflowId: string,
  status?: WorkflowExecutionStatus,
  limit: number = 50,
  offset: number = 0
): Promise<WorkflowExecutionListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  if (limit) {
    params.append("limit", String(limit));
  }
  if (offset) {
    params.append("offset", String(offset));
  }

  const url = `${API_BASE}/api/v2/workflows/${workflowId}/executions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list workflow executions");
  }

  return await response.json();
}

/**
 * Get workflow execution by ID
 */
export async function getWorkflowExecution(
  executionId: string
): Promise<WorkflowExecutionResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/workflows/executions/${executionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow execution ${executionId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get workflow execution");
  }

  return await response.json();
}

/**
 * Get workflow execution logs
 */
export async function getWorkflowExecutionLogs(
  executionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<WorkflowExecutionLogsResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (limit) {
    params.append("limit", String(limit));
  }
  if (offset) {
    params.append("offset", String(offset));
  }

  const url = `${API_BASE}/api/v2/workflows/executions/${executionId}/logs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow execution ${executionId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get workflow execution logs");
  }

  return await response.json();
}
