import React from 'react';

export const ProductCardSkeleton = () => (
  <div className="animate-pulse bg-card rounded-lg p-4 border border-border">
    <div className="h-48 bg-muted rounded mb-4"></div>
    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
    <div className="h-10 bg-muted rounded"></div>
  </div>
);

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);
