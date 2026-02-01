/**
 * @file ApprovalQueueSidebar.tsx
 * @description Supervisor sidebar for approval queue (placeholder).
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { CheckCircle2, Clock } from 'lucide-react';
import React from 'react';

export const ApprovalQueueSidebar: React.FC = () => {
  // TODO: Implement approval queue logic
  const pendingApprovals = 0; // Placeholder

  return (
    <div className={cn(
      'fixed top-20 right-4 w-80 z-30',
      'max-h-[calc(100vh-6rem)] overflow-y-auto'
    )}>
      <Card className="bg-gray-900/95 border-gray-700 card-dark">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-400" />
            Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Placeholder for approval items */}
              <p className="text-xs text-gray-500">Approval queue coming soon</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};












