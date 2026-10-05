import { describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { PDFExportService } from './PDFExportService';
import type { Profile, WindowUnit } from '@/types/fabricator';

describe('solver to cut-list PDF', () => {
  it('exports every physical occurrence across pages and rejects tampering', async () => {
    vi.stubGlobal('Blob', NodeBlob);
    try {
      const profile = { id: 'diagnostic-profile', name: 'Diagnostic frame', costPerMeter: 12, cuttingAllowance: 0, specifications: { stockLengthMm: 6000 } } as Profile;
      const project = { id: 'diagnostic-position', orderNumber: 'TEST ONLY - NOT FOR PRODUCTION', posNumber: 'PDF-001', type: 'fixed', color: 'Silver', status: 'design', overallWidth: 1200, overallHeight: 1400,
        components: [{ id: 'frame', profile, quantity: 1, cuttingLengths: Array(75).fill(50), angles: Array(75).fill(90) }] } as WindowUnit;
      const result = await new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 100, medium: 500 } }).solve({ components: project.components, profiles: [profile], defaultStockLength: 6000 }, [profile]);
      const branding = { companyName: 'ALMONA - DIAGNOSTIC TEST ONLY' };
      const service = new PDFExportService(branding);
      vi.spyOn(service as any, 'resolveProfileThumbnail').mockResolvedValue(null);
      const blob = await service.generateCuttingListPDF(project, result, { branding, includePatternVisualization: false });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
      mkdirSync('output/pdf', { recursive: true });
      writeFileSync('output/pdf/optimization-cutlist-diagnostic.pdf', bytes);
      const changed = structuredClone(result);
      changed.cuttingPlan[0].cuts[0].length += 1;
      await expect(service.generateCuttingListPDF(project, changed, { branding })).rejects.toThrow('invalid cut list');
    } finally { vi.unstubAllGlobals(); }
  });
});
