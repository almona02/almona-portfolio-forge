import { supabase } from '@/lib/supabase';
import type {
  ApprovedProfileReference,
  ApprovedRuleReference,
  ApprovedSystemPackReference,
} from './ManufacturingDesignContract';
import { z } from 'zod';

const approvedReferenceSchema = z.object({
  evidenceStatus: z.literal('approved'),
  approvalId: z.string().uuid(),
});
const systemPackSchema = approvedReferenceSchema.extend({
  id: z.string().min(1),
  revision: z.number().int().positive(),
});
const profileSchema = approvedReferenceSchema.extend({
  role: z.string().min(1),
  profileId: z.string().min(1),
  stockLengthMm: z.number().positive().finite(),
});
const ruleSchema = approvedReferenceSchema.extend({
  ruleId: z.string().min(1),
  revision: z.number().int().positive(),
  deductions: z.unknown().optional(),
  allowances: z.unknown().optional(),
  applicability: z.unknown().optional(),
});
const manufacturingSettingsSchema = z.object({
  sawKerfMm: z.number().finite().nonnegative(),
  trimCutMm: z.number().finite().nonnegative(),
});
const authorityPayloadSchema = z.object({
  schema: z.literal('almona.manufacturing-authority'),
  schemaVersion: z.literal(1),
  system: z.object({ id: z.string().min(1) }).passthrough(),
  systemPack: systemPackSchema,
  profiles: z.array(profileSchema).min(2),
  cuttingRules: z.array(ruleSchema).min(1),
  toleranceRule: ruleSchema,
  manufacturingSettings: manufacturingSettingsSchema,
}).strict();

export interface ManufacturingAuthorityRpcRow {
  readonly project_id: string;
  readonly position_id: string;
  readonly position_source: 'v1' | 'v2';
  readonly position_revision: number;
  readonly authority_approval_id: string;
  readonly system_pack_id: string;
  readonly system_pack_revision: number;
  readonly authority_payload: Record<string, unknown>;
}

export interface AuthorityManufacturingSettings {
  readonly sawKerfMm: number;
  readonly trimCutMm: number;
}

export interface ResolvedManufacturingAuthority {
  readonly projectId: string;
  readonly positionId: string;
  readonly positionSource: 'v1' | 'v2';
  readonly positionRevision: number;
  readonly authorityApprovalId: string;
  readonly system: Readonly<Record<string, unknown> & { id: string }>;
  readonly systemPack: Readonly<ApprovedSystemPackReference>;
  readonly profiles: readonly Readonly<ApprovedProfileReference>[];
  readonly cuttingRules: readonly Readonly<ApprovedRuleReference>[];
  readonly toleranceRule: Readonly<ApprovedRuleReference>;
  readonly manufacturingSettings: Readonly<AuthorityManufacturingSettings>;
}

export class ManufacturingAuthorityResolutionError extends Error {
  readonly blocking = true;

  constructor(
    readonly code: 'RPC_FAILED' | 'NOT_FOUND' | 'INVALID_AUTHORITY' | 'IDENTITY_MISMATCH',
    message: string
  ) {
    super(message);
    this.name = 'ManufacturingAuthorityResolutionError';
  }
}

export function parseManufacturingAuthorityRpcRow(
  row: ManufacturingAuthorityRpcRow,
  expected: { readonly positionId: string; readonly revision: number }
): ResolvedManufacturingAuthority {
  if (row.position_id !== expected.positionId || row.position_revision !== expected.revision) {
    throw new ManufacturingAuthorityResolutionError(
      'IDENTITY_MISMATCH',
      'Manufacturing authority response does not match the requested position revision.'
    );
  }
  const parsed = authorityPayloadSchema.safeParse(row.authority_payload);
  if (!parsed.success) {
    throw new ManufacturingAuthorityResolutionError('INVALID_AUTHORITY', 'Manufacturing authority payload is invalid.');
  }
  if (
    parsed.data.system.id !== row.system_pack_id ||
    parsed.data.systemPack.id !== row.system_pack_id ||
    parsed.data.systemPack.revision !== row.system_pack_revision ||
    parsed.data.systemPack.approvalId !== row.authority_approval_id
  ) {
    throw new ManufacturingAuthorityResolutionError(
      'IDENTITY_MISMATCH',
      'Manufacturing authority approval, system, or revision is inconsistent.'
    );
  }

  return Object.freeze({
    projectId: row.project_id,
    positionId: row.position_id,
    positionSource: row.position_source,
    positionRevision: row.position_revision,
    authorityApprovalId: row.authority_approval_id,
    system: Object.freeze(parsed.data.system),
    systemPack: Object.freeze(parsed.data.systemPack),
    profiles: Object.freeze(parsed.data.profiles.map((profile) => Object.freeze(profile))),
    cuttingRules: Object.freeze(parsed.data.cuttingRules.map((rule) => Object.freeze(rule))),
    toleranceRule: Object.freeze(parsed.data.toleranceRule),
    manufacturingSettings: Object.freeze(parsed.data.manufacturingSettings),
  });
}

export async function resolveManufacturingAuthority(
  positionId: string,
  expectedRevision: number
): Promise<ResolvedManufacturingAuthority> {
  const { data, error } = await supabase.rpc('get_fabricator_manufacturing_authority', {
    p_position_id: positionId,
    p_expected_revision: expectedRevision,
  });
  if (error) {
    throw new ManufacturingAuthorityResolutionError('RPC_FAILED', error.message);
  }
  if (!data || data.length !== 1) {
    throw new ManufacturingAuthorityResolutionError(
      'NOT_FOUND',
      'One active approved manufacturing authority is required.'
    );
  }
  return parseManufacturingAuthorityRpcRow(data[0], { positionId, revision: expectedRevision });
}
