/**
 * usePrestigeAgent Hook
 * React hook for interacting with YDT Prestige Agent API
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// YDT Agent API URL — prefer VITE_YDT_API_URL; never use Supabase REST as the agent host.
const getApiBaseUrl = () => {
  const ydt = import.meta.env.VITE_YDT_API_URL;
  if (ydt) {
    return String(ydt).replace(/\/$/, '');
  }
  const api = import.meta.env.VITE_API_URL;
  if (api && !/supabase\.(co|in)\b/i.test(String(api))) {
    return String(api).replace(/\/$/, '');
  }
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:8000';
  }
  return '';
};

const API_BASE_URL = getApiBaseUrl();
const API_PREFIX = '/api/v2/prestige';

// The UI uses camelCase persona ids; the API expects kebab-case.
const PERSONA_TO_API: Record<string, string> = {
  professor: 'professor',
  doctor: 'doctor',
  tourGuide: 'tour-guide',
  codeMaster: 'code-master',
  nervousSystem: 'nervous-system',
};

async function readAgentResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : data.error || `Agent request failed (HTTP ${response.status})`);
  }
  return data as T;
}

interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    confidence: number;
    persona: string;
    language: string;
    response_time: number;
    knowledge_sources: string[];
    suggested_actions: string[];
    visual_elements?: Record<string, any>;
    extras?: {
      has_examples: boolean;
      has_diagrams: boolean;
      has_exercises: boolean;
      difficulty_level: string;
    };
  };
  metadata?: {
    timestamp: string;
    session_id: string;
    engine_version: string;
    knowledge_base: {
      components: number;
      connections: number;
      spare_parts: number;
      accuracy: number;
    };
  };
  error?: string;
  aborted?: boolean;
}

interface GCodeValidationResponse {
  success: boolean;
  data?: {
    validation: any;
    optimal_parameters: any;
    explanations: Record<string, any>;
    suggested_improvements: string[];
  };
  error?: string;
}

interface LearningModulesResponse {
  success: boolean;
  data?: {
    modules: Array<{
      id: string;
      title: string;
      description: string;
      lessons: number;
      estimated_hours: number;
    }>;
    total_lessons: number;
    estimated_hours: number;
    certification_available: boolean;
    prerequisites: string[];
  };
  error?: string;
}

interface DiagnosisResponse {
  success: boolean;
  data?: {
    diagnosis: string;
    confidence: number;
    probable_causes: string[];
    immediate_actions: string[];
    repair_steps: string[];
    required_tools: string[];
    required_parts: string[];
    estimated_time: string;
    urgency: string;
    safety_warnings: string[];
  };
  error?: string;
}

export const usePrestigeAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unchecked' | 'checking' | 'connected' | 'unavailable'>('unchecked');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const sendMessage = useCallback(async (
    message: string,
    persona: string = 'professor',
    language: string = 'en'
  ): Promise<ChatResponse> => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    try {
      if (!API_BASE_URL) {
        return {
          success: false,
          error: 'Prestige Agent is paused until the backend is deployed. Set VITE_YDT_API_URL or VITE_API_URL.',
        };
      }
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        body: JSON.stringify({
          message,
          persona: PERSONA_TO_API[persona] ?? persona,
          language,
          session_id: sessionId,
          context: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success && typeof data.data?.response === 'string' && data.data.response.trim()) {
        setConnectionStatus('connected');
        return {
          success: true,
          data: data.data,
          metadata: data.metadata
        };
      } else {
        throw new Error(data.message || data.error || 'Unknown error');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, aborted: true };
      }
      
      setConnectionStatus('unavailable');
      // Let the component present the connection failure
      console.debug('Chat error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to server. Please try again.' 
      };
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [sessionId]);

  const validateGCode = useCallback(async (
    gcode: string,
    operationType: string,
    material: string = 'aluminum',
    language: string = 'en'
  ): Promise<GCodeValidationResponse> => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/gcode/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcode_program: gcode,
          operation_type: operationType,
          material,
          language
        }),
      });

      const data = await readAgentResponse<GCodeValidationResponse>(response);
      return data;
    } catch (error: any) {
      console.error('G-code validation error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getLearningModules = useCallback(async (language: string = 'en'): Promise<LearningModulesResponse> => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/learn/modules?language=${encodeURIComponent(language)}`);
      const data = await readAgentResponse<LearningModulesResponse>(response);
      return data;
    } catch (error: any) {
      console.error('Learning modules error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const diagnoseMachine = useCallback(async (
    symptoms: string[],
    errorCodes: string[] = [],
    language: string = 'en'
  ): Promise<DiagnosisResponse> => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          error_codes: errorCodes,
          language
        }),
      });

      const data = await readAgentResponse<DiagnosisResponse>(response);
      return data;
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getKnowledgeStats = useCallback(async () => {
    setConnectionStatus('checking');
    if (!API_BASE_URL) {
      setConnectionStatus('unavailable');
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/knowledge/stats`, {
        signal: AbortSignal.timeout(20000) // 20s — engine cold start can exceed 5s
      });
      if (!response.ok) {
        setConnectionStatus('unavailable');
        return { success: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const available = data.success === true && data.data?.knowledge_loaded === true;
      setConnectionStatus(available ? 'connected' : 'unavailable');
      return { ...data, success: available };
    } catch (error: any) {
      setConnectionStatus('unavailable');
      // Backend may not be available in development
      if (error.name !== 'AbortError') {
        // Only log if it's not a timeout/abort
        console.debug('Knowledge stats unavailable:', error.message);
      }
      return { success: false, error: (error as Error).message };
    }
  }, []);

  const getMachineCapabilities = useCallback(async () => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/machine/capabilities`, {
        signal: AbortSignal.timeout(20000) // 20s — engine cold start can exceed 5s
      });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      return data;
    } catch (error: any) {
      // Silently fail - backend may not be available in development
      if (error.name !== 'AbortError') {
        // Only log if it's not a timeout/abort
        console.debug('Capabilities unavailable:', error.message);
      }
      return { success: false, error: (error as Error).message };
    }
  }, []);

  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    sendMessage,
    connectionStatus,
    validateGCode,
    getLearningModules,
    diagnoseMachine,
    getKnowledgeStats,
    getMachineCapabilities,
    abortRequest,
    isLoading,
    sessionId
  };
};

