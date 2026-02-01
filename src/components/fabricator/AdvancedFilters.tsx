/**
 * Advanced Filters Component
 * 
 * Enterprise filter system for fabricator projects with AICS-001 constraint compliance filtering.
 * 
 * Blackbox Week 5-6: Search & Filter Implementation
 * AICS-001 Reference: Sections 4.4, 7.4, 7.5 (Constraint Compliance, Audit Trail, Replay)
 * 
 * Features:
 * - Validation status filters (compliant/non-compliant per category)
 * - Truth version compatibility filters
 * - Audit trail completeness filters
 * - Constraint category filters
 * - AICS-001 section reference filters
 */

import { ConstraintCategory } from '@/core/authority/validation_envelopes';
import type { ConstraintComplianceFilters, SearchFilters } from '@/services/SearchService';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Filter, Shield, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  className?: string;
}

/**
 * Get human-readable category name
 */
function getCategoryName(category: ConstraintCategory): string {
  const names: Record<ConstraintCategory, string> = {
    [ConstraintCategory.GEOMETRIC]: 'Geometric',
    [ConstraintCategory.MATERIAL]: 'Material',
    [ConstraintCategory.MACHINE]: 'Machine',
    [ConstraintCategory.PROCESS]: 'Process',
    [ConstraintCategory.CERTIFICATION]: 'Certification',
  };
  return names[category] || category;
}

