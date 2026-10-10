/**
 * Stable assembly-object occurrence identity (Engine contract).
 * Drawing primitive indexes adapt to these IDs — indexes are not manufacturing identity.
 * AICS-001: deterministic string composition only.
 */

export type AssemblyOccurrenceKind =
  | 'pose'
  | 'frame'
  | 'sash'
  | 'mullion'
  | 'transom'
  | 'bead'
  | 'glass'
  | 'hardware'
  | 'cell';

export type AssemblyOccurrence = {
  id: string;
  kind: AssemblyOccurrenceKind;
  positionId: string;
  revision: number | null;
  cellId?: string;
  memberIndex?: number;
  componentId?: string;
};

export function buildOccurrenceId(parts: {
  positionId: string;
  revision?: number | null;
  kind: AssemblyOccurrenceKind;
  cellId?: string | null;
  memberIndex?: number | null;
  componentId?: string | null;
}): string {
  const rev =
    parts.revision === null || parts.revision === undefined ? 'r?' : `r${parts.revision}`;
  const segments = [
    String(parts.positionId || 'pose'),
    rev,
    parts.kind,
    parts.cellId ? `cell:${parts.cellId}` : null,
    Number.isFinite(parts.memberIndex as number) ? `m:${parts.memberIndex}` : null,
    parts.componentId ? `c:${parts.componentId}` : null,
  ].filter(Boolean);
  return segments.join('/');
}

export function makeOccurrence(input: {
  positionId: string;
  revision?: number | null;
  kind: AssemblyOccurrenceKind;
  cellId?: string | null;
  memberIndex?: number | null;
  componentId?: string | null;
}): AssemblyOccurrence {
  return {
    id: buildOccurrenceId(input),
    kind: input.kind,
    positionId: input.positionId,
    revision: input.revision ?? null,
    cellId: input.cellId ?? undefined,
    memberIndex: input.memberIndex ?? undefined,
    componentId: input.componentId ?? undefined,
  };
}

/**
 * Adapter: drafting flattened primitive index → occurrence (UI adapts; Engine owns IDs).
 */
export function occurrenceFromPrimitiveIndex(input: {
  positionId: string;
  revision?: number | null;
  kind: AssemblyOccurrenceKind;
  primitiveIndex: number;
  cellId?: string | null;
}): AssemblyOccurrence {
  return makeOccurrence({
    positionId: input.positionId,
    revision: input.revision,
    kind: input.kind,
    cellId: input.cellId,
    memberIndex: input.primitiveIndex,
  });
}
