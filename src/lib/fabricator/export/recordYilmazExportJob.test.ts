import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExportResult } from '@/services/export/YilmazExportPipeline';

const getUser = vi.fn();
const insert = vi.fn();
const select = vi.fn();
const single = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const upload = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
    from: () => ({
      insert: (...args: unknown[]) => insert(...args),
      update: (...args: unknown[]) => update(...args),
    }),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => upload(...args),
      }),
    },
  },
}));

import { recordYilmazExportJob } from './recordYilmazExportJob';

function sampleResult(): ExportResult {
  const file = {
    filename: 'ORD_AIM-3410_20261101.cnc',
    content: 'G21',
    mimeType: 'text/plain',
    size: 3,
    blob: new Blob(['G21']),
  };
  return {
    success: true,
    files: { gcode: file, csv: null, mdb: null, manifest: null },
    checksum: 'DEADBEEF',
    metadata: {
      machineModel: 'AIM-3410',
      generatedAt: '2026-11-01T00:00:00.000Z',
      totalCuts: 4,
      totalProfiles: 1,
      gcodeLinesCount: 12,
      projectId: 'project-1',
      orderNumber: 'ORD-1',
      constitutionalTier: 'Tier 3 Protected Determinism',
    },
    validation: {
      valid: true,
      issues: [],
      machineSpecs: {} as ExportResult['validation']['machineSpecs'],
      summary: {
        totalCuts: 4,
        totalProfiles: 1,
        maxCutLength: 1200,
        minCutLength: 400,
        uniqueAngles: [45, 90],
        estimatedDuration: '1m 0s',
      },
    },
  };
}

describe('recordYilmazExportJob', () => {
  beforeEach(() => {
    getUser.mockReset();
    insert.mockReset();
    select.mockReset();
    single.mockReset();
    update.mockReset();
    eq.mockReset();
    upload.mockReset();

    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    single.mockResolvedValue({ data: { id: 'job-1' }, error: null });
    select.mockReturnValue({ single });
    insert.mockReturnValue({ select });
    eq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    update.mockReturnValue({ eq });
    upload.mockResolvedValue({ error: null });
  });

  it('rejects unauthenticated sessions', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await recordYilmazExportJob({
      projectId: 'project-1',
      orderNumber: 'ORD-1',
      machineModel: 'AIM-3410',
      exportFormat: 'all',
      checksum: 'DEADBEEF',
      result: sampleResult(),
    });
    expect(result.ok).toBe(false);
  });

  it('inserts a job and uploads artifacts for an authenticated user', async () => {
    const result = await recordYilmazExportJob({
      projectId: 'project-1',
      positionId: 'pose-1',
      orderNumber: 'ORD-1',
      machineModel: 'AIM-3410',
      exportFormat: 'gcode',
      checksum: 'DEADBEEF',
      result: sampleResult(),
    });

    expect(result).toEqual({
      ok: true,
      jobId: 'job-1',
      uploadedFiles: ['user-1/job-1/ORD_AIM-3410_20261101.cnc'],
    });
    expect(insert).toHaveBeenCalled();
    expect(upload).toHaveBeenCalled();
  });
});
