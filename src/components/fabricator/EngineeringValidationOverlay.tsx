/**
 * Engineering Validation Overlay
 * 
 * Displays real-time engineering validation results using a traffic light system.
 * Integrates with FirmanInterferenceEngine to show Firmans (legal decrees).
 * 
 * This is the "Live Statics" sidebar from the Engineering Bay approach.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  BookOpen,
  GraduationCap,
  Info
} from 'lucide-react';
import type { FirmanValidationResult, Firman } from '@/types/firman';
import { canOverrideFirman } from '@/types/firman';

interface EngineeringValidationOverlayProps {
  validationResult: FirmanValidationResult;
  userGuildRank?: 'APPRENTICE' | 'MASTER' | 'GRAND_VIZIER';
  onOverrideFirman?: (firman: Firman) => void;
  showPedagogicalNotes?: boolean;
}

export const EngineeringValidationOverlay: React.FC<EngineeringValidationOverlayProps> = ({
  validationResult,
  userGuildRank = 'APPRENTICE',
  onOverrideFirman,
  showPedagogicalNotes = false
}) => {
  const [expandedFirmans, setExpandedFirmans] = React.useState<Set<string>>(new Set());

  const toggleFirman = (code: string) => {
    const newExpanded = new Set(expandedFirmans);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedFirmans(newExpanded);
  };

  const getSeverityIcon = (severity: Firman['severity']) => {
    switch (severity) {
      case 'IMPERIAL_DECREE':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'BLOCK':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'ADVICE':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: Firman['severity']) => {
    switch (severity) {
      case 'IMPERIAL_DECREE':
        return 'border-red-600 bg-red-50';
      case 'BLOCK':
        return 'border-red-500 bg-red-50';
      case 'WARNING':
        return 'border-yellow-500 bg-yellow-50';
      case 'ADVICE':
        return 'border-blue-500 bg-blue-50';
    }
  };

  const renderFirman = (firman: Firman, index: number) => {
    const isExpanded = expandedFirmans.has(firman.code);
    const canOverride = canOverrideFirman(firman, userGuildRank);

    return (
      <motion.div
        key={firman.code}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`border-l-4 rounded p-4 mb-3 ${getSeverityColor(firman.severity)}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getSeverityIcon(firman.severity)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={firman.severity === 'IMPERIAL_DECREE' ? 'destructive' : 'secondary'}>
                  {firman.code}
                </Badge>
                <h4 className="font-semibold font-cairo">{firman.title}</h4>
              </div>
              <p className="text-sm mb-2">{firman.message}</p>

              {/* Citation */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <BookOpen className="h-3 w-3" />
                <span>
                  {firman.citation.source} ({firman.citation.year})
                  {firman.citation.page && `, Page ${firman.citation.page}`}
                </span>
              </div>

              {/* Pedagogical Note (Professor Mode) */}
              {showPedagogicalNotes && (
                <div className="mt-3 p-3 bg-white/50 rounded border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">Professor Mode</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{firman.pedagogicalNote}</p>
                </div>
              )}

              {/* Technical Details */}
              {firman.technicalDetails && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFirman(firman.code)}
                    className="text-xs"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Technical Details
                  </Button>
                  {isExpanded && (
                    <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono">
                      {firman.technicalDetails.calculatedValues && (
                        <div className="mb-2">
                          <strong>Calculated Values:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {Object.entries(firman.technicalDetails.calculatedValues).map(([key, value]) => (
                              <li key={key}>{key}: {value}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {firman.technicalDetails.recommendedFix && (
                        <div>
                          <strong>Recommended Fix:</strong> {firman.technicalDetails.recommendedFix}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Override Button */}
              {canOverride && onOverrideFirman && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOverrideFirman(firman)}
                  className="mt-2 text-xs"
                >
                  Override (Requires {firman.overrideLevel})
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between p-4 bg-canvas rounded-lg border">
        <div className="flex items-center gap-3">
          {validationResult.isValid ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <XCircle className="h-6 w-6 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold font-cairo">
              {validationResult.isValid ? 'Design Valid' : 'Design Has Issues'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {validationResult.summary.total} Firmans issued
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {validationResult.summary.imperialDecrees > 0 && (
            <Badge variant="destructive">{validationResult.summary.imperialDecrees} Imperial</Badge>
          )}
          {validationResult.summary.blocks > 0 && (
            <Badge variant="destructive">{validationResult.summary.blocks} Block</Badge>
          )}
          {validationResult.summary.warnings > 0 && (
            <Badge variant="outline" className="border-yellow-500">{validationResult.summary.warnings} Warning</Badge>
          )}
          {validationResult.summary.advice > 0 && (
            <Badge variant="outline" className="border-blue-500">{validationResult.summary.advice} Advice</Badge>
          )}
        </div>
      </div>

      {/* Firmans List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {/* Imperial Decrees (Cannot be overridden) */}
          {validationResult.firmans.imperialDecrees.map((firman, idx) => renderFirman(firman, idx))}

          {/* Blocks */}
          {validationResult.firmans.blocks.map((firman, idx) => 
            renderFirman(firman, validationResult.firmans.imperialDecrees.length + idx)
          )}

          {/* Warnings */}
          {validationResult.firmans.warnings.map((firman, idx) => 
            renderFirman(firman, validationResult.firmans.imperialDecrees.length + validationResult.firmans.blocks.length + idx)
          )}

          {/* Advice */}
          {validationResult.firmans.advice.map((firman, idx) => 
            renderFirman(firman, validationResult.firmans.imperialDecrees.length + validationResult.firmans.blocks.length + validationResult.firmans.warnings.length + idx)
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {validationResult.summary.total === 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Design Valid</AlertTitle>
          <AlertDescription>
            All engineering constraints satisfied. Design is ready for production.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

