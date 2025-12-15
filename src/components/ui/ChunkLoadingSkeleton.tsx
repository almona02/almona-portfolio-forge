/**
 * Loading skeleton component for chunk loading states
 * Provides better UX during code splitting
 */

export function ChunkLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400 text-sm">Loading component...</p>
      </div>
    </div>
  );
}

