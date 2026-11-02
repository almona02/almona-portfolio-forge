import React from 'react';
import { Card } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Flag, Wind, Building, User, Shield, Settings } from 'lucide-react';

interface EgyptianConstraints {
  governorate?: string;
  windZone?: string;
  exposure?: string;
  floorLevel?: number;
  usageType?: string;
  baseShape?: string;
  openingType?: string;
  wallDeduction?: number;
  recommendedByWizard?: boolean;
  wizardVersion?: string;
}

interface EgyptianConstraintsCardProps {
  constraints: EgyptianConstraints;
  onEdit?: () => void;
  className?: string;
}

export const EgyptianConstraintsCard: React.FC<EgyptianConstraintsCardProps> = ({
  constraints,
  onEdit,
  className = '',
}) => {
  const windLabel = constraints.windZone ? `${constraints.windZone} wind` : 'Wind';

  return (
    <Card className={`p-4 bg-gradient-to-r from-amber-50 to-amber-50 border-amber-200 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-warning" />
            <div>
              <h4 className="typography-h4 text-amber-800">Egyptian Engineering Standards</h4>
              <p className="text-xs text-warning">
                {constraints.governorate || 'Egypt'} {constraints.wizardVersion ? `• v${constraints.wizardVersion}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-warning font-medium">
                <Building className="h-4 w-4 text-warning" />
                <span>Location</span>
              </div>
              <p className="text-foreground">{constraints.governorate || '—'}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wind className="h-4 w-4" />
                <span>{windLabel}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <User className="h-4 w-4" />
                <span>Usage</span>
              </div>
              <p className="text-foreground capitalize">{constraints.usageType || '—'}</p>
              <p className="text-xs text-muted-foreground">Floor: {constraints.floorLevel ?? '—'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Shield className="h-4 w-4" />
                <span>Safety</span>
              </div>
              <p className="text-foreground">
                Wall deduction: {constraints.wallDeduction ?? 15}mm
              </p>
              <p className="text-xs text-muted-foreground">
                {constraints.recommendedByWizard ? 'Wizard recommended' : 'Custom'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-foreground font-medium">
                <Settings className="h-4 w-4" />
                <span>Design</span>
              </div>
              <p className="text-foreground capitalize">
                {constraints.baseShape || '—'} {constraints.openingType || ''}
              </p>
              <p className="text-xs text-muted-foreground">{constraints.exposure || '—'}</p>
            </div>
          </div>
        </div>

        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="ml-4 border-amber-300 hover:bg-amber-100"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
    </Card>
  );
};

