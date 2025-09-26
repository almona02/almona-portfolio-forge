import React, { useState, useEffect } from 'react';
import { PageLoadingWrapper } from './PageLoadingWrapper';

interface AppPreloaderProps {
  children: React.ReactNode;
}

export const AppPreloader: React.FC<AppPreloaderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing application...');

  useEffect(() => {
    const loadingSteps = [
      { progress: 20, message: 'Loading core libraries...' },
      { progress: 40, message: 'Initializing UI components...' },
      { progress: 60, message: 'Setting up authentication...' },
      { progress: 80, message: 'Preparing application...' },
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
          setIsLoading(false);
        }, 500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
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
        </div>
      </PageLoadingWrapper>
    );
  }

  return <>{children}</>;
};
