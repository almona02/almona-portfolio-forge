import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  assignUserToExperiment, 
  getUserVariant, 
  trackConversion, 
  getExperimentConfig,
  initABTesting,
  Experiment,
  ExperimentVariant
} from '@/lib/analytics/abTesting';

interface ABTestContextType {
  getVariant: (experimentId: string) => string | null;
  trackEvent: (experimentId: string, eventName: string) => void;
  getConfig: (experimentId: string, variantId: string) => Record<string, unknown> | null;
  isInExperiment: (experimentId: string) => boolean;
}

const ABTestContext = createContext<ABTestContextType | null>(null);

interface ABTestProviderProps {
  children: ReactNode;
  userId?: string;
}

export const ABTestProvider: React.FC<ABTestProviderProps> = ({ 
  children, 
  userId 
}) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize A/B testing
    initABTesting();
    setInitialized(true);
  }, []);

  const getVariant = (experimentId: string): string | null => {
    if (!initialized) return null;
    
    // First try to get existing assignment
    let variant = getUserVariant(experimentId, userId);
    
    // If no assignment, create one
    if (!variant) {
      variant = assignUserToExperiment(experimentId, userId);
    }
    
    return variant;
  };

  const trackEvent = (experimentId: string, eventName: string): void => {
    if (!initialized) return;
    trackConversion(experimentId, eventName, userId);
  };

  const getConfig = (experimentId: string, variantId: string): Record<string, unknown> | null => {
    if (!initialized) return null;
    return getExperimentConfig(experimentId, variantId);
  };

  const isInExperiment = (experimentId: string): boolean => {
    if (!initialized) return false;
    return getVariant(experimentId) !== null;
  };

  const contextValue: ABTestContextType = {
    getVariant,
    trackEvent,
    getConfig,
    isInExperiment
  };

  return (
    <ABTestContext.Provider value={contextValue}>
      {children}
    </ABTestContext.Provider>
  );
};

export const useABTest = (): ABTestContextType => {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTest must be used within an ABTestProvider');
  }
  return context;
};

// Hook for specific experiment
export const useExperiment = (experimentId: string) => {
  const { getVariant, trackEvent, getConfig, isInExperiment } = useABTest();
  
  const variant = getVariant(experimentId);
  const config = variant ? getConfig(experimentId, variant) : null;
  const isInTest = isInExperiment(experimentId);

  const track = (eventName: string) => {
    trackEvent(experimentId, eventName);
  };

  return {
    variant,
    config,
    isInTest,
    track
  };
};

// Component for conditional rendering based on A/B test
interface ABTestVariantProps {
  experimentId: string;
  variantId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ABTestVariant: React.FC<ABTestVariantProps> = ({
  experimentId,
  variantId,
  children,
  fallback = null
}) => {
  const { getVariant } = useABTest();
  const userVariant = getVariant(experimentId);
  
  if (userVariant === variantId) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};

// Component for A/B test configuration
interface ABTestConfigProps {
  experimentId: string;
  children: (config: Record<string, unknown> | null) => ReactNode;
}

export const ABTestConfig: React.FC<ABTestConfigProps> = ({
  experimentId,
  children
}) => {
  const { getVariant, getConfig } = useABTest();
  const variant = getVariant(experimentId);
  const config = variant ? getConfig(experimentId, variant) : null;
  
  return <>{children(config)}</>;
};

export default ABTestProvider;
