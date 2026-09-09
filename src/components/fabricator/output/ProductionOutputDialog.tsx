import {
  MACHINE_OUTPUT_CAPABILITIES,
  type MachineOutputCapabilityId,
} from '@/lib/fabricator/machineOutputCapabilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ProductionOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasBom?: boolean;
  hasOptimization?: boolean;
  onExport?: (id: MachineOutputCapabilityId) => void;
}

/**
 * Central Production Output catalog. Unsupported formats are disabled
 * and cannot fire an export callback (NCW is never available).
 */
export const ProductionOutputDialog: React.FC<ProductionOutputDialogProps> = ({
  open,
  onOpenChange,
  hasBom = false,
  hasOptimization = false,
  onExport,
}) => {
  const { t } = useTranslation('fabricator');
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  const gated = (id: MachineOutputCapabilityId, baseAvailable: boolean) => {
    if (id === 'bom') return baseAvailable && hasBom;
    if (id === 'cut-sheet' || id === 'csv' || id === 'mdb' || id === 'cnc' || id === 'labels') {
      return baseAvailable && hasOptimization;
    }
    return baseAvailable;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#111] border-amber-600/30 text-amber-100 sm:max-w-lg"
        data-testid="production-output-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('industrial.output.title', 'Production output')}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {t(
              'industrial.output.subtitle',
              'Only formats that exist in ALMONA are enabled. Unsupported formats stay disabled.',
            )}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {MACHINE_OUTPUT_CAPABILITIES.map((cap) => {
            const available = gated(cap.id, cap.available);
            return (
              <li
                key={cap.id}
                className="flex items-center justify-between gap-3 border border-amber-900/30 px-3 py-2"
              >
                <div>
                  <div className="text-sm">{cap.label}</div>
                  {!cap.available && (
                    <p className="text-[11px] text-slate-500" data-testid={`output-reason-${cap.id}`}>
                      {cap.reason}
                    </p>
                  )}
                  {cap.available && !available && (
                    <p className="text-[11px] text-slate-500">
                      {t('industrial.output.needs_data', 'Requires optimization or BOM data')}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!available}
                  data-testid={`output-export-${cap.id}`}
                  aria-label={
                    available
                      ? `Export ${cap.label}`
                      : `${cap.label} not available`
                  }
                  onClick={() => {
                    if (!available) return;
                    setLastAttempt(cap.id);
                    onExport?.(cap.id);
                  }}
                >
                  {cap.available
                    ? t('industrial.output.export', 'Export')
                    : t('industrial.output.planned', 'Not available / planned')}
                </Button>
              </li>
            );
          })}
        </ul>
        {lastAttempt && (
          <p className="text-[10px] text-slate-500" data-testid="output-last-attempt">
            {lastAttempt}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

