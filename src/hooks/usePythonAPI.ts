import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface PartIdentificationResult {
  success: boolean;
  data: {
    detections: Array<{
      bbox: [number, number, number, number];
      confidence: number;
      class_id: number;
      class_name: string;
      center: [number, number];
    }>;
    image_info: {
      width: number;
      height: number;
      channels: number;
    };
    model_info: {
      framework: string;
      confidence_threshold: number;
    };
  };
  message: string;
}

interface UsePythonAPIReturn {
  identifyPart: (file: File, confidenceThreshold?: number) => Promise<PartIdentificationResult>;
  preprocessImage: (file: File, operation?: string) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}

export const usePythonAPI = (): UsePythonAPIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifyPart = useCallback(async (file: File, confidenceThreshold = 0.7): Promise<PartIdentificationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('confidence_threshold', confidenceThreshold.toString());

      const response = await fetch(`${import.meta.env.VITE_PYTHON_API_URL}/api/v1/identify-part`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to identify part');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to identify part');
      }

      toast({
        title: 'Success',
        description: 'Part identified successfully',
        variant: 'default',
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const preprocessImage = useCallback(async (file: File, operation = 'enhance'): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('operation', operation);

      const response = await fetch(`${import.meta.env.VITE_PYTHON_API_URL}/api/v1/preprocess-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to preprocess image');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to preprocess image');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    identifyPart,
    preprocessImage,
    isLoading,
    error,
  };
};
