import React, { useEffect, useState } from 'react';

export const MainChunkTest: React.FC = () => {
  const [chunkStatus, setChunkStatus] = useState<{
    mainChunkLoaded: boolean;
    error?: string;
    timestamp: string;
  }>({
    mainChunkLoaded: false,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // Test if main chunk loaded successfully
    const testMainChunk = () => {
      try {
        // Check if React is available
        if (typeof React !== 'undefined') {
          setChunkStatus(prev => ({
            ...prev,
            mainChunkLoaded: true,
            timestamp: new Date().toISOString()
          }));
        } else {
          setChunkStatus(prev => ({
            ...prev,
            error: 'React not available',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        setChunkStatus(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }));
      }
    };

    // Test immediately
    testMainChunk();

    // Test again after a short delay
    const timeout = setTimeout(testMainChunk, 1000);

    return () => clearTimeout(timeout);
  }, []);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded text-xs z-50">
        <div>Main Chunk: {chunkStatus.mainChunkLoaded ? '✅' : '❌'}</div>
        {chunkStatus.error && <div>Error: {chunkStatus.error}</div>}
        <div>Time: {chunkStatus.timestamp}</div>
      </div>
    );
  }

  return null;
};
