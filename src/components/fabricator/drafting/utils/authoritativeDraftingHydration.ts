import type { WorkflowIdentity } from '@/store/workflowStore';
import type { GridCell, WindowGrid, WindowUnit } from '@/types/fabricator';
import type { DraftingState, EgyptianTemplate, Geometry2D, Rectangle } from '../types/drafting';
import { DEFAULT_LAYERS } from '../types/layers';
import { EXPANDED_EGYPTIAN_TEMPLATES } from './egyptianTemplates';

const EMPTY_GEOMETRY: Geometry2D = {
  rectangles: [],
  points: [],
  lines: [],
  circles: [],
  arcs: [],
  polygons: [],
  splines: [],
};

function normalizedWeights(values: number[] | undefined, count: number): number[] {
  if (
    values?.length === count &&
    values.every((value) => Number.isFinite(value) && value > 0)
  ) {
    return values;
  }
  return Array.from({ length: count }, () => 1);
}

function offsets(weights: number[], total: number): number[] {
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const result = [0];
  for (const weight of weights) {
    result.push(result[result.length - 1] + (weight / weightTotal) * total);
  }
  return result;
}

function draftingType(cell: GridCell): Rectangle['type'] {
  return cell.type === 'empty' ? 'fixed' : cell.type;
}

function matchingTemplate(grid: WindowGrid): EgyptianTemplate | null {
  return EXPANDED_EGYPTIAN_TEMPLATES.find((template) => {
    if (template.rows !== grid.rows || template.cols !== grid.cols) return false;
    return grid.cells.every((cell) =>
      template.cellTypes[cell.row]?.[cell.col] === cell.type
    );
  }) ?? null;
}

export function draftingIdentityKey(identity: WorkflowIdentity): string {
  return [
    identity.ownerUserId,
    identity.projectId,
    identity.positionId,
    identity.source,
    String(identity.revision),
  ].map(encodeURIComponent).join(':');
}

export function authoritativeGridToDraftingState(project: WindowUnit): DraftingState {
  const grid = project.grid;
  if (
    !grid ||
    !Number.isInteger(grid.rows) ||
    !Number.isInteger(grid.cols) ||
    grid.rows < 1 ||
    grid.cols < 1 ||
    !Number.isFinite(project.overallWidth) ||
    !Number.isFinite(project.overallHeight) ||
    project.overallWidth <= 0 ||
    project.overallHeight <= 0
  ) {
    return createDraftingState(EMPTY_GEOMETRY, null, {});
  }

  const columnOffsets = offsets(
    normalizedWeights(grid.colWidths, grid.cols),
    project.overallWidth,
  );
  const rowOffsets = offsets(
    normalizedWeights(grid.rowHeights, grid.rows),
    project.overallHeight,
  );

  const rectangles = grid.cells
    .filter((cell) =>
      Number.isInteger(cell.row) &&
      Number.isInteger(cell.col) &&
      cell.row >= 0 &&
      cell.col >= 0 &&
      cell.row < grid.rows &&
      cell.col < grid.cols
    )
    .map<Rectangle>((cell) => {
      const rowSpan = Math.min(Math.max(cell.rowSpan ?? 1, 1), grid.rows - cell.row);
      const colSpan = Math.min(Math.max(cell.colSpan ?? 1, 1), grid.cols - cell.col);
      return {
        id: cell.id,
        x: columnOffsets[cell.col],
        y: rowOffsets[cell.row],
        width: columnOffsets[cell.col + colSpan] - columnOffsets[cell.col],
        height: rowOffsets[cell.row + rowSpan] - rowOffsets[cell.row],
        type: draftingType(cell),
        layerId: 'frame',
        sourceCellId: cell.id,
        sourceCellType: cell.type,
        sourceRow: cell.row,
        sourceCol: cell.col,
        sourceRowSpan: rowSpan,
        sourceColSpan: colSpan,
      };
    });

  return createDraftingState(
    { ...EMPTY_GEOMETRY, rectangles },
    matchingTemplate(grid),
    { [project.id]: grid },
  );
}

function createDraftingState(
  geometry: Geometry2D,
  activeTemplate: EgyptianTemplate | null,
  materialWindowGrids: Record<string, WindowGrid>,
): DraftingState {
  return {
    geometry,
    dimensions: [],
    annotations: [],
    selectedElement: null,
    selectedElements: [],
    activeTemplate,
    previewPoint: null,
    hardware: [],
    structuralElements: [],
    materialAwareWindows: [],
    materialWindowGrids,
    materialWindowGlazing: {},
    layers: [...DEFAULT_LAYERS],
    activeLayerId: 'frame',
    blockDefinitions: [],
    blockInstances: [],
    placingBlockId: null,
  };
}

export function isDraftingState(value: unknown): value is DraftingState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<DraftingState>;
  return Boolean(
    state.geometry &&
    Array.isArray(state.geometry.rectangles) &&
    Array.isArray(state.geometry.lines) &&
    Array.isArray(state.geometry.points),
  );
}

export function hasDraftingGeometry(state: DraftingState): boolean {
  return state.geometry.rectangles.length > 0 ||
    state.geometry.lines.length > 0 ||
    state.geometry.circles.length > 0 ||
    state.geometry.arcs.length > 0 ||
    state.geometry.polygons.length > 0 ||
    state.geometry.splines.length > 0;
}
