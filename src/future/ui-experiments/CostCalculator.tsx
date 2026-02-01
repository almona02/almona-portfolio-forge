import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CostCalculatorProps {
  totalCost: number;
  currency?: string;
  status?: 'normal' | 'warning' | 'error';
  breakdown?: Array<{ label: string; cost: number }>;
  className?: string;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  totalCost,
  currency = 'EGP',
  status = 'normal',
  breakdown = [],
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const getStatusConfig = () => {
    switch (status) {
      case 'error':
        return {
          icon: <XCircle className="w-4 h-4" />,
          bg: 'bg-red-900/20',
          border: 'border-red-500/30',
          text: 'text-red-400',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          bg: 'bg-amber-900/20',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
        };
      default:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          bg: 'bg-green-900/20',
          border: 'border-green-500/30',
          text: 'text-green-400',
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  
  return (
    <>
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'fixed top-4 right-4 z-40',
          'flex items-center space-x-2 px-3 py-2 rounded-lg',
          'backdrop-blur-sm border transition-all duration-200',
          'hover:scale-105 active:scale-95',
          statusConfig.bg,
          statusConfig.border,
          className
        )}
        aria-label={`Total cost: ${formatCost(totalCost)}. Click for details.`}
      >
        <DollarSign className="w-4 h-4 text-amber-400" />
        <span className={cn('text-sm font-medium', statusConfig.text)}>
          {formatCost(totalCost)}
        </span>
        <div className="ml-1">
          {statusConfig.icon}
        </div>
      </button>
      
      {/* Expanded Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cost Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary */}
            <div className={cn(
              'p-4 rounded-lg border',
              statusConfig.bg,
              statusConfig.border
            )}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-200">Total Cost</span>
                <span className={cn('text-2xl font-bold', statusConfig.text)}>
                  {formatCost(totalCost)}
                </span>
              </div>
            </div>
            
            {/* Breakdown */}
            {breakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Cost Breakdown</h4>
                <div className="space-y-1">
                  {breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800">
                      <span className="text-sm text-gray-300">{item.label}</span>
                      <span className="text-sm font-medium text-amber-400">
                        {formatCost(item.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Status Message */}
            <div className="p-3 rounded-lg bg-gray-900/50">
              <div className="flex items-center space-x-2">
                {statusConfig.icon}
                <span className={cn('text-sm', statusConfig.text)}>
                  {status === 'error' && 'Cost exceeds budget. Review material selections.'}
                  {status === 'warning' && 'Cost approaching budget limit.'}
                  {status === 'normal' && 'Cost within budget parameters.'}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
