import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useJobStatus } from '@/hooks/useJobStatus';
import { enqueueCuttingOptimization } from '@/lib/api/pythonHeavyClient';

interface OptimizationJobMonitorProps {
  jobId: string;
  onJobCompleted?: (result: any) => void;
  onJobFailed?: (error: string) => void;
}

/**
 * Real-time job status monitor using Supabase Realtime
 * Proof-of-concept for the new async architecture
 */
export function OptimizationJobMonitor({
  jobId,
  onJobCompleted,
  onJobFailed
}: OptimizationJobMonitorProps) {
  const { jobStatus, isLoading, error, isCompleted, isFailed, isProcessing, isPending } = useJobStatus(jobId);

  // Call callbacks when job state changes
  React.useEffect(() => {
    if (isCompleted && jobStatus?.result && onJobCompleted) {
      onJobCompleted(jobStatus.result);
    }
    if (isFailed && jobStatus?.error && onJobFailed) {
      onJobFailed(jobStatus.error);
    }
  }, [isCompleted, isFailed, jobStatus, onJobCompleted, onJobFailed]);

  if (isLoading && !jobStatus) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !jobStatus) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!jobStatus) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Job not found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (isFailed) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (isProcessing) return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-100 text-green-800 border-green-200';
    if (isFailed) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (isProcessing) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-muted text-muted-foreground';
  };

  const getProgressValue = () => {
    if (isCompleted) return 100;
    if (isFailed) return 0;
    if (isProcessing) return 75; // Estimate
    if (isPending) return 25; // Estimate
    return 0;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Optimization Job</span>
          <Badge className={getStatusColor()}>
            {jobStatus.status}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status with icon */}
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{jobStatus.message}</span>
        </div>

        {/* Progress bar */}
        {!isCompleted && !isFailed && (
          <div className="space-y-2">
            <Progress value={getProgressValue()} className="h-2" />
            <div className="text-xs text-muted-foreground text-center">
              {getProgressValue()}% complete
            </div>
          </div>
        )}

        {/* Job details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Job ID:</span>
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {jobId.slice(0, 8)}...
            </code>
          </div>

          {jobStatus.estimated_time_seconds && (
            <div className="flex justify-between">
              <span>Estimated time:</span>
              <span>{jobStatus.estimated_time_seconds}s</span>
            </div>
          )}

          {jobStatus.processing_time_seconds && (
            <div className="flex justify-between">
              <span>Processing time:</span>
              <span>{jobStatus.processing_time_seconds.toFixed(1)}s</span>
            </div>
          )}

          {jobStatus.created_at && (
            <div className="flex justify-between">
              <span>Started:</span>
              <span>{new Date(jobStatus.created_at).toLocaleTimeString()}</span>
            </div>
          )}

          {jobStatus.completed_at && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{new Date(jobStatus.completed_at).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Error display */}
        {isFailed && jobStatus.error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Job Failed</span>
            </div>
            <p className="text-sm text-destructive mt-1">{jobStatus.error}</p>
          </div>
        )}

        {/* Success display */}
        {isCompleted && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Job Completed Successfully!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Optimization results are ready for display.
            </p>
          </div>
        )}

        {/* Real-time indicator */}
        <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Real-time updates active</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple hook to demonstrate the async optimization flow
 */
export function useOptimizationJob() {
  const [currentJobId, setCurrentJobId] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<any>(null);

  const startOptimization = React.useCallback(async (request: any) => {
    try {
      const { job_id } = await enqueueCuttingOptimization(request);
      setCurrentJobId(job_id);
      setLastResult(null);
      return job_id;
    } catch (error) {
      console.error('Failed to start optimization:', error);
      throw error;
    }
  }, []);

  const clearJob = React.useCallback(() => {
    setCurrentJobId(null);
    setLastResult(null);
  }, []);

  return {
    currentJobId,
    lastResult,
    startOptimization,
    clearJob,
  };
}
