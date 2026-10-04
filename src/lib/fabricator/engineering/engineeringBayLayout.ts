/**
 * FP-028 / Phase 5 / P5.5 — Engineering Bay layout policy.
 *
 * Editable canvas is the primary desktop region; secondary rails are collapsible.
 */

export type EngineeringBayPrimaryRegion = 'canvas';

export interface EngineeringBayLayoutPolicy {
  readonly primaryRegion: EngineeringBayPrimaryRegion;
  readonly sectionId: 'fabrication';
  readonly leftPanelTitle: string;
  readonly rightPanelTitle: string;
  readonly collapseLeftShortcut: 'Ctrl+[';
  readonly collapseRightShortcut: 'Ctrl+]';
  readonly canvasLandmarkLabel: string;
}

export function getEngineeringBayLayoutPolicy(): EngineeringBayLayoutPolicy {
  return {
    primaryRegion: 'canvas',
    sectionId: 'fabrication',
    leftPanelTitle: 'Design controls',
    rightPanelTitle: '3D preview & physics',
    collapseLeftShortcut: 'Ctrl+[',
    collapseRightShortcut: 'Ctrl+]',
    canvasLandmarkLabel: 'Editable design canvas',
  };
}
