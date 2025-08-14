import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: "page" | "component" | "critical";
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  buildVersion?: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `error_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({ errorInfo });

    // Create comprehensive error report
    const errorReport: ErrorReport = {
      errorId: this.state.errorId || "unknown",
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      buildVersion: import.meta.env.VITE_APP_VERSION || "unknown",
    };

    // Send to monitoring services
    this.reportError(errorReport);

    // Store error locally for debugging
    this.storeErrorLocally(errorReport);
  }

  private async reportError(errorReport: ErrorReport) {
    try {
      // Send to custom monitoring endpoint
      if (import.meta.env.VITE_ERROR_REPORTING_ENDPOINT) {
        await fetch(import.meta.env.VITE_ERROR_REPORTING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(errorReport),
        });
      }

      // Send to Google Analytics if available
      if (typeof gtag !== "undefined") {
        gtag("event", "exception", {
          description: errorReport.message,
          fatal: this.props.level === "critical",
          error_id: errorReport.errorId,
        });
      }

      // Console logging for development
      if (import.meta.env.DEV) {
        console.group("🚨 Error Report");
        console.error("Error ID:", errorReport.errorId);
        console.error("Message:", errorReport.message);
        console.error("Stack:", errorReport.stack);
        console.error("Component Stack:", errorReport.componentStack);
        console.error("Full Report:", errorReport);
        console.groupEnd();
      }
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem("almona_errors") || "[]"
      );
      existingErrors.push(errorReport);

      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem("almona_errors", JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn("Failed to store error locally:", storageError);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    } else {
      window.location.reload();
    }
  };

  private copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    navigator.clipboard
      .writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        // Could show a toast notification here
        console.log("Error details copied to clipboard");
      })
      .catch(() => {
        console.warn("Failed to copy error details");
      });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isComponentLevel = this.props.level === "component";
      const isCritical = this.props.level === "critical";

      return (
        <div
          className={`${
            isComponentLevel ? "p-4" : "min-h-screen"
          } flex items-center justify-center ${
            isCritical ? "bg-red-50" : "bg-gray-50"
          }`}
        >
          <div
            className={`max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center border ${
              isCritical ? "border-red-200" : "border-gray-200"
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isCritical ? "bg-red-100" : "bg-orange-100"
              }`}
            >
              <AlertTriangle
                className={`w-8 h-8 ${
                  isCritical ? "text-red-600" : "text-orange-600"
                }`}
              />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isCritical ? "Critical Error" : "Something went wrong"}
            </h2>

            <p className="text-gray-600 mb-4">
              {isCritical
                ? "A critical error occurred that requires immediate attention."
                : "We're sorry, but something unexpected happened. Please try again."}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 p-3 bg-gray-100 rounded text-left text-sm">
                <p className="font-mono text-red-600 mb-2">
                  {this.state.error.message}
                </p>
                {this.state.errorId && (
                  <p className="text-gray-500 text-xs">
                    Error ID: {this.state.errorId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {!isCritical && this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>

              {!isComponentLevel && (
                <button
                  onClick={() => (window.location.href = "/")}
                  className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </button>
              )}

              {import.meta.env.DEV && (
                <button
                  onClick={this.copyErrorDetails}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy Error Details
                </button>
              )}
            </div>

            {!import.meta.env.DEV && this.state.errorId && (
              <p className="mt-4 text-xs text-gray-500">
                Error ID: {this.state.errorId}
                <br />
                Please include this ID when reporting the issue.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
