import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: 'page' | 'image' | 'model' | 'general';
}

interface LoadingContextType {
  loadingState: LoadingState;
  setLoading: (loading: Partial<LoadingState>) => void;
  clearLoading: () => void;
  withLoading: <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: Partial<LoadingState>
  ) => (...args: T) => Promise<R>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: 'Loading...',
    progress: 0,
    type: 'general'
  });

  const setLoading = useCallback((loading: Partial<LoadingState>) => {
    setLoadingState(prev => ({
      ...prev,
      ...loading
    }));
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      message: 'Loading...',
      progress: 0,
      type: 'general'
    });
  }, []);

  const withLoading = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<LoadingState> = {}
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        setLoading({
          isLoading: true,
          message: options.message || 'Loading...',
          progress: 0,
          type: options.type || 'general',
          ...options
        });

        const result = await fn(...args);
        return result;
      } finally {
        clearLoading();
      }
    };
  }, [setLoading, clearLoading]);

  const value: LoadingContextType = {
    loadingState,
    setLoading,
    clearLoading,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;
