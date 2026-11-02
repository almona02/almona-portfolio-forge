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
      <DialogContent className="bg-background border-border text-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-warning">Assign System Pack</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <ul className="space-y-1" role="listbox">
            {SYSTEM_PACKS.map((pack) => (
              <li key={pack.meta.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-left text-foreground hover:bg-card hover:text-warning"
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
            className="border-border text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
