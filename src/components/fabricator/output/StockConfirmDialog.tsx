import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface StockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: string;
  quantity?: number | null;
  bars: number | null;
  remnantsCreated: number | null;
  scrap: number | null;
  warehouse: string;
  onConfirm?: () => void;
}

/**
 * Fail-safe confirmation before warehouse-changing actions.
 * Does not mutate inventory; callers must invoke existing stock APIs.
 */
export const StockConfirmDialog: React.FC<StockConfirmDialogProps> = ({
  open,
  onOpenChange,
  material,
  quantity,
  bars,
  remnantsCreated,
  scrap,
  warehouse,
  onConfirm,
}) => {
  const { t } = useTranslation('fabricator');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-[#111] border-amber-600/30 text-amber-100"
        data-testid="stock-confirm-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('industrial.stock.confirm_title', 'Confirm stock consumption')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {t(
              'industrial.stock.confirm_body',
              'This action affects warehouse records. Review the values below. Nothing is written until you confirm, and this dialog does not change stock semantics by itself.',
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <dt className="text-amber-700">Material</dt>
          <dd dir="ltr">{material || NOT_RECORDED}</dd>
          <dt className="text-amber-700">Quantity</dt>
          <dd dir="ltr">{quantity ?? NOT_RECORDED}</dd>
          <dt className="text-amber-700">Bars</dt>
          <dd dir="ltr">{bars ?? NOT_RECORDED}</dd>
          <dt className="text-amber-700">Remnants created</dt>
          <dd dir="ltr">{remnantsCreated ?? NOT_RECORDED}</dd>
          <dt className="text-amber-700">Scrap</dt>
          <dd dir="ltr">{scrap ?? NOT_RECORDED}</dd>
          <dt className="text-amber-700">Warehouse</dt>
          <dd>{warehouse || NOT_RECORDED}</dd>
        </dl>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('industrial.stock.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="stock-confirm-accept"
            onClick={() => onConfirm?.()}
          >
            {t('industrial.stock.confirm', 'Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
