/**
 * Advisory Snapshot Logging
 * AICS-001 §7.4: Audit Trail Doctrine
 * 
 * Records advisory decisions for audit without granting authority.
 * All snapshots are immutable once captured.
 */

export interface AdvisorySnapshot {
  id: string;
  timestamp: string;
  component: string;
  tier: 'tier1' | 'tier2' | 'presentation';
  inputHash: string;
  outputHash: string;
  confidence?: number;
  reasoning?: string;
  advisoryBoundary: string;
  metadata: Record<string, unknown>;
}

const STORAGE_KEY = 'almona_advisory_snapshots';
const MAX_SNAPSHOTS = 1000;

/**
 * Generate a simple hash for inputs (deterministic)
 */
function hashInput(input: unknown): string {
  const str = JSON.stringify(input, (_, value) => {
    if (typeof value === 'function') return '[function]';
    if (value instanceof Date) return value.toISOString();
    return value;
  });
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `h${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Generate unique snapshot ID
 */
function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load snapshots from storage
 */
function loadSnapshots(): AdvisorySnapshot[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save snapshots to storage
 */
function saveSnapshots(snapshots: AdvisorySnapshot[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (error) {
    console.warn('[AdvisorySnapshot] Failed to save:', error);
  }
}

/**
 * Capture an advisory snapshot (non-invasive, no authority)
 */
export function captureSnapshot(
  data: Omit<AdvisorySnapshot, 'id' | 'timestamp'>
): AdvisorySnapshot {
  const snapshot: AdvisorySnapshot = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...data
  };

  const snapshots = loadSnapshots();
  snapshots.push(snapshot);
  
  // Keep only recent snapshots
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }
  
  saveSnapshots(snapshots);
  
  // Emit event for external consumers (e.g., governance dashboard)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('advisory-snapshot', { detail: snapshot }));
  }
  
  return snapshot;
}

/**
 * Get snapshots for audit or debugging
 */
export function getSnapshots(filter?: Partial<AdvisorySnapshot>): AdvisorySnapshot[] {
  const snapshots = loadSnapshots();
  
  if (!filter) return snapshots;
  
  return snapshots.filter(snapshot => {
    return Object.entries(filter).every(([key, value]) => {
      return snapshot[key as keyof AdvisorySnapshot] === value;
    });
  });
}

/**
 * Get snapshots by tier
 */
export function getSnapshotsByTier(tier: AdvisorySnapshot['tier']): AdvisorySnapshot[] {
  return getSnapshots({ tier });
}

/**
 * Get recent snapshots (last N)
 */
export function getRecentSnapshots(count: number = 10): AdvisorySnapshot[] {
  return loadSnapshots().slice(-count);
}

/**
 * Clear all snapshots (for testing only)
 */
export function clearSnapshots(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Create a snapshot capture function for a specific component
 */
export function createSnapshotCapture(
  component: string,
  tier: AdvisorySnapshot['tier'],
  advisoryBoundary: string
) {
  return function capture(props: unknown, confidence?: number): AdvisorySnapshot {
    return captureSnapshot({
      component,
      tier,
      inputHash: hashInput(props),
      outputHash: 'pending',
      confidence,
      advisoryBoundary,
      metadata: {
        propKeys: props && typeof props === 'object' ? Object.keys(props) : []
      }
    });
  };
}

export { hashInput };
