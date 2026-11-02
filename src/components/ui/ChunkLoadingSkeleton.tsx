/**
 * Loading skeleton component for chunk loading states
 * Provides better UX during code splitting
 */

export function ChunkLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-96 bg-background rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">Loading component...</p>
      </div>
    </div>
  );
}

