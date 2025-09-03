import React from 'react';

export const PageHeaderSkeleton = () => (
  <div className="animate-pulse space-y-4 mb-8">
    <div className="h-8 bg-muted rounded w-1/3"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
    <div className="h-4 bg-muted rounded w-1/2"></div>
  </div>
);

export const NavigationSkeleton = () => (
  <div className="animate-pulse flex space-x-6 mb-6">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="h-6 bg-muted rounded w-20"></div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-4 gap-4 pb-2 border-b">
      {Array.from({ length: cols }).map((_, index) => (
        <div key={index} className="h-4 bg-muted rounded"></div>
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-4 gap-4 py-2">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-muted rounded"></div>
        ))}
      </div>
    ))}
  </div>
);

export const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <PageHeaderSkeleton />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-card p-6 rounded-lg border">
          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-muted rounded w-3/4"></div>
        </div>
      ))}
    </div>
    <TableSkeleton />
  </div>
);