/**
 * Advanced Filters Component
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFilterChange,
  className,
}) => {
  const [constraintFilters, setConstraintFilters] = useState<ConstraintComplianceFilters>(
    filters.constraintCompliance || {}
  );

  const handleConstraintFilterChange = useCallback((updates: Partial<ConstraintComplianceFilters>) => {
    const newFilters = { ...constraintFilters, ...updates };
    setConstraintFilters(newFilters);
    onFilterChange({
      ...filters,
      constraintCompliance: Object.keys(newFilters).length > 0 ? newFilters : undefined,
    });
  }, [constraintFilters, filters, onFilterChange]);

  const handleCategoryStatusChange = useCallback((category: ConstraintCategory, status: 'pass' | 'fail' | null) => {
    const categoryStatus = { ...constraintFilters.categoryStatus };
    if (status === null) {
      delete categoryStatus[category];
    } else {
      categoryStatus[category] = status;
    }
    handleConstraintFilterChange({ categoryStatus });
  }, [constraintFilters, handleConstraintFilterChange]);

  const handleFailedCategoryToggle = useCallback((category: ConstraintCategory, checked: boolean) => {
    const failedCategories = constraintFilters.failedCategories || [];
    const updated = checked
      ? [...failedCategories, category]
      : failedCategories.filter(c => c !== category);
    handleConstraintFilterChange({ failedCategories: updated.length > 0 ? updated : undefined });
  }, [constraintFilters, handleConstraintFilterChange]);

  const clearAllFilters = useCallback(() => {
    setConstraintFilters({});
    onFilterChange({
      ...filters,
      constraintCompliance: undefined,
    });
  }, [filters, onFilterChange]);

  const hasActiveFilters = Object.keys(constraintFilters).length > 0 ||
    (constraintFilters.failedCategories && constraintFilters.failedCategories.length > 0) ||
    (constraintFilters.categoryStatus && Object.keys(constraintFilters.categoryStatus).length > 0);

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-amber-200 flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-500" />
              Advanced Filters
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              AICS-001 constraint compliance filtering
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-amber-400 hover:text-amber-300"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Status Filter */}
        <div>
          <Label className="text-sm font-semibold text-slate-300 mb-2 block">
            Validation Status
          </Label>
          <Select
            value={constraintFilters.validationStatus || 'all'}
            onValueChange={(value) => {
              handleConstraintFilterChange({
                validationStatus: value === 'all' ? undefined : value as 'compliant' | 'non-compliant' | 'not-validated',
              });
            }}
          >
            <SelectTrigger className="bg-slate-800/50 border-amber-500/30 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-amber-500/30">
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              <SelectItem value="not-validated">Not Validated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Failed Categories Filter */}
        <div>
          <Label className="text-sm font-semibold text-slate-300 mb-2 block">
            Failed Constraint Categories
          </Label>
          <div className="space-y-2">
            {Object.values(ConstraintCategory).map(category => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`failed-category-${category}`}
                  checked={constraintFilters.failedCategories?.includes(category) || false}
                  onCheckedChange={(checked) => handleFailedCategoryToggle(category, checked as boolean)}
                  className="border-amber-500/30 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-500"
                />
                <Label
                  htmlFor={`failed-category-${category}`}
                  className="text-sm text-slate-300 cursor-pointer"
                >
                  {getCategoryName(category)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Category-Specific Status Filters */}
        <div>
          <Label className="text-sm font-semibold text-slate-300 mb-2 block">
            Category Validation Status
          </Label>
          <div className="space-y-3">
            {Object.values(ConstraintCategory).map(category => {
              const currentStatus = constraintFilters.categoryStatus?.[category];
              return (
                <div key={category} className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">{getCategoryName(category)}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={currentStatus === 'pass' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCategoryStatusChange(category, currentStatus === 'pass' ? null : 'pass')}
                      className={`h-7 px-2 text-xs ${
                        currentStatus === 'pass'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30'
                      }`}
                    >
                      Pass
                    </Button>
                    <Button
                      variant={currentStatus === 'fail' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCategoryStatusChange(category, currentStatus === 'fail' ? null : 'fail')}
                      className={`h-7 px-2 text-xs ${
                        currentStatus === 'fail'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border-red-500/30 text-red-400 hover:bg-red-950/30'
                      }`}
                    >
                      Fail
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Filters */}
        <div>
            <Label className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Shield className="h-3 w-3 text-amber-500" />
            Audit Trail
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="audit-trail-complete"
                checked={constraintFilters.auditTrailComplete || false}
                onCheckedChange={(checked) => {
                  handleConstraintFilterChange({
                    auditTrailComplete: checked ? true : undefined,
                  });
                }}
                className="border-amber-500/30 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-500"
              />
              <Label htmlFor="audit-trail-complete" className="text-sm text-slate-300 cursor-pointer">
                Has Complete Audit Trail
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-replay-metadata"
                checked={constraintFilters.hasReplayMetadata || false}
                onCheckedChange={(checked) => {
                  handleConstraintFilterChange({
                    hasReplayMetadata: checked ? true : undefined,
                  });
                }}
                className="border-amber-500/30 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-500"
              />
              <Label htmlFor="has-replay-metadata" className="text-sm text-slate-300 cursor-pointer">
                Has Replay Metadata
              </Label>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-slate-700/50">
            <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
              Active Filters
            </Label>
            <div className="flex flex-wrap gap-2">
              {constraintFilters.validationStatus && (
                <Badge variant="outline" className="bg-amber-950/30 border-amber-500/30 text-amber-400 text-xs">
                  Status: {constraintFilters.validationStatus}
                </Badge>
              )}
              {constraintFilters.failedCategories && constraintFilters.failedCategories.length > 0 && (
                <Badge variant="outline" className="bg-red-950/30 border-red-500/30 text-red-400 text-xs">
                  {constraintFilters.failedCategories.length} Failed Categories
                </Badge>
              )}
              {constraintFilters.auditTrailComplete && (
                <Badge variant="outline" className="bg-emerald-950/30 border-emerald-500/30 text-emerald-400 text-xs">
                  Audit Trail Complete
                </Badge>
              )}
              {constraintFilters.hasReplayMetadata && (
                <Badge variant="outline" className="bg-cyan-950/30 border-cyan-500/30 text-cyan-400 text-xs">
                  Has Replay Metadata
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

