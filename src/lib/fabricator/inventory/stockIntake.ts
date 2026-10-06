/**
 * PR1 — Atomic stock intake via record_stock_intake RPC.
 *
 * Canonical metre deltas are computed server-side. Client supplies input unit,
 * quantities, optional bar length, and a durable request identity + payload hash.
 */

import { supabase } from '@/lib/supabase';

export type StockIntakeInputUnit = 'meters' | 'pieces';

export interface StockIntakeLine {
  profileId?: string;
  /** Stable catalogue code (supplierCode). Required when createIfMissing. */
  catalogueKey?: string;
  pack?: string;
  material?: string;
  finish?: string;
  profileName?: string;
  inputUnit: StockIntakeInputUnit;
  /** Metres when inputUnit=meters; bar count when pieces. */
  quantity: number;
  /** Required for pieces; ignored for meters. */
  barLengthM?: number;
  notes?: string | null;
  invoice?: string | null;
  supplier?: string | null;
  createIfMissing?: boolean;
  width?: number;
  height?: number;
  thickness?: number;
  costPerMeter?: number;
  minStockLevel?: number;
  systemBrand?: string;
  specifications?: Record<string, unknown>;
  lotMetadata?: Record<string, unknown>;
}

export interface StockIntakeReceiptBalance {
  profile_id: string;
  stock_quantity: number;
  stock_version: number;
  canonical_metres_added: number;
}

export interface StockIntakeReceipt {
  request_id: string;
  payload_hash: string;
  replay: boolean;
  movement_ids: string[];
  balances: StockIntakeReceiptBalance[];
  movement_count: number;
}

export type StockIntakeResult =
  | { ok: true; receipt: StockIntakeReceipt; movementCount: number }
  | { ok: false; error: string };

export interface StockIntakeRequest {
  requestId: string;
  lines: StockIntakeLine[];
}

function canonicalLinePayload(line: StockIntakeLine): Record<string, unknown> {
  return {
    profile_id: line.profileId ?? null,
    catalogue_key: line.catalogueKey ?? null,
    pack: line.pack ?? '',
    material: line.material ?? null,
    finish: line.finish ?? '',
    profile_name: line.profileName ?? null,
    input_unit: line.inputUnit,
    quantity: line.quantity,
    bar_length_m: line.barLengthM ?? null,
    notes: line.notes ?? null,
    invoice: line.invoice ?? null,
    supplier: line.supplier ?? null,
    create_if_missing: Boolean(line.createIfMissing),
    width: line.width ?? null,
    height: line.height ?? null,
    thickness: line.thickness ?? null,
    cost_per_meter: line.costPerMeter ?? null,
    min_stock_level: line.minStockLevel ?? null,
    system_brand: line.systemBrand ?? null,
    specifications: line.specifications ?? null,
    lot_metadata: line.lotMetadata ?? null,
  };
}

/** Stable JSON for hashing — sorted keys, no whitespace variance. */
export function serializeIntakePayload(lines: StockIntakeLine[]): string {
  const normalized = lines.map((line) => canonicalLinePayload(line));
  return JSON.stringify(normalized);
}

export async function hashIntakePayload(lines: StockIntakeLine[]): Promise<string> {
  const payload = serializeIntakePayload(lines);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node test fallback (vitest): deterministic non-crypto hash is unacceptable in prod browsers;
  // vitest should polyfill subtle. Fail closed if unavailable.
  throw new Error('Web Crypto SHA-256 is required to hash stock intake payloads.');
}

function toRpcLine(line: StockIntakeLine): Record<string, unknown> {
  return canonicalLinePayload(line);
}

