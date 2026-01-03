import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  type: 'page' | 'component' | 'api' | 'global';
}

interface LoadingContextType {
  loadingStates: Map<string, LoadingState>;
  setLoading: (key: string, loading: boolean, message?: string, type?: LoadingState['type']) => void;
  setProgress: (key: string, progress: number) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  isAnyLoading: () => boolean;
  getLoadingState: (key: string) => LoadingState | undefined;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(key);
      return newStates;
    });
    
    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(key);
    }
  }, []);

  const setLoading = useCallback((
    key: string, 
    loading: boolean, 
    message: string = '', 
    type: LoadingState['type'] = 'component'
  ) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      
      if (loading) {
        newStates.set(key, {
          isLoading: true,
          message,
          type,
          progress: undefined
        });
        
        // Auto-clear loading after 30 seconds to prevent stuck states
        const timeoutId = setTimeout(() => {
          clearLoading(key);
        }, 30000);
        
        timeoutRefs.current.set(key, timeoutId);
      } else {
        newStates.delete(key);
        
        // Clear timeout if exists
        const timeoutId = timeoutRefs.current.get(key);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutRefs.current.delete(key);
        }
      }
      
      return newStates;
    });
  }, [clearLoading]);

  const setProgress = useCallback((key: string, progress: number) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(key);
      
      if (currentState) {
        newStates.set(key, {
          ...currentState,
          progress: Math.max(0, Math.min(100, progress))
        });
      }
      
      return newStates;
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    setLoadingStates(new Map());
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  }, []);

  const isAnyLoading = useCallback(() => {
    return loadingStates.size > 0;
  }, [loadingStates]);

  const getLoadingState = useCallback((key: string) => {
    return loadingStates.get(key);
  }, [loadingStates]);

  return (
    <LoadingContext.Provider value={{
      loadingStates,
      setLoading,
      setProgress,
      clearLoading,
      clearAllLoading,
      isAnyLoading,
      getLoadingState
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Convenience hook for component-specific loading
export const useComponentLoading = (componentName: string) => {
  const { setLoading, getLoadingState, clearLoading } = useLoading();
  
  const setComponentLoading = useCallback((loading: boolean, message?: string) => {
    setLoading(componentName, loading, message, 'component');
  }, [componentName, setLoading]);
  
  const isLoading = getLoadingState(componentName)?.isLoading ?? false;
  
  return {
    isLoading,
    setLoading: setComponentLoading,
    clearLoading: () => clearLoading(componentName)
  };
};
