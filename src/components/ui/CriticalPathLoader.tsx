import React, { useState, useEffect } from 'react';
import { PageLoadingWrapper } from './PageLoadingWrapper';

interface CriticalPathLoaderProps {
  children: React.ReactNode;
}

export const CriticalPathLoader: React.FC<CriticalPathLoaderProps> = ({ children }) => {
  const [isCriticalLoaded, setIsCriticalLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading critical resources...');

  useEffect(() => {
    const loadingSteps = [
      { progress: 10, message: 'Loading core React...' },
      { progress: 20, message: 'Loading routing...' },
      { progress: 30, message: 'Loading UI components...' },
      { progress: 40, message: 'Loading authentication...' },
      { progress: 50, message: 'Loading context providers...' },
      { progress: 60, message: 'Loading essential utilities...' },
      { progress: 70, message: 'Preparing application...' },
      { progress: 80, message: 'Initializing components...' },
      { progress: 90, message: 'Finalizing setup...' },
      { progress: 100, message: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingProgress(step.progress);
        setLoadingMessage(step.message);
        currentStep++;
      } else {
        clearInterval(interval);
        // Add a small delay before showing the app
        setTimeout(() => {
          setIsCriticalLoaded(true);
        }, 300);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  if (!isCriticalLoaded) {
    return (
      <PageLoadingWrapper 
        message={loadingMessage}
        variant="fullscreen"
      >
        <div className="w-full max-w-xs">
          <div className="bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 text-center">
            {loadingProgress}% complete
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            Loading only essential resources first...
          </p>
        </div>
      </PageLoadingWrapper>
    );
  }

  return <>{children}</>;
};
