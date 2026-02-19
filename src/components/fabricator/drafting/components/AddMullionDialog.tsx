/**
 * AddMullionDialog - Add frame-level mullion (vertical or horizontal) with position and optional width (mm).
 * Gold-tier: clear inputs, validation, accessible.
 */

import { Button } from '@/shared/ui/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import React, { useCallback, useEffect, useState } from 'react';

export interface AddMullionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameWidthMm: number;
  frameHeightMm: number;
  onApply: (params: {
    type: 'vertical' | 'horizontal';
    positionMm: number;
    positionPercent?: number;
    widthMm?: number;
    splitType?: 'absolute' | 'proportional' | 'clearance-based';
  }) => void;
}

const DEFAULT_WIDTH_MM = 50;

export const AddMullionDialog: React.FC<AddMullionDialogProps> = ({
  open,
  onOpenChange,
  frameWidthMm,
  frameHeightMm,
  onApply,
}) => {
  const [type, setType] = useState<'vertical' | 'horizontal'>('vertical');
  const [splitType, setSplitType] = useState<'absolute' | 'proportional' | 'clearance-based'>('absolute');
  const [position, setPosition] = useState('');
  const [widthMm, setWidthMm] = useState('');

  useEffect(() => {
    if (open) {
      setType('vertical');
      setSplitType('absolute');
      setPosition('');
      setWidthMm(String(DEFAULT_WIDTH_MM));
    }
  }, [open]);

  const maxPosition = type === 'vertical' ? frameWidthMm : frameHeightMm;

  const handleApply = useCallback(() => {
    const pos = Number.parseFloat(position);
    if (!Number.isFinite(pos)) return;
    if (splitType === 'absolute' && (pos <= 0 || pos >= maxPosition)) return;
    if (splitType === 'proportional' && (pos <= 0 || pos >= 100)) return;
    if (splitType === 'clearance-based') return; // not implemented
    const w = widthMm.trim() === '' ? undefined : Number.parseFloat(widthMm);
    if (w !== undefined && (!Number.isFinite(w) || w <= 0)) return;
    const positionMm = splitType === 'proportional' ? (pos / 100) * maxPosition : pos;
    onApply({
      type,
      positionMm,
      ...(splitType === 'proportional' ? { positionPercent: pos } : {}),
      ...(w != null && w > 0 ? { widthMm: w } : {}),
      splitType,
    });
    onOpenChange(false);
  }, [position, widthMm, type, splitType, maxPosition, onApply, onOpenChange]);

  const posNum = Number.parseFloat(position);
  const validPosition =
    splitType === 'absolute'
      ? Number.isFinite(posNum) && posNum > 0 && posNum < maxPosition
      : splitType === 'proportional'
        ? Number.isFinite(posNum) && posNum > 0 && posNum < 100
        : false;
  const validWidth = widthMm.trim() === '' || (Number.isFinite(Number.parseFloat(widthMm)) && Number.parseFloat(widthMm) > 0);
  const canApply = validPosition && validWidth && splitType !== 'clearance-based';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200">
        <DialogHeader>
          <DialogTitle>Add Mullion</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mullionType"
                  checked={type === 'vertical'}
                  onChange={() => setType('vertical')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Vertical
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mullionType"
                  checked={type === 'horizontal'}
                  onChange={() => setType('horizontal')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Horizontal
              </label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Split type</Label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="splitType"
                  checked={splitType === 'absolute'}
                  onChange={() => setSplitType('absolute')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Absolute (mm)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="splitType"
                  checked={splitType === 'proportional'}
                  onChange={() => setSplitType('proportional')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Proportional (%)
              </label>
              <label className="flex items-center gap-2 cursor-pointer opacity-60">
                <input
                  type="radio"
                  name="splitType"
                  checked={splitType === 'clearance-based'}
                  onChange={() => setSplitType('clearance-based')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                  disabled
                />
                Clearance-based (soon)
              </label>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>
              {splitType === 'absolute'
                ? `Position (mm from ${type === 'vertical' ? 'left' : 'top'}) — max ${Math.round(maxPosition)}`
                : 'Position (%)'}
            </Label>
            <Input
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={splitType === 'absolute' ? (type === 'vertical' ? String(Math.round(frameWidthMm / 2)) : String(Math.round(frameHeightMm / 2))) : '50'}
              min={splitType === 'proportional' ? 1 : 1}
              max={splitType === 'proportional' ? 99 : maxPosition - 1}
              step={splitType === 'proportional' ? 1 : 1}
              className="bg-gray-800 border-gray-600 text-gray-200"
            />
          </div>
          <div className="grid gap-2">
            <Label>Width (mm) — optional</Label>
            <Input
              type="number"
              value={widthMm}
              onChange={(e) => setWidthMm(e.target.value)}
              placeholder={String(DEFAULT_WIDTH_MM)}
              min={10}
              max={200}
              step={5}
              className="bg-gray-800 border-gray-600 text-gray-200"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600">
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={!canApply} className="bg-amber-600 hover:bg-amber-700">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
