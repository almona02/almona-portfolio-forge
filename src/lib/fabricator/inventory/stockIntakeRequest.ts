/**
 * Persist pending stock-intake request identity across reload (user-scoped).
 * Does not store credentials. Does not auto-replay unconfirmed drafts.
 */

const STORAGE_PREFIX = 'almona.stockIntake.pending.v1:';

export interface PendingStockIntake {
  requestId: string;
  payloadHash: string;
  /** Opaque client draft fingerprint (e.g. mode + profile ids); not auto-submitted. */
  draftKey: string;
  createdAt: string;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readPendingStockIntake(userId: string): PendingStockIntake | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingStockIntake;
    if (!parsed?.requestId || !parsed?.payloadHash || !parsed?.draftKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingStockIntake(userId: string, pending: PendingStockIntake): void {
  if (!userId || typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(pending));
}

export function clearPendingStockIntake(userId: string): void {
  if (!userId || typeof localStorage === 'undefined') return;
  localStorage.removeItem(storageKey(userId));
}

/**
 * Reuse a pending request UUID only when the draft fingerprint and payload hash match.
 * Changing the draft yields a new UUID (changed-payload retries must not reuse identity blindly).
 */
export function resolveIntakeRequestId(options: {
  userId: string;
  draftKey: string;
  payloadHash: string;
}): string {
  const existing = readPendingStockIntake(options.userId);
  if (
    existing &&
    existing.draftKey === options.draftKey &&
    existing.payloadHash === options.payloadHash
  ) {
    return existing.requestId;
  }
  const requestId = crypto.randomUUID();
  writePendingStockIntake(options.userId, {
    requestId,
    payloadHash: options.payloadHash,
    draftKey: options.draftKey,
    createdAt: new Date().toISOString(),
  });
  return requestId;
}
