import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasChunkError: boolean;
  retryCount: number;
}

export class ChunkLoadingErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasChunkError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    if (error.message.includes('Loading chunk') || 
        error.message.includes('Loading CSS chunk') ||
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Loading module')) {
      return { hasChunkError: true, retryCount: 0 };
    }
    return { hasChunkError: false, retryCount: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chunk loading error:', error, errorInfo);
    
    // Log chunk loading errors
    if (process.env.NODE_ENV === 'production') {
      console.error('Chunk loading error in production:', {
        error: error.message,
        stack: error.stack,
        retryCount: this.state.retryCount
      });
    }
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= 3) {
      this.setState({ retryCount: newRetryCount });
      
      // Clear the error and retry
      setTimeout(() => {
        this.setState({ hasChunkError: false });
        window.location.reload();
      }, 1000);
    } else {
      // After 3 retries, show permanent error
      this.setState({ hasChunkError: true });
    }
  };

  public render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-yellow-500 text-6xl mb-4">🔄</div>
            <h1 className="typography-h1 text-xl text-white mb-2">
              Loading Error
            </h1>
            <p className="text-gray-300 mb-4">
              Failed to load application resources. This might be due to a network issue or outdated cache.
            </p>
            
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors"
              >
                {this.state.retryCount >= 3 ? 'Max Retries Reached' : `Retry (${this.state.retryCount}/3)`}
              </button>
              
              <button
                onClick={() => {
                  // Clear all caches and reload
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => {
                        caches.delete(name);
                      });
                    });
                  }
                  window.location.reload();
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Clear Cache & Reload
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Go to Homepage
              </button>
            </div>
            
            {this.state.retryCount >= 3 && (
              <p className="text-red-400 text-sm mt-4">
                If the problem persists, please check your internet connection or try again later.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
