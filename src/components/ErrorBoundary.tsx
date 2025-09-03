import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { errorBoundaryTracker } from '@/lib/errorBoundaryPerformance';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  private renderStartTime: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track error boundary activation time
    errorBoundaryTracker.startMark(`ErrorBoundary:getDerivedStateFromError:${errorId}`);
    
    const state = { hasError: true, error, errorId };
    
    errorBoundaryTracker.endMark(`ErrorBoundary:getDerivedStateFromError:${errorId}`);
    
    return state;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const markName = `ErrorBoundary:componentDidCatch:${this.state.errorId}`;
    errorBoundaryTracker.startMark(markName);
    
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log performance impact
    const level = this.props.level || 'component';
    console.warn(`Error boundary activated at ${level} level:`, {
      error: error.message,
      componentStack: errorInfo.componentStack,
      level
    });
    
    errorBoundaryTracker.endMark(markName);
  }

  componentDidMount() {
    this.renderStartTime = performance.now();
  }

  componentDidUpdate() {
    // Track render performance when error state changes
    if (this.state.hasError && this.renderStartTime > 0) {
      const renderTime = performance.now() - this.renderStartTime;
      if (renderTime > 16) { // More than one frame (16ms at 60fps)
        console.warn(`Error boundary render took ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  handleReset = () => {
    const markName = `ErrorBoundary:reset:${this.state.errorId}`;
    errorBoundaryTracker.startMark(markName);
    
    this.setState({ hasError: false, error: undefined, errorId: undefined });
    
    errorBoundaryTracker.endMark(markName);
  };

  render() {
    this.renderStartTime = performance.now();
    
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              {import.meta.env.DEV && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm opacity-70">
                    Debug Info
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    Error ID: {this.state.errorId}
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
