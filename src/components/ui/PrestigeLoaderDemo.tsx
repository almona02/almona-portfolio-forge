import React, { useState } from 'react';
import { PrestigeLoader } from './PrestigeLoader';

export const PrestigeLoaderDemo: React.FC = () => {
  const [showLoader, setShowLoader] = useState(false);

  const triggerLoader = () => {
    setShowLoader(true);
    // Simulate loading for demo purposes
    setTimeout(() => {
      setShowLoader(false);
    }, 8000); // 8 seconds to see the full animation
  };

  if (showLoader) {
    return (
      <PrestigeLoader>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="typography-h1 mb-4">Almona Forge</h1>
            <p className="text-xl">Loading animation completed!</p>
            <button 
              onClick={triggerLoader}
              className="btn-primary"
            >
              Show Loading Animation Again
            </button>
          </div>
        </div>
      </PrestigeLoader>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="typography-h1 mb-4">Prestige Loader Demo</h1>
        <p className="text-xl mb-8">Click the button below to see the enhanced loading animation</p>
        <button 
          onClick={triggerLoader}
          className="btn-primary-gradient"
        >
          Show Prestige Loading Animation
        </button>
      </div>
    </div>
  );
};
