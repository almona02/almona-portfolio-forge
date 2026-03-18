import type { CutSheetItem, LabelData } from '@/store/workflowStore';

/**
 * LabelGenerator - Creates per-piece label data with QR code payloads.
 * Each label carries enough information for shop-floor traceability.
 *
 * @since Phase 1: Core Pipeline Wiring
 */
export class LabelGenerator {
  static generate(cutSheets: CutSheetItem[], projectCode: string): LabelData[] {
    return cutSheets.map((cs) => {
      const positionCode = `${projectCode}-${cs.profileRole.substring(0, 3).toUpperCase()}-${cs.id.replace('CS-', '')}`;

      const qrPayload = JSON.stringify({
        pos: positionCode,
        role: cs.profileRole,
        len: cs.length,
        ang: cs.angle,
        bar: cs.stockBarId,
        prj: projectCode,
      });

      return {
        id: `LBL-${cs.id.replace('CS-', '')}`,
        positionCode,
        profileRole: cs.profileRole,
        length: cs.length,
        angle: cs.angle,
        stockBarId: cs.stockBarId,
        projectCode,
        qrPayload,
      };
    });
  }
}
