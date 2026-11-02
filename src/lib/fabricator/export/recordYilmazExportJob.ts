/**
 * Persist Yilmaz export job metadata (+ optional storage artifacts) via Supabase.
 * Best-effort: download still succeeds if persistence fails (auth/offline).
 *
 * Local table contract for 20261101170000_yilmaz_export_jobs.sql until schema types regenerate.
 */

import { supabase } from '@/lib/supabase';
import type { ExportResult } from '@/services/export/YilmazExportPipeline';
import type { ExportFile } from '@/services/export/YilmazFileFormats';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'yilmaz-export-artifacts';

type YilmazExportJobRow = {
  id: string;
  owner_user_id: string;
  project_id: string;
  position_id: string | null;
  order_number: string;
  machine_model: string;
  export_format: string;
  checksum: string;
  status: 'completed' | 'failed';
  file_manifest: unknown;
  storage_paths: string[];
  validation_summary: unknown;
  metadata: unknown;
  created_at: string;
};

type YilmazExportJobInsert = {
  owner_user_id: string;
  project_id: string;
  position_id?: string | null;
  order_number: string;
  machine_model: string;
  export_format: string;
  checksum: string;
  status: 'completed' | 'failed';
  file_manifest: unknown;
  validation_summary: unknown;
  metadata: unknown;
};

type YilmazExportDatabase = {
  public: {
    Tables: {
      yilmaz_export_jobs: {
        Row: YilmazExportJobRow;
        Insert: YilmazExportJobInsert;
        Update: Partial<YilmazExportJobRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

const db = supabase as unknown as SupabaseClient<YilmazExportDatabase>;

export interface RecordYilmazExportJobInput {
  projectId: string;
  positionId?: string | null;
  orderNumber: string;
  machineModel: string;
  exportFormat: string;
  checksum: string;
  result: ExportResult;
}

export type RecordYilmazExportJobResult =
  | { ok: true; jobId: string; uploadedFiles: string[] }
  | { ok: false; error: string };

function collectFiles(result: ExportResult): ExportFile[] {
  const { gcode, csv, mdb, manifest } = result.files;
  return [gcode, csv, mdb, manifest].filter((f): f is ExportFile => f !== null);
}

/**
 * Inserts a yilmaz_export_jobs row and uploads downloadable blobs to storage
 * under `{userId}/{jobId}/filename`. Requires an authenticated session.
 */
export async function recordYilmazExportJob(
  input: RecordYilmazExportJobInput
): Promise<RecordYilmazExportJobResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: authError?.message ?? 'Authentication required to persist export jobs.' };
  }

  const files = collectFiles(input.result);
  const fileManifest = files.map((f) => ({
    filename: f.filename,
    mimeType: f.mimeType,
    size: f.size,
  }));

  const { data: job, error: insertError } = await db
    .from('yilmaz_export_jobs')
    .insert({
      owner_user_id: user.id,
      project_id: input.projectId,
      position_id: input.positionId ?? null,
      order_number: input.orderNumber,
      machine_model: input.machineModel,
      export_format: input.exportFormat,
      checksum: input.checksum,
      status: input.result.success ? 'completed' : 'failed',
      file_manifest: fileManifest,
      validation_summary: {
        valid: input.result.validation.valid,
        issueCount: input.result.validation.issues.length,
        totalCuts: input.result.metadata.totalCuts,
        gcodeLinesCount: input.result.metadata.gcodeLinesCount,
      },
      metadata: {
        constitutionalTier: input.result.metadata.constitutionalTier,
        generatedAt: input.result.metadata.generatedAt,
      },
    })
    .select('id')
    .single();

  if (insertError || !job?.id) {
    return { ok: false, error: insertError?.message ?? 'Failed to insert export job.' };
  }

  const uploadedFiles: string[] = [];
  for (const file of files) {
    const path = `${user.id}/${job.id}/${file.filename}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.blob, {
        upsert: false,
        contentType: file.mimeType,
      });

    if (!uploadError) {
      uploadedFiles.push(path);
    }
  }

  if (uploadedFiles.length > 0) {
    await db
      .from('yilmaz_export_jobs')
      .update({ storage_paths: uploadedFiles })
      .eq('id', job.id)
      .eq('owner_user_id', user.id);
  }

  return { ok: true, jobId: job.id, uploadedFiles };
}
