import type { WindowUnit } from '@/types/fabricator';
import { Plus } from 'lucide-react';
import React, { useMemo } from 'react';

interface PoseLayoutPreviewProps {
  poses: WindowUnit[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onAdd?: () => void;
  compact?: boolean;
}

/**
 * Scaled elevation thumbnails for poses in a project.
 * AICS-001: aspect ratio is overallWidth/overallHeight as stored, not estimated.
 */
export const PoseLayoutPreview: React.FC<PoseLayoutPreviewProps> = ({
  poses,
  activeId,
  onSelect,
  onAdd,
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
        return (
          <button
            key={pose.id}
            type="button"
            onClick={() => onSelect?.(pose.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
              active
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-900/40 hover:border-amber-600/40'
            }`}
          >
            <div
              className={`rounded-sm border ${active ? 'border-amber-400 bg-amber-400/15' : 'border-cyan-500/50 bg-cyan-500/10'}`}
              style={{ width: widthPx, height: heightPx }}
              aria-hidden
            />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Pose {pose.posNumber || i + 1}
              </div>
              <div className="font-mono text-xs text-amber-200">
                {w > 0 && h > 0 ? `${Math.round(w)} × ${Math.round(h)} mm` : 'Not measured'}
              </div>
            </div>
          </button>
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
