/**
 * DraftingContextMenu - Context-sensitive right-click menu for 2D drafting.
 * Renders different items for: empty space, plain rectangle, defined frame, sash.
 * Gold-tier alignment: LogiKal, Orgadata, KLAES, ABT HeroFis.
 * Precision: memoized handlers, guarded API calls, viewport collision, a11y.
 */

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import React, { useCallback } from 'react';
import type { ContextMenuTarget } from '../hooks/useCanvasEvents';

export interface DraftingContextMenuProps {
  open: boolean;
  clientX: number;
  clientY: number;
  target: ContextMenuTarget | null;
  onOpenChange: (open: boolean) => void;
  /** Drafting API (getGeometry, deleteSelected, etc.) */
  drafting: {
    getGeometry: () => { rectangles: unknown[] };
    getMaterialAwareWindows?: () => unknown[];
    deleteSelected: () => void;
    clearSelection: () => void;
    selectElement?: (index: number) => void;
  };
  selectedSystemPackId?: string;
  onResetView: () => void;
  onZoomToFit: () => void;
  onMoveToNext?: () => void;
  onSize?: (target: ContextMenuTarget) => void;
  onDefineAsFrame?: (target: ContextMenuTarget) => void;
  /** Pre-flight: return warning string to disable "Define as Frame" and show tooltip */
  getDefineAsFrameWarning?: (target: ContextMenuTarget) => string | null;
  onAssignSystemPack?: (target: ContextMenuTarget) => void;
  onProperties?: (target: ContextMenuTarget | null) => void;
  onDuplicate?: (target: ContextMenuTarget) => void;
  onAddMullion?: (target: ContextMenuTarget) => void;
  onAddSash?: (target: ContextMenuTarget) => void;
  onQuickAddTwoSashes?: (target: ContextMenuTarget) => void;
  /** Rule-aware: warning to disable Add Sash / Quick Add 2 Sashes and show tooltip */
  getAddSashWarning?: (target: ContextMenuTarget) => string | null;
  onAssignGlazing?: (target: ContextMenuTarget) => void;
  onGlassColor?: (target: ContextMenuTarget) => void;
  onGlassType?: (target: ContextMenuTarget) => void;
  /** Open pose quick-edit modal (profile color, quantity of this pos). Shown when current pose is being edited. */
  onOpenPoseQuickEdit?: () => void;
  onEgyptianStandards?: () => void;
}

