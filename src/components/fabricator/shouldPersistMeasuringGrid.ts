import type { WindowGrid } from '@/types/fabricator';

/**
 * Persist measuring grids that already describe a multi-lite layout.
 * The Multi-pane UI toggle must not drop a 2-sash predicted grid before Design.
 */
export function shouldPersistMeasuringGrid(
  grid: WindowGrid | null | undefined,
  isGridMode: boolean,
): boolean {
  if (isGridMode) return true;
  if (!grid) return false;
  const cells = grid.cells?.length ?? 0;
  const cols = Number(grid.cols) || 0;
  const rows = Number(grid.rows) || 0;
  return cells > 1 || cols > 1 || rows > 1;
}
