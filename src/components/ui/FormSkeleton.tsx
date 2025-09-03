import React from 'react';

export const FormSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-muted rounded w-1/4"></div>
    <div className="h-10 bg-muted rounded"></div>
    <div className="h-4 bg-muted rounded w-1/3"></div>
    <div className="h-10 bg-muted rounded"></div>
    <div className="h-4 bg-muted rounded w-1/4"></div>
    <div className="h-20 bg-muted rounded"></div>
    <div className="h-12 bg-muted rounded mt-6"></div>
  </div>
);

export const ContactFormSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-10 bg-muted rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-10 bg-muted rounded"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded w-1/5"></div>
      <div className="h-10 bg-muted rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded w-1/4"></div>
      <div className="h-24 bg-muted rounded"></div>
    </div>
    <div className="h-12 bg-muted rounded"></div>
  </div>
);
