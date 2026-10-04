/**
 * FP-028 / Phase 5 / P5.5 — canvas-primary layout policy.
 */
import { describe, expect, it } from 'vitest';
import { getEngineeringBayLayoutPolicy } from '../engineeringBayLayout';

describe('FP-028 / P5.5 — Engineering Bay layout policy', () => {
  it('declares editable canvas as the primary desktop region', () => {
    const policy = getEngineeringBayLayoutPolicy();
    expect(policy.primaryRegion).toBe('canvas');
    expect(policy.canvasLandmarkLabel.length).toBeGreaterThan(0);
  });

  it('exposes collapsible rail shortcuts for keyboard a11y', () => {
    const policy = getEngineeringBayLayoutPolicy();
    expect(policy.collapseLeftShortcut).toBe('Ctrl+[');
    expect(policy.collapseRightShortcut).toBe('Ctrl+]');
    expect(policy.sectionId).toBe('fabrication');
  });
});
