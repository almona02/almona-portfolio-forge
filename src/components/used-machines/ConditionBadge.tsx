import React from 'react';
import { Badge } from '@/shared/ui/ui/badge';
import { cn } from '@/lib/utils';

export type MachineCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair' | 'As-Is';

interface ConditionBadgeProps {
  condition: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * ConditionBadge Component
 * 
 * Displays standardized condition badges for used machines with
 * consistent colors, icons, and trust indicators
 */
const ConditionBadge: React.FC<ConditionBadgeProps> = ({
  condition,
  size = 'md',
  showIcon = true,
  className
}) => {
  
  // Normalize condition string (handle inconsistent casing)
  const normalizeCondition = (cond: string): MachineCondition => {
    const normalized = cond.toLowerCase().trim();
    
    if (normalized.includes('excellent') || normalized.includes('like new')) return 'Excellent';
    if (normalized.includes('good') || normalized.includes('very good')) return 'Good';
    if (normalized.includes('fair') || normalized.includes('average')) return 'Fair';
    if (normalized.includes('repair') || normalized.includes('maintenance')) return 'Needs Repair';
    
    return 'As-Is'; // Default fallback
  };

  const normalizedCondition = normalizeCondition(condition);
  
  // Condition configuration with colors, icons, and descriptions
  const conditionConfig = {
    'Excellent': {
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      icon: '⭐',
      description: 'Like new, minimal wear',
      borderColor: 'border-emerald-400'
    },
    'Good': {
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: '✅',
      description: 'Well maintained, good working order',
      borderColor: 'border-blue-400'
    },
    'Fair': {
      color: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: '⚠️',
      description: 'Shows wear, functions properly',
      borderColor: 'border-yellow-400'
    },
    'Needs Repair': {
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: '🔧',
      description: 'Requires maintenance or repair',
      borderColor: 'border-amber-400'
    },
    'As-Is': {
      color: 'bg-gray-600 hover:bg-gray-700 text-white',
      icon: '📋',
      description: 'Sold in current condition',
      borderColor: 'border-gray-400'
    }
  };

  const config = conditionConfig[normalizedCondition];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className="relative group">
      <Badge 
        className={cn(
          config.color,
          sizeClasses[size],
          'font-semibold transition-all duration-200 cursor-help border-2',
          config.borderColor,
          'shadow-lg hover:shadow-xl transform hover:scale-105',
          className
        )}
        title={config.description}
      >
        {showIcon && (
          <span className="mr-1.5" role="img" aria-label={normalizedCondition}>
            {config.icon}
          </span>
        )}
        {normalizedCondition}
      </Badge>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-almona-darker border border-almona-light/20 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
        <div className="text-xs text-almona-light font-medium">
          {config.description}
        </div>
        {/* Arrow pointing down */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-almona-darker"></div>
      </div>
    </div>
  );
};

/**
 * Utility function to extract numeric condition score for sorting
 */
export const getConditionScore = (condition: string): number => {
  const normalized = condition.toLowerCase().trim();
  
  if (normalized.includes('excellent')) return 5;
  if (normalized.includes('good')) return 4;
  if (normalized.includes('fair')) return 3;
  if (normalized.includes('repair')) return 2;
  return 1; // As-Is
};

/**
 * Utility function to get all available conditions for filters
 */
export const getAllConditions = (): MachineCondition[] => {
  return ['Excellent', 'Good', 'Fair', 'Needs Repair', 'As-Is'];
};

export default ConditionBadge;