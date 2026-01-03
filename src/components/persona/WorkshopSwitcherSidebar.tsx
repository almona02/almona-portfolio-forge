/**
 * @file WorkshopSwitcherSidebar.tsx
 * @description Manager sidebar for workshop switcher (placeholder).
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Factory } from 'lucide-react';
import React from 'react';

export const WorkshopSwitcherSidebar: React.FC = () => {
  // TODO: Implement workshop switcher logic
  const workshops = []; // Placeholder

  return (
    <div className={cn(
      'fixed top-20 right-4 w-80 z-30',
      'max-h-[calc(100vh-6rem)] overflow-y-auto'
    )}>
      <Card className="bg-gray-900/95 border-gray-700 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Factory className="h-5 w-5 text-purple-400" />
            Workshops
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workshops.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Factory className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No workshops available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Placeholder for workshop items */}
              <p className="text-xs text-gray-500">Workshop switcher coming soon</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};












