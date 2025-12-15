/**
 * Edit History Timeline
 * Shows edit history with rollback capability
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { History, RotateCcw, User, Clock } from 'lucide-react';
import type { EditOperation } from '@/hooks/useCollaborativeEditing';

export interface EditHistoryEntry {
  id: string;
  operation: EditOperation;
  userName: string;
  avatarUrl?: string;
  description: string;
  timestamp: Date;
}

interface EditHistoryTimelineProps {
  history: EditHistoryEntry[];
  onRollback?: (entryId: string) => void;
  maxEntries?: number;
}

export const EditHistoryTimeline: React.FC<EditHistoryTimelineProps> = ({
  history,
  onRollback,
  maxEntries = 50,
}) => {
  const [expandedEntry, _setExpandedEntry] = useState<string | null>(null);

  const displayHistory = history.slice(0, maxEntries).reverse(); // Most recent first

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getOperationColor = (type: string): string => {
    switch (type) {
      case 'add':
        return 'bg-green-900/20 border-green-700 text-green-400';
      case 'update':
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
      case 'delete':
        return 'bg-red-900/20 border-red-700 text-red-400';
      default:
        return 'bg-gray-900/20 border-gray-700 text-gray-400';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" />
          Edit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {displayHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No edit history available
              </div>
            ) : (
              displayHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-orange-400" />
                    {index < displayHistory.length - 1 && (
                      <div className="h-8 w-px bg-gray-700 ml-[3px] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getOperationColor(entry.operation.type)}`}
                      >
                        {entry.operation.type}
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.userName}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{entry.description}</p>
                    {expandedEntry === entry.id && (
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono text-gray-400">
                        Path: {entry.operation.path}
                        <br />
                        Value: {JSON.stringify(entry.operation.value, null, 2)}
                      </div>
                    )}
                    {onRollback && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 text-xs"
                        onClick={() => onRollback(entry.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