export const DraftingContextMenu: React.FC<DraftingContextMenuProps> = ({
  open,
  clientX,
  clientY,
  target,
  onOpenChange,
  drafting,
  selectedSystemPackId: _selectedSystemPackId,
  onResetView,
  onZoomToFit,
  onMoveToNext,
  onSize,
  onDefineAsFrame,
  getDefineAsFrameWarning,
  onAssignSystemPack,
  onProperties,
  onDuplicate,
  onAddMullion,
  onAddSash,
  onQuickAddTwoSashes,
  getAddSashWarning,
  onAssignGlazing,
  onGlassColor,
  onGlassType,
  onOpenPoseQuickEdit,
  onEgyptianStandards,
}) => {
  const isRectangle = target?.type === 'rectangle';
  const isPlainRect = isRectangle && target && !target.isMaterialAware;
  const isDefinedFrame = isRectangle && target?.isMaterialAware && target?.targetType !== 'sash';
  const isSash = target?.targetType === 'sash' && target?.cellId;

  const handleDelete = useCallback(() => {
    try {
      if (target && drafting.selectElement) {
        if (target.materialWindowIndex !== undefined && drafting.getMaterialAwareWindows) {
          const mwList = drafting.getMaterialAwareWindows();
          const mw = mwList[target.materialWindowIndex] as { id?: string } | undefined;
          if (mw?.id) {
            const geom = drafting.getGeometry();
            const rects = (geom?.rectangles ?? []) as { id?: string }[];
            const idx = rects.findIndex((r) => r.id === mw.id);
            if (idx >= 0) {
              drafting.selectElement(idx);
              drafting.deleteSelected();
            }
          }
        } else if (target.rectIndex !== undefined) {
          drafting.selectElement(target.rectIndex);
          drafting.deleteSelected();
        }
      } else {
        drafting.deleteSelected();
      }
    } catch (_) {
      drafting.deleteSelected();
    }
    onOpenChange(false);
  }, [target, drafting, onOpenChange]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <div
          className="fixed w-px h-px pointer-events-none"
          style={{ left: clientX, top: clientY }}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-[12rem] bg-gray-900 border-gray-700 text-gray-200"
        align="start"
        sideOffset={4}
        alignOffset={0}
        collisionPadding={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
        role="menu"
        aria-label="Drafting context menu"
      >
        {/* ----- On rectangle (plain or frame), not when on sash cell ----- */}
        {isRectangle && !isSash && onSize && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
            onClick={() => { if (target) onSize(target); onOpenChange(false); }}
          >
            Size
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && isPlainRect && onDefineAsFrame && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => { if (target && !getDefineAsFrameWarning?.(target)) { onDefineAsFrame(target); onOpenChange(false); } }}
            disabled={!!(target && getDefineAsFrameWarning?.(target))}
            title={target ? (getDefineAsFrameWarning?.(target) ?? undefined) : undefined}
          >
            Define as Frame
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && onAssignSystemPack && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
            onClick={() => { if (target) onAssignSystemPack(target); onOpenChange(false); }}
          >
            Assign System Pack...
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && isDefinedFrame && onAddMullion && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
            onClick={() => { if (target) onAddMullion(target); onOpenChange(false); }}
          >
            Add Mullion
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && isDefinedFrame && onAddSash && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => { if (target && !getAddSashWarning?.(target)) { onAddSash(target); onOpenChange(false); } }}
            disabled={!!(target && getAddSashWarning?.(target))}
            title={target ? (getAddSashWarning?.(target) ?? undefined) : undefined}
          >
            Add Sash
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && isDefinedFrame && onQuickAddTwoSashes && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => { if (target && !getAddSashWarning?.(target)) { onQuickAddTwoSashes(target); onOpenChange(false); } }}
            disabled={!!(target && getAddSashWarning?.(target))}
            title={target ? (getAddSashWarning?.(target) ?? undefined) : undefined}
          >
            Quick Add 2 Sashes
          </DropdownMenuItem>
        )}
        {isSash && onAssignGlazing && (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
              onClick={() => { if (target) onAssignGlazing(target); onOpenChange(false); }}
            >
              Assign Glazing...
            </DropdownMenuItem>
            {onGlassColor && (
              <DropdownMenuItem
                className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
                onClick={() => { if (target) onGlassColor(target); onOpenChange(false); }}
              >
                Glass Color...
              </DropdownMenuItem>
            )}
            {onGlassType && (
              <DropdownMenuItem
                className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
                onClick={() => { if (target) onGlassType(target); onOpenChange(false); }}
              >
                Glass Type...
              </DropdownMenuItem>
            )}
          </>
        )}
        {(isRectangle && !isSash && (onSize || onDefineAsFrame || onAddMullion || onAddSash)) && (
          <DropdownMenuSeparator className="bg-gray-700" />
        )}
        {onProperties && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
            onClick={() => { onProperties(target); onOpenChange(false); }}
          >
            Properties
          </DropdownMenuItem>
        )}
        {isRectangle && !isSash && onDuplicate && (
          <DropdownMenuItem
            className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
            onClick={() => { if (target) onDuplicate(target); onOpenChange(false); }}
          >
            Duplicate
          </DropdownMenuItem>
        )}
        {onOpenPoseQuickEdit && (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
              onClick={() => { onOpenPoseQuickEdit(); onOpenChange(false); }}
            >
              Profile color...
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
              onClick={() => { onOpenPoseQuickEdit(); onOpenChange(false); }}
            >
              Quantity of this pos...
            </DropdownMenuItem>
          </>
        )}
        {isRectangle && !isSash && (
          <DropdownMenuItem
            className="focus:bg-red-900/30 focus:text-red-200 cursor-pointer"
            onClick={handleDelete}
          >
            Delete
          </DropdownMenuItem>
        )}
        {onMoveToNext && (
          <>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              className="focus:bg-cyan-900/30 focus:text-cyan-200 cursor-pointer"
              onClick={() => {
                try {
                  onMoveToNext();
                } finally {
                  onOpenChange(false);
                }
              }}
            >
              Save &amp; Move to Next
            </DropdownMenuItem>
          </>
        )}

        {/* ----- On empty space ----- */}
        {!target && (
          <>
            <DropdownMenuItem
              className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
              onClick={() => { onResetView(); onOpenChange(false); }}
            >
              Reset View
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
              onClick={() => { onZoomToFit(); onOpenChange(false); }}
            >
              Zoom to Fit
            </DropdownMenuItem>
            {onProperties && (
              <DropdownMenuItem
                className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
                onClick={() => { onProperties(null); onOpenChange(false); }}
              >
                Properties
              </DropdownMenuItem>
            )}
            {onEgyptianStandards && (
              <>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  className="focus:bg-gray-800 focus:text-amber-200 cursor-pointer"
                  onClick={() => { onEgyptianStandards(); onOpenChange(false); }}
                >
                  Egyptian Standards...
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
