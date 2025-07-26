import React from "react";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="border rounded-lg p-4">
    <Skeleton className="w-full h-48 mb-4" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  </div>
);

export const FreightCalculatorSkeleton = () => (
  <div className="border rounded-lg p-6">
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);

export const FreightCalculatorSkeleton = () => (
  <div className="space-y-4 p-4 border rounded-lg">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-1/2 mx-auto" />
  </div>
);