import React, { memo, useState, useEffect } from 'react';
import { Progress } from '@/shared/ui/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Loader2, FileText, Download, X } from 'lucide-react';

interface PDFGenerationProgressProps {
  isGenerating: boolean;
  progress: number;
  stage: string;
  onCancel?: () => void;
  onDownload?: () => void;
  fileName?: string;
  error?: string;
}

export const PDFGenerationProgress = memo<PDFGenerationProgressProps>(({
  isGenerating,
  progress,
  stage,
  onCancel,
  onDownload,
  fileName,
  error
}) => {
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (isGenerating) {
      setShowProgress(true);
    } else if (!isGenerating && progress === 100) {
      // Auto-close faster after completion (especially important for mobile)
      setTimeout(() => setShowProgress(false), 800);
    }
  }, [isGenerating, progress]);

  if (!showProgress && !error) return null;

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'preparing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'processing':
        return <FileText className="w-4 h-4" />;
      case 'finalizing':
        return <Download className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'preparing':
        return 'text-blue-500';
      case 'processing':
        return 'text-amber-500';
      case 'finalizing':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md sm:max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {error ? (
                <>
                  <X className="w-5 h-5 text-red-500" />
                  PDF Generation Failed
                </>
              ) : (
                <>
                  {getStageIcon(stage)}
                  Generating PDF
                </>
              )}
            </CardTitle>
            {onCancel && isGenerating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <div className="text-red-500 text-sm">
                {error}
              </div>
              <Button
                onClick={() => setShowProgress(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${getStageColor(stage)}`}>
                    {stage}
                  </span>
                  <span className="text-gray-500">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              {fileName && (
                <div className="text-sm text-gray-600 text-center">
                  Creating: {fileName}
                </div>
              )}
              
              {progress === 100 && onDownload && (
                <div className="text-center text-sm text-green-600 font-medium">
                  PDF downloaded successfully!
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

PDFGenerationProgress.displayName = 'PDFGenerationProgress';
