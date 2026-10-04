import type { WindowUnit } from '@/types/fabricator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/ui/ui/context-menu';
import { cn } from '@/lib/utils';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';

interface PoseLayoutPreviewProps {
  poses: WindowUnit[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onAdd?: () => void;
  /** Open measuring / edit for this pose */
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  compact?: boolean;
}

/**
 * Scaled elevation thumbnails for poses in a project.
 * AICS-001: aspect ratio is overallWidth/overallHeight as stored, not estimated.
 * Right-click: edit / duplicate / delete when handlers are provided.
 */
export const PoseLayoutPreview: React.FC<PoseLayoutPreviewProps> = ({
  poses,
  activeId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  compact = false,
}) => {
  const maxW = useMemo(
    () => Math.max(1, ...poses.map((p) => p.overallWidth || 1)),
    [poses],
  );
  const maxH = useMemo(
    () => Math.max(1, ...poses.map((p) => p.overallHeight || 1)),
    [poses],
  );
  const box = compact ? 88 : 128;
  const hasMenu = Boolean(onEdit || onDelete || onDuplicate);

  if (poses.length === 0 && !onAdd) {
    return (
      <p className="text-sm text-slate-500 py-6 text-center">
        No poses yet. Measure the first window to see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {poses.map((pose, i) => {
        const w = pose.overallWidth || 0;
        const h = pose.overallHeight || 0;
        const widthPx = Math.max(36, Math.round((w / maxW) * box));
        const heightPx = Math.max(36, Math.round((h / maxH) * box));
        const active = pose.id === activeId;
        const grid = pose.grid;
        const cols = Number(grid?.cols) > 0 ? Number(grid.cols) : 1;
        const rows = Number(grid?.rows) > 0 ? Number(grid.rows) : 1;
        const colWeights = Array.isArray(grid?.colWidths) && grid.colWidths.length === cols
          ? grid.colWidths
          : Array.from({ length: cols }, () => 1);
        const rowWeights = Array.isArray(grid?.rowHeights) && grid.rowHeights.length === rows
          ? grid.rowHeights
          : Array.from({ length: rows }, () => 1);
        const totalColWeight = colWeights.reduce((sum, value) => sum + value, 0) || 1;
        const totalRowWeight = rowWeights.reduce((sum, value) => sum + value, 0) || 1;
        const poseLabel = `Pose ${pose.posNumber || i + 1}`;
        const canDelete = poses.length > 1;

        const card = (
          <button
            type="button"
            onClick={() => onSelect?.(pose.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors text-left w-full',
              active
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-amber-600/40',
            )}
          >
            <div
              className={cn(
                'relative overflow-hidden rounded-sm border',
                active ? 'border-amber-400 bg-amber-400/15' : 'border-cyan-500/50 bg-cyan-500/10',
              )}
              style={{ width: widthPx, height: heightPx }}
              role="img"
              aria-label={`${poseLabel}: ${Math.round(w)} by ${Math.round(h)} millimetres, ${cols} columns by ${rows} rows`}
            >
              {(grid?.cells ?? []).map((cell) => {
                const leftWeight = colWeights.slice(0, cell.col).reduce((sum, value) => sum + value, 0);
                const topWeight = rowWeights.slice(0, cell.row).reduce((sum, value) => sum + value, 0);
                const cellWidthWeight = colWeights
                  .slice(cell.col, cell.col + (cell.colSpan ?? 1))
                  .reduce((sum, value) => sum + value, 0);
                const cellHeightWeight = rowWeights
                  .slice(cell.row, cell.row + (cell.rowSpan ?? 1))
                  .reduce((sum, value) => sum + value, 0);
                return (
                  <span
                    key={cell.id}
                    data-cell-type={cell.type}
                    className={`absolute border border-slate-400/60 ${
                      cell.type === 'sliding'
                        ? 'bg-amber-400/25'
                        : cell.type === 'sash'
                          ? 'bg-emerald-400/20'
                          : 'bg-cyan-400/10'
                    }`}
                    style={{
                      left: `${(leftWeight / totalColWeight) * 100}%`,
                      top: `${(topWeight / totalRowWeight) * 100}%`,
                      width: `${(cellWidthWeight / totalColWeight) * 100}%`,
                      height: `${(cellHeightWeight / totalRowWeight) * 100}%`,
                    }}
                    aria-hidden
                  />
                );
              })}
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{poseLabel}</div>
              <div className="font-mono text-xs text-amber-200">
                {w > 0 && h > 0 ? `${Math.round(w)} × ${Math.round(h)} mm` : 'Not measured'}
              </div>
            </div>
          </button>
        );

        if (!hasMenu) {
          return (
            <div key={pose.id} className="min-w-[96px]">
              {card}
            </div>
          );
        }

        return (
          <ContextMenu key={pose.id}>
            <ContextMenuTrigger asChild>
              <div className="min-w-[96px]">{card}</div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52 bg-slate-950 border-amber-600/40 text-amber-100">
              <ContextMenuLabel className="text-amber-200/90 font-mono text-xs">
                {poseLabel}
                {w > 0 && h > 0 ? ` · ${Math.round(w)}×${Math.round(h)}` : ''}
              </ContextMenuLabel>
              <ContextMenuSeparator className="bg-amber-600/25" />
              {onEdit && (
                <ContextMenuItem
                  className="focus:bg-amber-500/15 focus:text-amber-50 cursor-pointer gap-2"
                  onSelect={() => onEdit(pose.id)}
                >
                  <Pencil className="h-3.5 w-3.5 text-amber-400" />
                  Edit / measure
                </ContextMenuItem>
              )}
              {onDuplicate && (
                <ContextMenuItem
                  className="focus:bg-amber-500/15 focus:text-amber-50 cursor-pointer gap-2"
                  onSelect={() => onDuplicate(pose.id)}
                >
                  <Copy className="h-3.5 w-3.5 text-amber-400" />
                  Duplicate
                </ContextMenuItem>
              )}
              {onDelete && (
                <>
                  <ContextMenuSeparator className="bg-amber-600/25" />
                  <ContextMenuItem
                    disabled={!canDelete}
                    className="focus:bg-red-500/20 focus:text-red-200 cursor-pointer gap-2 text-red-300 data-[disabled]:opacity-40"
                    onSelect={() => {
                      if (!canDelete) return;
                      onDelete(pose.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {canDelete ? 'Delete pose' : 'Cannot delete last pose'}
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-amber-600/40 text-amber-400 hover:bg-amber-500/10 min-w-[96px] min-h-[120px]"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-medium">Add pose</span>
        </button>
      )}
    </div>
  );
};
