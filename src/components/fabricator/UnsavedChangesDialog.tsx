/**
 * Prestige Unsaved Changes Confirmation Dialog
 * 
 * A polished, reusable confirmation dialog for unsaved changes
 * that matches the project's design standards.
 */

import React from 'react';
import { Button } from '@/shared/ui/ui/button';
import { AlertTriangle, Save, X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  context?: string; // e.g., "Profile Tuning Studio", "Engineering Bay"
  showSaveOption?: boolean;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title,
  description,
  context,
  showSaveOption = false,
  onSave,
  isSaving = false,
}) => {
  const { t } = useTranslation('fabricator');

  const handleSave = async () => {
    if (onSave) {
      await onSave();
      onConfirm(); // Proceed after saving
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  // Don't render anything if not open - no modal overlay needed
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog content */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-100">
                {title || t('unsavedChanges.title', 'Unsaved Changes')}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {description || t('unsavedChanges.description', 'You have unsaved changes that will be lost if you leave this page.')}
              </p>
            </div>
          </div>

          {/* Context */}
          {context && (
            <div className="py-3 px-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw className="h-3 w-3" />
                <span>
                  {t('unsavedChanges.context', 'Context')}: <span className="text-gray-300 font-medium">{context}</span>
                </span>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="py-3 px-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-xs text-amber-200">
                <p className="font-semibold mb-1">
                  {t('unsavedChanges.warning', 'What will happen:')}
                </p>
                <ul className="space-y-1 text-amber-300/80">
                  <li>• {t('unsavedChanges.warningLost', 'All unsaved changes will be permanently lost')}</li>
                  <li>• {t('unsavedChanges.warningNoRecovery', 'Changes cannot be recovered after leaving')}</li>
                  {showSaveOption && (
                    <li>• {t('unsavedChanges.warningSaveFirst', 'You can save your changes before leaving')}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
            >
              <X className="h-4 w-4 mr-2" />
              {t('unsavedChanges.cancel', 'Cancel')}
            </Button>

            {showSaveOption && onSave && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {t('unsavedChanges.saving', 'Saving...')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('unsavedChanges.saveAndLeave', 'Save & Leave')}
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onConfirm}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('unsavedChanges.leaveWithoutSaving', 'Leave Without Saving')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

