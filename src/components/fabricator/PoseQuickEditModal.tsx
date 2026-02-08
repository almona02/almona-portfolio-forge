/**
 * PoseQuickEditModal — Inline metadata editing for a single pose.
 *
 * Allows rapid editing of position metadata (flat, floor, zone, remarks)
 * plus core properties (status, quantity, color, system pack) without
 * leaving the current view.
 *
 * @since Phase 3 — UX Enhancements (2026-02-08)
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useUpsertPose } from '@/hooks/useFabricatorQueries';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import type { WindowUnit } from '@/types/fabricator';
import { Loader2, Save } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PoseQuickEditModalProps {
  pose: WindowUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save. Parent can use this to refresh data. */
  onSaved?: (updated: WindowUnit) => void;
}

export const PoseQuickEditModal: React.FC<PoseQuickEditModalProps> = ({
  pose,
  open,
  onOpenChange,
  onSaved,
}) => {
  const upsertPose = useUpsertPose();

  // ─── Local form state ──────────────────────────────────────────
  const [status, setStatus] = useState(pose?.status ?? 'design');
  const [quantity, setQuantity] = useState(pose?.quantity ?? 1);
  const [color, setColor] = useState(pose?.color ?? '');
  const [systemPackId, setSystemPackId] = useState(pose?.systemPackId ?? '');

  // Position metadata
  const [flatNumber, setFlatNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [buildingBlock, setBuildingBlock] = useState('');
  const [roomOrZone, setRoomOrZone] = useState('');
  const [elevation, setElevation] = useState('');
  const [remarks, setRemarks] = useState('');

  // Sync form state when pose changes
  useEffect(() => {
    if (!pose) return;
    setStatus(pose.status ?? 'design');
    setQuantity(pose.quantity ?? 1);
    setColor(pose.color ?? '');
    setSystemPackId(pose.systemPackId ?? '');
    const meta = pose.positionMeta ?? {};
    setFlatNumber(meta.flatNumber ?? '');
    setFloor(meta.floor ?? '');
    setBuildingBlock(meta.buildingBlock ?? '');
    setRoomOrZone(meta.roomOrZone ?? '');
    setElevation(meta.elevation ?? '');
    setRemarks(meta.remarks ?? '');
  }, [pose]);

  const handleSave = useCallback(async () => {
    if (!pose) return;

    const updated: WindowUnit = {
      ...pose,
      status: status as WindowUnit['status'],
      quantity,
      color,
      systemPackId: systemPackId || pose.systemPackId,
      positionMeta: {
        ...pose.positionMeta,
        flatNumber: flatNumber || undefined,
        floor: floor || undefined,
        buildingBlock: buildingBlock || undefined,
        roomOrZone: roomOrZone || undefined,
        elevation: elevation || undefined,
        remarks: remarks || undefined,
      },
      updatedAt: new Date(),
    };

    try {
      await upsertPose.mutateAsync({ windowUnit: updated });
      toast.success(`Pose ${pose.posNumber} updated`);
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to save: ${err}`);
    }
  }, [
    pose, status, quantity, color, systemPackId,
    flatNumber, floor, buildingBlock, roomOrZone, elevation, remarks,
    upsertPose, onSaved, onOpenChange,
  ]);

  if (!pose) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0f0f0f] border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="text-amber-200">
            Quick Edit: {pose.posNumber}
          </DialogTitle>
          <DialogDescription className="text-amber-600/70">
            {pose.orderNumber} &mdash; {pose.overallWidth} x {pose.overallHeight} mm
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Core properties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Color / Material</Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. RAL 9016"
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">System Pack</Label>
              <Select value={systemPackId} onValueChange={setSystemPackId}>
                <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 max-h-48">
                  {SYSTEM_PACKS.map((pack) => (
                    <SelectItem key={pack.meta.id} value={pack.meta.id}>
                      {pack.meta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-amber-600/20 pt-3">
            <span className="text-[10px] text-amber-600/70 uppercase tracking-wider">Position Metadata</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-amber-400/70">Flat #</Label>
              <Input
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-amber-400/70">Floor</Label>
              <Input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-amber-400/70">Building Block</Label>
              <Input
                value={buildingBlock}
                onChange={(e) => setBuildingBlock(e.target.value)}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-amber-400/70">Room / Zone</Label>
              <Input
                value={roomOrZone}
                onChange={(e) => setRoomOrZone(e.target.value)}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-amber-400/70">Elevation</Label>
              <Input
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-amber-400/70">Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Special notes for this position..."
              className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-7 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-amber-600/30 text-amber-200 hover:bg-amber-900/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertPose.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {upsertPose.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoseQuickEditModal;
