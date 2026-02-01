/**
 * Profile Suggestions Panel Component
 * 
 * Displays Tier 2 advisory profile suggestions from supplier packs.
 * All suggestions require Tier 3 validation before use.
 * 
 * Market leader-inspired UI with high precision.
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    supplierPackService,
    type ProfileSuggestion,
    type ProfileSuggestionsResult,
    type Tier3ValidationResult,
} from '@/lib/fabricator/supplier';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { AlertCircle, CheckCircle2, InfoIcon, Loader2, ShieldCheck } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ProfileSuggestionsPanelProps {
  windowUnit: WindowUnit;
  systemPack: SystemPack | null;
  supplierPackId?: string;
  onSuggestionSelect?: (suggestion: ProfileSuggestion, validation: Tier3ValidationResult) => void;
  className?: string;
}

export const ProfileSuggestionsPanel: React.FC<ProfileSuggestionsPanelProps> = ({
  windowUnit,
  systemPack,
  supplierPackId,
  onSuggestionSelect,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<ProfileSuggestionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validations, setValidations] = useState<Map<string, Tier3ValidationResult>>(new Map());

  const loadSuggestions = useCallback(async () => {
    if (!windowUnit || !systemPack) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = supplierPackService.suggestProfile(windowUnit, systemPack, supplierPackId);
      setSuggestions(result);

      // Validate all suggestions
      const validationMap = new Map<string, Tier3ValidationResult>();
      for (const suggestion of result.suggestions) {
        const validation = supplierPackService.validateSupplierSuggestion(
          suggestion,
          windowUnit,
          systemPack
        );
        validationMap.set(suggestion.profileId, validation);
      }
      setValidations(validationMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load suggestions';
      setError(errorMessage);
      toast.error('Error loading profile suggestions', {
        description: errorMessage,
      });
      console.error('Profile suggestions error:', err);
    } finally {
      setLoading(false);
    }
  }, [windowUnit, systemPack, supplierPackId]);

  useEffect(() => {
    if (windowUnit && systemPack) {
      loadSuggestions();
    }
  }, [windowUnit, systemPack, supplierPackId, loadSuggestions]);

  const handleSuggestionClick = useCallback(
    (suggestion: ProfileSuggestion) => {
      const validation = validations.get(suggestion.profileId);
      if (!validation) {
        toast.error('Validation not available for this suggestion');
        return;
      }

      if (!validation.isValid) {
        toast.error('Suggestion failed Tier 3 validation', {
          description: validation.reason,
        });
        return;
      }

      if (onSuggestionSelect) {
        onSuggestionSelect(suggestion, validation);
      }

      toast.success('Profile suggestion selected', {
        description: `Profile ${suggestion.profileId} passed Tier 3 validation`,
      });
    },
    [validations, onSuggestionSelect]
  );

  const getAvailabilityBadge = (availability?: string) => {
    switch (availability) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50 text-xs">IN STOCK</Badge>;
      case 'limited':
        return <Badge variant="outline" className="border-amber-600/50 text-amber-400 text-xs">LIMITED</Badge>;
      case 'out_of_stock':
        return <Badge variant="outline" className="text-xs border-red-600/50 text-red-400">OUT OF STOCK</Badge>;
      case 'discontinued':
        return <Badge variant="outline" className="text-xs border-red-600/50 text-red-400">DISCONTINUED</Badge>;
      default:
        return null;
    }
  };

  const getValidationBadge = (profileId: string) => {
    const validation = validations.get(profileId);
    if (!validation) {
      return <Badge variant="outline" className="text-xs">PENDING</Badge>;
    }

    if (validation.isValid) {
      return (
        <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50 text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          TIER 3 VALID
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs border-red-600/50 text-red-400">
        <AlertCircle className="h-3 w-3 mr-1" />
        VALIDATION FAILED
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg tracking-[0.02em] uppercase font-semibold text-amber-200">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Profile Suggestions
          </CardTitle>
          <CardDescription className="text-xs text-amber-600/80 font-medium">
            Tier 2 advisory suggestions (require Tier 3 validation)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <span className="ml-2 text-amber-300">Loading suggestions...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 p-3 rounded-lg bg-red-900/20 border border-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {error}</span>
            </div>
          )}

          {!loading && !error && suggestions && (
            <>
              {suggestions.suggestions.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm text-amber-600/70">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  <span>No profile suggestions available.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.suggestions.map((suggestion) => {
                    const validation = validations.get(suggestion.profileId);
                    const isValid = validation?.isValid ?? false;

                    return (
                      <div
                        key={suggestion.profileId}
                        className={`p-3 rounded-lg border ${
                          isValid
                            ? 'bg-amber-900/20 border-amber-600/30 hover:border-amber-600/50 cursor-pointer'
                            : 'bg-red-900/10 border-red-700/30 opacity-60'
                        } transition-colors`}
                        onClick={() => isValid && handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold text-amber-200">
                                {suggestion.profileId}
                              </span>
                              {getValidationBadge(suggestion.profileId)}
                              {getAvailabilityBadge(suggestion.availability)}
                            </div>
                            <div className="text-xs text-amber-600/70">
                              Supplier: {suggestion.supplier}
                            </div>
                          </div>
                          {suggestion.price && (
                            <div className="text-right">
                              <div className="text-sm font-semibold text-amber-200">
                                {suggestion.price.toFixed(2)} {suggestion.currency}
                              </div>
                              {suggestion.leadTime && (
                                <div className="text-xs text-amber-600/70">
                                  Lead: {suggestion.leadTime} days
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {validation && !validation.isValid && (
                          <div className="mt-2 text-xs text-red-400">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {validation.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 border-t-2 border-amber-600/30">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 text-xs text-amber-600/70 cursor-help">
                      <InfoIcon className="h-3 w-3" />
                      <span>{suggestions.constitutionalNote}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs text-xs">
                      <p>
                        All suggestions are Tier 2 advisory data. Final selection must pass Tier 3
                        validation. Prices and availability are advisory and may change.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          <Button
            onClick={loadSuggestions}
            disabled={loading}
            className="w-full h-9 text-xs bg-amber-700/30 hover:bg-amber-700/40 border-amber-600/50 text-amber-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <InfoIcon className="h-4 w-4 mr-2" />
            )}
            Refresh Suggestions
          </Button>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

