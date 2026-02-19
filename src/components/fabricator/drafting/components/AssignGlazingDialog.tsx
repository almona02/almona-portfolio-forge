/**
 * AssignGlazingDialog - Assign glazing (single/double glass, optional color) to a sash cell.
 * Affects BOM: glass + glazing bead (UPVC). Gold-tier: clear options, accessible.
 */

import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Label } from '@/shared/ui/ui/label';
import React, { useCallback, useEffect, useState } from 'react';

const GLASS_COLORS = [
  { value: '', label: 'Clear' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'grey', label: 'Grey' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

export interface AssignGlazingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: 'single' | 'double';
  initialColor?: string;
  initialGeorgianBars?: boolean;
  onApply: (params: { type: 'single' | 'double'; color?: string; georgianBars?: boolean }) => void;
}

export const AssignGlazingDialog: React.FC<AssignGlazingDialogProps> = ({
  open,
  onOpenChange,
  initialType = 'double',
  initialColor = '',
  initialGeorgianBars = false,
  onApply,
}) => {
  const [type, setType] = useState<'single' | 'double'>(initialType);
  const [color, setColor] = useState(initialColor);
  const [georgianBars, setGeorgianBars] = useState(initialGeorgianBars);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setColor(initialColor);
      setGeorgianBars(initialGeorgianBars);
    }
  }, [open, initialType, initialColor, initialGeorgianBars]);

  const handleApply = useCallback(() => {
    onApply({
      type,
      color: color || undefined,
      georgianBars: type === 'double' ? georgianBars : undefined,
    });
    onOpenChange(false);
  }, [type, color, georgianBars, onApply, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200">
        <DialogHeader>
          <DialogTitle>Assign Glazing</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Glass type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="glazingType"
                  checked={type === 'single'}
                  onChange={() => setType('single')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Single glass
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="glazingType"
                  checked={type === 'double'}
                  onChange={() => setType('double')}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                Double glass
              </label>
            </div>
          </div>
          {type === 'double' && (
            <div className="grid gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={georgianBars}
                  onChange={(e) => setGeorgianBars(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-amber-500"
                />
                <span>Georgian bars (Latish) inside double glazing</span>
              </label>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Glass color</Label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-200"
            >
              {GLASS_COLORS.map((opt) => (
                <option key={opt.value || 'clear'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600">
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} className="bg-amber-600 hover:bg-amber-700">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
