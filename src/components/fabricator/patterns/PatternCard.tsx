/**
 * PatternCard - Display pattern in library
 * 
 * @since Phase 3: Cognitive Intelligence (Week 18)
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EgyptianPattern } from '@/data/egyptian-window-patterns';

interface PatternCardProps {
  pattern: EgyptianPattern;
  onClick: () => void;
}

export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  onClick
}) => {
  return (
    <Card
      className="cursor-pointer transition-all hover:border-blue-500 bg-gray-800 border-gray-700"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="font-semibold mb-2">{pattern.name}</div>
        <div className="text-sm text-gray-400 mb-2">{pattern.layout}</div>
        {pattern.notes && (
          <div className="text-xs text-gray-500">{pattern.notes}</div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          {pattern.type.replace('_', ' ')} • {pattern.compatibleSystems.length} compatible systems
        </div>
      </CardContent>
    </Card>
  );
};

