/**
 * Error Boundary Component
 * 
 * Gold Tier Implementation:
 * - Catches React errors and prevents app crashes
 * - Provides user-friendly error messages
 * - Logs errors for debugging
 * - Graceful degradation
 * 
 * Purpose: Prevent unhandled errors from crashing the application
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service (if available)
    // In production, this would send to Sentry, LogRocket, etc.
    if (import.meta.env.PROD) {
      // TODO: Integrate with error tracking service
      // trackError('ErrorBoundary', error.message, errorInfo);
    }

    // Show toast notification
    toast.error('An error occurred', {
      description: error.message || 'Something went wrong. Please try again.',
      duration: 5000,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const { error, errorInfo } = this.state;
      const { level = 'component' } = this.props;

      // Critical errors show full page error
      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <Alert variant="destructive" className="max-w-2xl bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <AlertTitle className="text-xl text-red-400 mb-2">Critical Error</AlertTitle>
              <AlertDescription className="text-red-400/80 space-y-4">
                <p>
                  A critical error occurred. The application cannot continue safely.
                </p>
                {error && (
                  <div className="mt-4 p-3 bg-red-500/5 rounded border border-red-500/20">
                    <p className="text-sm font-mono text-red-300/70">
                      {error.message || 'Unknown error'}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      // Component-level errors show inline error
      return (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Error</AlertTitle>
          <AlertDescription className="text-red-400/80 space-y-2">
            <p>
              {error?.message || 'Something went wrong. Please try again.'}
            </p>
            {import.meta.env.DEV && errorInfo && (
              <details className="mt-2">
                <summary className="text-xs text-red-400/60 cursor-pointer">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-2 bg-red-500/5 rounded text-xs font-mono text-red-300/70 overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                onClick={this.handleReset}
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

// Default export for backward compatibility
export default ErrorBoundary;

