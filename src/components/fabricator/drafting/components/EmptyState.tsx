/**
 * Empty State Component
 * 
 * Enterprise-grade empty state component with contextual messaging,
 * icons, and actionable CTAs for the Drafting Workbench.
 * 
 * Constitutional: Deterministic UI, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Button } from '@/shared/ui/ui/button';
import { LucideIcon } from 'lucide-react';
import React from 'react';
import { getTypographyPreset } from '../styles/typography';
import { getPadding, getGap } from '../styles/spacing';

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  /** Custom content to render */
  children?: React.ReactNode;
  /** Class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className = '',
  size = 'md',
}) => {
  // Size-based styling
  const sizeConfig = {
    sm: {
      iconSize: 32,
      titleClass: getTypographyPreset('h5'),
      descriptionClass: getTypographyPreset('bodySmall'),
      containerPadding: getPadding('componentTight'),
    },
    md: {
      iconSize: 48,
      titleClass: getTypographyPreset('h4'),
      descriptionClass: getTypographyPreset('body'),
      containerPadding: getPadding('component'),
    },
    lg: {
      iconSize: 64,
      titleClass: getTypographyPreset('h3'),
      descriptionClass: getTypographyPreset('body'),
      containerPadding: getPadding('componentLoose'),
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={`flex flex-col items-center justify-center ${config.containerPadding} ${getGap('normal')} ${className}`}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
          <Icon
            className="w-8 h-8 text-amber-400"
            size={config.iconSize}
            aria-hidden="true"
          />
        </div>
      )}

      <h3 className={`${config.titleClass} text-slate-200 text-center font-semibold mb-2`}>
        {title}
      </h3>

      {description && (
        <p className={`${config.descriptionClass} text-slate-400 text-center max-w-md mb-6`}>
          {description}
        </p>
      )}

      {children && (
        <div className="w-full max-w-md mb-6">
          {children}
        </div>
      )}

      {(action || secondaryAction) && (
        <div className={`flex items-center ${getGap('normal')} flex-wrap justify-center`}>
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              className="border-amber-600/30 text-amber-400 hover:bg-amber-500/10"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;

