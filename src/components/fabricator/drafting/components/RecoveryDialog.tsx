/**
 * Recovery Dialog Component
 * 
 * Gold-tier crash recovery dialog with state restoration options
 * for the Drafting Workbench.
 * 
 * Constitutional: Deterministic UI, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Button } from '@/shared/ui/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { AlertCircle, RotateCcw, X, Clock } from 'lucide-react';
import React, { useEffect } from 'react';
import { getTypographyPreset } from '../styles/typography';
import { formatVersionTimestamp } from '../utils/statePersistence';
import { setupFocusTrap } from '../utils/focusManagement';

export interface RecoveryDialogProps {
  /** Is dialog open */
  open: boolean;
  /** Recovery timestamp */
  recoveryTimestamp?: number;
  /** On restore */
  onRestore: () => void;
  /** On dismiss */
  onDismiss: () => void;
  /** On discard */
  onDiscard?: () => void;
}

export const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  open,
  recoveryTimestamp,
  onRestore,
  onDismiss,
  onDiscard,
}) => {
  // Setup focus trap when dialog opens
  useEffect(() => {
    if (open) {
      // Use setTimeout to ensure DialogContent is rendered
      const timer = setTimeout(() => {
        const dialogElement = document.querySelector('[role="dialog"]') as HTMLElement;
        if (dialogElement) {
          return setupFocusTrap(dialogElement);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent 
        className="bg-slate-900 border-amber-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="h-6 w-6 text-amber-400" />
            </div>
            <DialogTitle className={`${getTypographyPreset('h3')} text-amber-200`}>
              Recover Unsaved Work
            </DialogTitle>
          </div>
          <DialogDescription className={`${getTypographyPreset('body')} text-slate-400`}>
            We detected an unsaved draft from a previous session. Would you like to restore it?
          </DialogDescription>
        </DialogHeader>

        {recoveryTimestamp && (
          <div className="flex items-center gap-2 p-3 bg-slate-800/50 border border-amber-600/20 rounded-lg">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className={`${getTypographyPreset('bodySmall')} text-slate-300`}>
              Last saved: {formatVersionTimestamp(recoveryTimestamp)}
            </span>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2">
          {onDiscard && (
            <Button
              variant="outline"
              onClick={onDiscard}
              className="border-red-600/30 text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onDismiss}
            className="border-slate-600/30 text-slate-400 hover:bg-slate-800/50"
          >
            Cancel
          </Button>
          <Button
            onClick={onRestore}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

RecoveryDialog.displayName = 'RecoveryDialog';

export default RecoveryDialog;

