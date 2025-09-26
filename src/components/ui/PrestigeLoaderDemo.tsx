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
            <h1 className="text-4xl font-bold mb-4">Almona Forge</h1>
            <p className="text-xl">Loading animation completed!</p>
            <button 
              onClick={triggerLoader}
              className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
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
        <h1 className="text-4xl font-bold mb-4">Prestige Loader Demo</h1>
        <p className="text-xl mb-8">Click the button below to see the enhanced loading animation</p>
        <button 
          onClick={triggerLoader}
          className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          Show Prestige Loading Animation
        </button>
      </div>
    </div>
  );
};
