/**
 * useYilmazExport — React Hook for Yilmaz CNC Export Pipeline
 *
 * Wraps YilmazExportPipeline with React state management,
 * progress tracking, and download triggers.
 *
 * Reads from useWorkflowStore for project + optimization data.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import {
  YilmazExportPipeline,
  type ExportFormat,
  type ExportPipelineConfig,
  type ExportResult,
  type PipelineProgress,
  type PreFlightResult,
} from '@/services/export/YilmazExportPipeline';
import { YilmazFileFormats, type ExportFile } from '@/services/export/YilmazFileFormats';
import type { YilmazMachineModel } from '@/integrations/yilmaz/YilmazGCodeGenerator';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseYilmazExportReturn {
  // State
  isReady: boolean;
  isExporting: boolean;
  progress: PipelineProgress;
  result: ExportResult | null;
  preFlight: PreFlightResult | null;
  error: string | null;

  // Config
  machineModel: YilmazMachineModel;
  format: ExportFormat;
  setMachineModel: (model: YilmazMachineModel) => void;
  setFormat: (format: ExportFormat) => void;
  setConfig: (config: Partial<ExportPipelineConfig>) => void;

  // Actions
  runPreFlight: () => PreFlightResult | null;
  runExport: () => Promise<ExportResult | null>;
  downloadAll: () => void;
  downloadFile: (file: ExportFile) => void;
  reset: () => void;

  // Data
  availableModels: ReturnType<typeof YilmazExportPipeline.getAvailableModels>;
}

// ─── Initial State ───────────────────────────────────────────────────────────

const INITIAL_PROGRESS: PipelineProgress = {
  stage: 'idle',
  percent: 0,
  message: 'Ready to export',
  messageAr: 'جاهز للتصدير',
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useYilmazExport(): UseYilmazExportReturn {
  const { currentProject, optimizationResult } = useWorkflowStore();

  const [machineModel, setMachineModel] = useState<YilmazMachineModel>('AIM-3410');
  const [format, setFormat] = useState<ExportFormat>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress>(INITIAL_PROGRESS);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [preFlightResult, setPreFlightResult] = useState<PreFlightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pipeline instance (memoized on config changes)
  const pipelineRef = useRef<YilmazExportPipeline | null>(null);

  const getPipeline = useCallback((): YilmazExportPipeline => {
    if (!pipelineRef.current) {
      pipelineRef.current = new YilmazExportPipeline({
        machineModel,
        format,
      });
    } else {
      pipelineRef.current.updateConfig({ machineModel, format });
    }
    return pipelineRef.current;
  }, [machineModel, format]);

  // Check if we have the required data
  const isReady = useMemo(
    () => !!(currentProject && optimizationResult && optimizationResult.cuttingPlan.length > 0),
    [currentProject, optimizationResult]
  );

  // Available models (static)
  const availableModels = useMemo(() => YilmazExportPipeline.getAvailableModels(), []);

  // ─── Pre-Flight ──────────────────────────────────────────────────────────

  const runPreFlight = useCallback((): PreFlightResult | null => {
    if (!currentProject || !optimizationResult) {
      setError('No project or optimization data available');
      return null;
    }

    setError(null);
    const pipeline = getPipeline();
    const result = pipeline.preFlight(currentProject, optimizationResult);
    setPreFlightResult(result);
    return result;
  }, [currentProject, optimizationResult, getPipeline]);

  // ─── Export ──────────────────────────────────────────────────────────────

  const runExport = useCallback(async (): Promise<ExportResult | null> => {
    if (!currentProject || !optimizationResult) {
      setError('No project or optimization data available');
      return null;
    }

    setError(null);
    setIsExporting(true);
    setResult(null);

    try {
      const pipeline = getPipeline();
      pipeline.onProgress((p) => setProgress(p));

      const exportResult = await pipeline.execute(currentProject, optimizationResult);
      setResult(exportResult);

      if (!exportResult.success) {
        setError('Export failed validation. Check pre-flight results.');
      }

      return exportResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown export error';
      setError(message);
      setProgress({
        stage: 'error',
        percent: 0,
        message: `Error: ${message}`,
        messageAr: `خطأ: ${message}`,
      });
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, optimizationResult, getPipeline]);

  // ─── Downloads ───────────────────────────────────────────────────────────

  const downloadAll = useCallback(() => {
    if (result?.files) {
      YilmazFileFormats.downloadBundle(result.files);
    }
  }, [result]);

  const downloadFile = useCallback((file: ExportFile) => {
    YilmazFileFormats.downloadFile(file);
  }, []);

  // ─── Config ──────────────────────────────────────────────────────────────

  const setConfig = useCallback((config: Partial<ExportPipelineConfig>) => {
    if (config.machineModel) setMachineModel(config.machineModel);
    if (config.format) setFormat(config.format);
    pipelineRef.current?.updateConfig(config);
  }, []);

  // ─── Reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setResult(null);
    setPreFlightResult(null);
    setError(null);
    setProgress(INITIAL_PROGRESS);
    setIsExporting(false);
  }, []);

  return {
    isReady,
    isExporting,
    progress,
    result,
    preFlight: preFlightResult,
    error,
    machineModel,
    format,
    setMachineModel,
    setFormat,
    setConfig,
    runPreFlight,
    runExport,
    downloadAll,
    downloadFile,
    reset,
    availableModels,
  };
}
