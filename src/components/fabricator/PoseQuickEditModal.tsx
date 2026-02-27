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
import { isGlazingSpecFlat, type WindowUnit } from '@/types/fabricator';
import { Loader2, Save } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PoseQuickEditModalProps {
  pose: WindowUnit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save. Parent can use this to refresh data. */
  onSaved?: (updated: WindowUnit) => void;
  /**
   * Optional external save handler (e.g., parent-managed local fallback in Project Studio).
   * If provided, the modal will use this instead of direct upsert mutation.
   */
  onSavePose?: (updated: WindowUnit) => Promise<void> | void;
}

type SupportedGlazingType = 'single' | 'double' | 'triple';

function normalizeGlazingType(raw?: string): SupportedGlazingType {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('triple')) return 'triple';
  if (v.includes('single')) return 'single';
  return 'double';
}

function readPoseGlazingDefaults(glazing: WindowUnit['glazing'] | undefined): {
  type: SupportedGlazingType;
  color: string;
} {
  if (!glazing || typeof glazing !== 'object') {
    return { type: 'double', color: '' };
  }

  if (isGlazingSpecFlat(glazing)) {
    return {
      type: normalizeGlazingType(glazing.type),
      color: glazing.color ?? '',
    };
  }

  // Drafting path may store either one-level or nested per-cell glazing maps.
  const candidates: Array<{ type?: string; color?: string }> = [];
  for (const value of Object.values(glazing as Record<string, unknown>)) {
    if (value && typeof value === 'object' && ('type' in value || 'color' in value)) {
      candidates.push(value as { type?: string; color?: string });
      continue;
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (nested && typeof nested === 'object' && ('type' in nested || 'color' in nested)) {
          candidates.push(nested as { type?: string; color?: string });
        }
      }
    }
  }

  const first = candidates.find((item) => item.type || item.color);
  return {
    type: normalizeGlazingType(first?.type),
    color: first?.color ?? '',
  };
}

function applyPoseGlazing(
  existing: WindowUnit['glazing'],
  glazingType: SupportedGlazingType,
  glazingColor: string,
): WindowUnit['glazing'] {
  const normalizedColor = glazingColor.trim();

  if (!existing || typeof existing !== 'object' || Object.keys(existing as Record<string, unknown>).length === 0) {
    return {
      type: glazingType,
      color: normalizedColor || undefined,
    };
  }

  if (isGlazingSpecFlat(existing)) {
    return {
      ...existing,
      type: glazingType,
      color: normalizedColor || undefined,
    };
  }

  const source = existing as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && ('type' in value || 'color' in value)) {
      next[key] = {
        ...(value as Record<string, unknown>),
        type: glazingType,
        color: normalizedColor || undefined,
      };
      return;
    }

    if (value && typeof value === 'object') {
      const nestedOut: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([cellId, cellSpec]) => {
        if (cellSpec && typeof cellSpec === 'object') {
          nestedOut[cellId] = {
            ...(cellSpec as Record<string, unknown>),
            type: glazingType,
            color: normalizedColor || undefined,
          };
        }
      });
      next[key] = nestedOut;
      return;
    }

    next[key] = value;
  });

  return next as WindowUnit['glazing'];
}

export const PoseQuickEditModal: React.FC<PoseQuickEditModalProps> = ({
  pose,
  open,
  onOpenChange,
  onSaved,
  onSavePose,
}) => {
  const upsertPose = useUpsertPose();

  // ─── Local form state ──────────────────────────────────────────
  const [status, setStatus] = useState(pose?.status ?? 'design');
  const [quantity, setQuantity] = useState(pose?.quantity ?? 1);
  const [widthInput, setWidthInput] = useState(String(pose?.overallWidth ?? 1000));
  const [heightInput, setHeightInput] = useState(String(pose?.overallHeight ?? 1000));
  const [color, setColor] = useState(pose?.color ?? '');
  const [glazingType, setGlazingType] = useState<SupportedGlazingType>('double');
  const [glazingColor, setGlazingColor] = useState('');
  const [systemPackId, setSystemPackId] = useState(pose?.systemPackId ?? '');
  const [isSaving, setIsSaving] = useState(false);

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
    setWidthInput(String(pose.overallWidth ?? 1000));
    setHeightInput(String(pose.overallHeight ?? 1000));
    setColor(pose.color ?? '');
    const glazingDefaults = readPoseGlazingDefaults(pose.glazing);
    setGlazingType(glazingDefaults.type);
    setGlazingColor(glazingDefaults.color);
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
    const parsedWidth = Number.parseInt(widthInput, 10);
    const parsedHeight = Number.parseInt(heightInput, 10);
    const nextWidth = Math.max(100, Number.isFinite(parsedWidth) ? parsedWidth : pose.overallWidth);
    const nextHeight = Math.max(100, Number.isFinite(parsedHeight) ? parsedHeight : pose.overallHeight);

    const updated: WindowUnit = {
      ...pose,
      status: status as WindowUnit['status'],
      quantity,
      overallWidth: nextWidth,
      overallHeight: nextHeight,
      color,
      glazing: applyPoseGlazing(pose.glazing, glazingType, glazingColor),
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
      setIsSaving(true);
      if (onSavePose) {
        await onSavePose(updated);
      } else {
        await upsertPose.mutateAsync({ windowUnit: updated });
      }
      toast.success(`Pose ${pose.posNumber} updated`);
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to save: ${err}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    pose, status, quantity, widthInput, heightInput, color, glazingType, glazingColor, systemPackId,
    flatNumber, floor, buildingBlock, roomOrZone, elevation, remarks,
    upsertPose, onSaved, onOpenChange, onSavePose,
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
            {pose.orderNumber} &mdash; {Number.parseInt(widthInput, 10) || pose.overallWidth} x {Number.parseInt(heightInput, 10) || pose.overallHeight} mm
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
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
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
              <Label className="text-xs text-amber-300">Glazing Type</Label>
              <Select value={glazingType} onValueChange={(v) => setGlazingType(v as SupportedGlazingType)}>
                <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="triple">Triple</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Width (mm)</Label>
              <Input
                type="number"
                min={100}
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Height (mm)</Label>
              <Input
                type="number"
                min={100}
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-300">Glazing Color / Tint</Label>
              <Input
                value={glazingColor}
                onChange={(e) => setGlazingColor(e.target.value)}
                placeholder="e.g. clear, bronze, low-e"
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
            disabled={upsertPose.isPending || isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {upsertPose.isPending || isSaving ? (
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
