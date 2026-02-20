/**
 * AssignSystemPackDialog - Pick a system pack for the selected frame (context menu).
 * Gold-tier: list SYSTEM_PACKS by name, apply via onSelect(systemPackId).
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Button } from '@/shared/ui/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import React, { useCallback } from 'react';

export interface AssignSystemPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (systemPackId: string) => void;
}

export const AssignSystemPackDialog: React.FC<AssignSystemPackDialogProps> = ({
  open,
  onOpenChange,
  onSelect,
}) => {
  const handlePick = useCallback(
    (id: string) => {
      onSelect(id);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-amber-200">Assign System Pack</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <ul className="space-y-1" role="listbox">
            {SYSTEM_PACKS.map((pack) => (
              <li key={pack.meta.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-left text-gray-200 hover:bg-gray-800 hover:text-amber-200"
                  onClick={() => handlePick(pack.meta.id)}
                >
                  {pack.meta.name}
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-gray-300"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
