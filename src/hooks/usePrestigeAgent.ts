/**
 * usePrestigeAgent Hook
 * React hook for interacting with YDT Prestige Agent API
 */

import { useCallback, useRef, useState } from 'react';

// YDT Agent API URL — never fall back to a dead Railway hostname.
const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_YDT_API_URL || import.meta.env.VITE_API_URL;
  if (configured) {
    return String(configured).replace(/\/$/, '');
  }
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:8000';
  }
  return '';
};

const API_BASE_URL = getApiBaseUrl();

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
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    persona: string = 'professor',
    language: string = 'en'
  ): Promise<ChatResponse> => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      if (!API_BASE_URL) {
        return {
          success: false,
          error: 'Prestige Agent is paused until the backend is deployed. Set VITE_YDT_API_URL or VITE_API_URL.',
        };
      }
      const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message,
          persona,
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
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success) {
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
      
      // Don't show toast for network errors - let component handle it
      console.debug('Chat error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to server. Please try again.' 
      };
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
      const response = await fetch(`${API_BASE_URL}/api/v1/gcode/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gcode_program: gcode,
          operation_type: operationType,
          material,
          language
        }),
      });

      const data = await response.json();
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
      const response = await fetch(`${API_BASE_URL}/api/v1/learn/modules?language=${language}`);
      const data = await response.json();
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
      const response = await fetch(`${API_BASE_URL}/api/v1/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          error_codes: errorCodes,
          language
        }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const getKnowledgeStats = useCallback(async () => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Prestige Agent backend is not configured.' };
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/knowledge/stats`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
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
      const response = await fetch(`${API_BASE_URL}/api/v1/machine/capabilities`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
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