function parseReceipt(data: unknown): StockIntakeReceipt | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  if (typeof row.request_id !== 'string' || typeof row.payload_hash !== 'string') return null;
  const balances = Array.isArray(row.balances) ? row.balances : [];
  return {
    request_id: row.request_id,
    payload_hash: row.payload_hash,
    replay: Boolean(row.replay),
    movement_ids: Array.isArray(row.movement_ids)
      ? row.movement_ids.map(String)
      : [],
    balances: balances.map((b) => {
      const bal = (b || {}) as Record<string, unknown>;
      return {
        profile_id: String(bal.profile_id),
        stock_quantity: Number(bal.stock_quantity),
        stock_version: Number(bal.stock_version),
        canonical_metres_added: Number(bal.canonical_metres_added),
      };
    }),
    movement_count: Number(row.movement_count ?? 0),
  };
}

/**
 * Record intake through the owner-scoped atomic RPC.
 * Does not invent profile rows unless createIfMissing is set on a line.
 */
export async function recordStockIntakeThenSync(
  _userId: string,
  movements: Array<{
    profileId: string;
    quantity: number;
    unit: 'meters' | 'pieces';
    notes?: string | null;
    requestId?: string;
    barLengthM?: number;
    invoice?: string | null;
    supplier?: string | null;
  }>,
  options?: { requestId?: string },
): Promise<StockIntakeResult> {
  const lines: StockIntakeLine[] = movements
    .filter((m) => m.profileId && Number.isFinite(m.quantity) && m.quantity > 0)
    .map((m) => ({
      profileId: m.profileId,
      inputUnit: m.unit,
      quantity: m.quantity,
      barLengthM: m.barLengthM,
      notes: m.notes,
      invoice: m.invoice,
      supplier: m.supplier,
    }));

  if (!lines.length) {
    return { ok: false, error: 'No valid intake rows to record.' };
  }

  // Prefer explicit request UUID; fall back to first legacy per-row token only if UUID-shaped.
  const legacy = movements.find((m) => m.requestId)?.requestId;
  const requestId =
    options?.requestId ||
    (legacy && /^[0-9a-fA-F-]{36}$/.test(legacy) ? legacy : undefined) ||
    crypto.randomUUID();

  return recordAtomicStockIntake({ requestId, lines });
}

export async function recordAtomicStockIntake(
  request: StockIntakeRequest,
): Promise<StockIntakeResult> {
  if (!request.requestId) {
    return { ok: false, error: 'Authenticated intake requires a request UUID.' };
  }
  if (!request.lines?.length) {
    return { ok: false, error: 'No valid intake rows to record.' };
  }

  for (const line of request.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { ok: false, error: 'Each intake line needs a finite positive quantity.' };
    }
    if (line.inputUnit === 'pieces' && !(Number.isFinite(line.barLengthM) && (line.barLengthM as number) > 0)) {
      return { ok: false, error: 'Pieces intake requires a positive bar length in metres.' };
    }
    if (line.inputUnit !== 'meters' && line.inputUnit !== 'pieces') {
      return { ok: false, error: `Unsupported intake unit: ${String((line as { inputUnit?: string }).inputUnit)}` };
    }
    if (!line.profileId && !line.createIfMissing) {
      return { ok: false, error: 'Each line needs a profile id or createIfMissing.' };
    }
  }

  let payloadHash: string;
  try {
    payloadHash = await hashIntakePayload(request.lines);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to hash intake payload.' };
  }

  const db = supabase as any;
  const { data, error } = await db.rpc('record_stock_intake', {
    p_request_id: request.requestId,
    p_payload_hash: payloadHash,
    p_lines: request.lines.map(toRpcLine),
  });

  if (error) {
    return { ok: false, error: error.message || 'Stock intake failed.' };
  }

  const receipt = parseReceipt(data);
  if (!receipt) {
    return { ok: false, error: 'Stock intake returned an invalid receipt.' };
  }

  return {
    ok: true,
    receipt,
    movementCount: receipt.movement_count || receipt.movement_ids.length || request.lines.length,
  };
}

/** React Query keys that must refresh after intake. */
export const OWNED_INVENTORY_QUERY_KEYS = [
  'studio-owned-inventory',
  'fabricator-reports-inventory',
] as const;
