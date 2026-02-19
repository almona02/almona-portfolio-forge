/**
 * SizeDialog - Edit frame width × height (mm) from context menu.
 * Gold-tier: clamped to min/max, numeric validation, accessible.
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

export interface SizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widthMm: number;
  heightMm: number;
  onApply: (widthMm: number, heightMm: number) => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_MIN = 100;
const DEFAULT_MAX = 4000;

export const SizeDialog: React.FC<SizeDialogProps> = ({
  open,
  onOpenChange,
  widthMm,
  heightMm,
  onApply,
  minWidth = DEFAULT_MIN,
  minHeight = DEFAULT_MIN,
  maxWidth = DEFAULT_MAX,
  maxHeight = DEFAULT_MAX,
}) => {
  const [width, setWidth] = useState(String(widthMm));
  const [height, setHeight] = useState(String(heightMm));

  useEffect(() => {
    if (open) {
      setWidth(String(Math.round(widthMm)));
      setHeight(String(Math.round(heightMm)));
    }
  }, [open, widthMm, heightMm]);

  const handleApply = useCallback(() => {
    const w = Number.parseFloat(width);
    const h = Number.parseFloat(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    const clampedW = Math.min(Math.max(w, minWidth), maxWidth);
    const clampedH = Math.min(Math.max(h, minHeight), maxHeight);
    onApply(clampedW, clampedH);
    onOpenChange(false);
  }, [width, height, minWidth, minHeight, maxWidth, maxHeight, onApply, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      }
    },
    [handleApply]
  );

  const validWidth = Number.isFinite(Number.parseFloat(width)) && Number.parseFloat(width) > 0;
  const validHeight = Number.isFinite(Number.parseFloat(height)) && Number.parseFloat(height) > 0;
  const canApply = validWidth && validHeight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-gray-900 border-gray-700 text-gray-200 sm:max-w-sm"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="text-amber-200">Size (mm)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size-width" className="text-gray-300">
                Width
              </Label>
              <Input
                id="size-width"
                type="number"
                min={minWidth}
                max={maxWidth}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="bg-gray-800 border-gray-600 text-gray-100"
                aria-invalid={!validWidth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size-height" className="text-gray-300">
                Height
              </Label>
              <Input
                id="size-height"
                type="number"
                min={minHeight}
                max={maxHeight}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-gray-800 border-gray-600 text-gray-100"
                aria-invalid={!validHeight}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-gray-300"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
