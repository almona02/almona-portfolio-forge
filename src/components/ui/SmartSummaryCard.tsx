/**
 * SmartSummaryCard - Summary with "Why?" buttons
 * 
 * @since Phase 3: Cognitive Intelligence (Week 17)
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface SmartSummaryCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
    explanation?: string;
    onWhyClick?: () => void;
  }>;
}

export const SmartSummaryCard: React.FC<SmartSummaryCardProps> = ({
  title,
  items
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-400">{item.label}:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{item.value}</span>
              {item.explanation && item.onWhyClick && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={item.onWhyClick}
                  className="h-6 px-2"
                  title={item.explanation}
                >
                  <Info className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};


