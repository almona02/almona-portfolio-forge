/**
 * UP-14 — Single manufacturing save/revision chrome helper.
 * Presentation only. Never invents a server save acknowledgement from identity alone (FUA-19).
 */

import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { WorkflowIdentity } from '@/store/workflowStore';
import type { WindowUnit } from '@/types/fabricator';

export type ManufacturingSaveTone = 'dirty' | 'local' | 'acknowledged' | 'error' | 'unknown';

export interface ManufacturingSaveChrome {
  draftDirty: boolean;
  label: string;
  revisionLabel: string;
  savedAtLabel: string;
  tone: ManufacturingSaveTone;
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
  /** True only after a verified server persist ack for this revision. */
  serverAcknowledged?: boolean;
  persistError?: string | null;
  hydrating?: boolean;
}): ManufacturingSaveChrome {
  const {
    draftDirty,
    workflowIdentity,
    project,
    serverAcknowledged = false,
    persistError = null,
    hydrating = false,
  } = input;

  const revision =
    workflowIdentity && Number.isInteger(workflowIdentity.revision) && workflowIdentity.revision > 0
      ? `R${workflowIdentity.revision}`
      : Number.isInteger(project?.revision) && (project?.revision ?? 0) > 0
        ? `R${project!.revision}`
        : NOT_RECORDED;

  if (hydrating) {
    return {
      draftDirty: false,
      label: 'Loading position…',
      revisionLabel: revision,
      savedAtLabel: NOT_RECORDED,
      tone: 'unknown',
    };
  }

  if (persistError) {
    return {
      draftDirty: draftDirty,
      label: `Save error · ${persistError}`,
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'error',
    };
  }

  if (draftDirty) {
    return {
      draftDirty: true,
      label: 'Unsaved draft',
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'dirty',
    };
  }

  if (serverAcknowledged && workflowIdentity) {
    return {
      draftDirty: false,
      label: `Acknowledged · ${revision}`,
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'acknowledged',
    };
  }

  if (workflowIdentity) {
    return {
      draftDirty: false,
      label: `Revision loaded · ${revision}`,
      revisionLabel: revision,
      savedAtLabel: formatWhen(project?.updatedAt),
      tone: 'local',
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
