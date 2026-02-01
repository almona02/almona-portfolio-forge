import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, SystemPack, WindowUnit } from '@/types/fabricator';
import { useCallback, useEffect, useRef, useState } from 'react';

interface BOMCalculationResult {
  profiles: FabricationData['profiles'];
  glazing: FabricationData['glazing'];
  hardware: FabricationData['hardware'];
  cost: {
    materialCost: number;
    laborCost: number;
    hardwareCost: number;
    glazingCost: number;
    accessoriesCost: number;
    totalCost: number;
  };
}

interface UseBOMCalculationReturn {
  calculateBOM: (
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ) => Promise<BOMCalculationResult>;
  isCalculating: boolean;
  error: string | null;
}

export const useBOMCalculation = (): UseBOMCalculationReturn => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingPromises = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL('../workers/BOMCalculation.worker.ts', import.meta.url), {
      type: 'module',
    });

    // Handle messages from worker
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { jobId, status, result, error: workerError } = e.data;
      const promiseHandlers = pendingPromises.current.get(jobId);

      if (promiseHandlers) {
        if (status === 'success') {
          promiseHandlers.resolve(result);
        } else {
          promiseHandlers.reject(new Error(workerError));
        }
        pendingPromises.current.delete(jobId);
      }
    };

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const calculateBOM = useCallback(async (
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): Promise<BOMCalculationResult> => {
    setIsCalculating(true);
    setError(null);

    const jobId = crypto.randomUUID();

    return new Promise<BOMCalculationResult>((resolve, reject) => {
      if (!workerRef.current) {
        const err = new Error('BOM Worker not initialized');
        setError(err.message);
        setIsCalculating(false);
        reject(err);
        return;
      }

      // Store handlers
      pendingPromises.current.set(jobId, { 
        resolve: (res) => {
          setIsCalculating(false);
          resolve(res);
        },
        reject: (err) => {
          setIsCalculating(false);
          setError(err.message);
          reject(err);
        }
      });

      // Send job
      workerRef.current.postMessage({
        jobId,
        windowUnit,
        pattern,
        systemPack
      });
    });
  }, []);

  return { calculateBOM, isCalculating, error };
};
