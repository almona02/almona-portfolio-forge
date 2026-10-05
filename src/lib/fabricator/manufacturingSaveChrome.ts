/**
 * UP-14 — Single manufacturing save/revision chrome helper.
 * Presentation only: draft dirty + workflow identity revision. Never invents save ack.
 */

import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { WindowUnit } from '@/types/fabricator';

export interface ManufacturingSaveChrome {
  draftDirty: boolean;
  label: string;
  revisionLabel: string;
  savedAtLabel: string;
  tone: 'dirty' | 'saved' | 'unknown';
}

function formatWhen(value: Date | string | undefined): string {
  if (!value) return NOT_RECORDED;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return NOT_RECORDED;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function getManufacturingSaveChrome(input: {
  draftDirty: boolean;
  workflowIdentity?: WorkflowIdentity | null;
  project?: WindowUnit | null;
}): ManufacturingSaveChrome {
  const { draftDirty, workflowIdentity, project } = input;
  const revision =
    workflowIdentity && Number.isInteger(workflowIdentity.revision) && workflowIdentity.revision > 0
      ? `R${workflowIdentity.revision}`
      : Number.isInteger(project?.revision) && (project?.revision ?? 0) > 0
        ? `R${project!.revision}`
        : NOT_RECORDED;

  if (draftDirty) {
    return {
      draftDirty: true,
      label: 'Unsaved draft',
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'dirty',
    };
  }

  if (workflowIdentity) {
    return {
      draftDirty: false,
      label: `Saved · ${revision}`,
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'saved',
    };
  }

  return {
    draftDirty: false,
    label: NOT_RECORDED,
    revisionLabel: revision,
    savedAtLabel: formatWhen(project?.updatedAt),
    tone: 'unknown',
  };
}
