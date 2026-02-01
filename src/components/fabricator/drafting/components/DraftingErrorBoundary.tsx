// src/components/fabricator/drafting/components/DraftingErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { logDraftingAction } from '../utils/constitutionalAudit';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

/**
 * Error Boundary specifically for Drafting Workbench
 * Provides constitutional audit logging and recovery mechanisms
 */
export class DraftingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `DRAFT-ERROR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Constitutional audit logging
    logDraftingAction(
      'error_boundary_triggered',
      {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack?.substring(0, 500) // Limit stack trace length
      },
      { errorId },
      'CHECKPOINT-ERROR-BOUNDARY'
    );

    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('DraftingErrorBoundary caught error:', error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in onError handler:', handlerError);
      }
    }

    // Constitutional audit logging
    logDraftingAction(
      'error_caught',
      {
        errorMessage: error.message,
        errorName: error.name,
        componentStack: errorInfo.componentStack?.substring(0, 1000),
        level: this.props.level || 'component'
      },
      { errorId: this.state.errorId },
      'CHECKPOINT-ERROR-CAUGHT'
    );
  }

  handleReset = () => {
    if (this.state.retryCount >= this.maxRetries) {
      // Max retries reached - force page reload
      window.location.reload();
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Log recovery attempt
    logDraftingAction(
      'error_recovery_attempt',
      {
        retryCount: this.state.retryCount + 1,
        maxRetries: this.maxRetries
      },
      { errorId: this.state.errorId },
      'CHECKPOINT-ERROR-RECOVERY'
    );
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const isCritical = this.props.level === 'critical';
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${isCritical ? 'bg-red-50' : 'bg-gray-50'}`}>
          <Alert variant="destructive" className="max-w-2xl">
            <div className="flex items-start gap-3">
              {isCritical ? (
                <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertTitle className="text-lg font-semibold mb-2">
                  {isCritical ? 'Critical Error in Drafting Workbench' : 'Error in Drafting Workbench'}
                </AlertTitle>
                <AlertDescription className="space-y-4">
                  <p className="text-sm">
                    {error?.message || 'An unexpected error occurred in the drafting workbench.'}
                  </p>

                  {canRetry && (
                    <div className="flex gap-2">
                      <Button
                        onClick={this.handleReset}
                        variant="default"
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Try Again ({retryCount + 1}/{this.maxRetries})
                      </Button>
                      <Button
                        onClick={this.handleReload}
                        variant="outline"
                      >
                        Reload Page
                      </Button>
                    </div>
                  )}

                  {!canRetry && (
                    <div>
                      <p className="text-sm text-yellow-700 mb-2">
                        Maximum retry attempts reached. Please reload the page.
                      </p>
                      <Button
                        onClick={this.handleReload}
                        variant="default"
                        className="w-full"
                      >
                        Reload Page
                      </Button>
                    </div>
                  )}

                  {import.meta.env.DEV && error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm opacity-70 mb-2">
                        Debug Info (Development)
                      </summary>
                      <div className="space-y-2">
                        <div>
                          <strong>Error ID:</strong> {errorId}
                        </div>
                        <div>
                          <strong>Error Name:</strong> {error.name}
                        </div>
                        <div>
                          <strong>Error Message:</strong> {error.message}
                        </div>
                        {error.stack && (
                          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                            {error.stack}
                          </pre>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64 mt-1">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

