/**
 * PR2 — Stock movement history query helpers (pagination, filters, export).
 */

import { supabase } from '@/lib/supabase';

export interface StockMovementHistoryFilters {
  userId: string;
  profileId?: string | null;
  invoiceQuery?: string | null;
  projectId?: string | null;
  fromDate?: string | null; // ISO date
  toDate?: string | null;
  page?: number;
  pageSize?: number;
}

export interface StockMovementHistoryRow {
  id: string;
  profileId: string;
  profileName: string;
  movementType: string;
  quantity: number;
  unit: string;
  canonicalMetres: number | null;
  stockBefore: number | null;
  stockAfter: number | null;
  projectId?: string;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: Date;
  createdBy?: string;
}

export type StockMovementHistoryResult =
  | {
      ok: true;
      rows: StockMovementHistoryRow[];
      page: number;
      pageSize: number;
      hasMore: boolean;
      totalLoaded: number;
    }
  | { ok: false; error: string; rows: []; page: number; pageSize: number; hasMore: false; totalLoaded: 0 };

export async function fetchStockMovementHistory(
  filters: StockMovementHistoryFilters,
): Promise<StockMovementHistoryResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  if (!filters.userId) {
    return {
      ok: false,
      error: 'Authenticated user is required to load movement history.',
      rows: [],
      page,
      pageSize,
      hasMore: false,
      totalLoaded: 0,
    };
  }

  const db = supabase as any;
  const from = (page - 1) * pageSize;
  const to = from + pageSize; // fetch one extra to detect hasMore

  let query = db
    .from('stock_movements')
    .select(
      `
      id, profile_id, movement_type, quantity, unit, canonical_metres,
      stock_before, stock_after, project_id, reference_number, notes,
      created_at, created_by, fabricator_profiles (id, name)
    `,
    )
    .eq('user_id', filters.userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.profileId) query = query.eq('profile_id', filters.profileId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);
  if (filters.invoiceQuery?.trim()) {
    const q = filters.invoiceQuery.trim();
    query = query.or(`reference_number.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      error: error.message || 'Failed to load stock movement history.',
      rows: [],
      page,
      pageSize,
      hasMore: false,
      totalLoaded: 0,
    };
  }

  const raw = (data || []) as Record<string, unknown>[];
  const hasMore = raw.length > pageSize;
  const slice = hasMore ? raw.slice(0, pageSize) : raw;

  const rows: StockMovementHistoryRow[] = slice.map((movement) => {
    const profile = movement.fabricator_profiles as { id?: string; name?: string } | null;
    return {
      id: String(movement.id),
      profileId: String(movement.profile_id),
      profileName: profile?.name || 'Unknown',
      movementType: String(movement.movement_type),
      quantity: Number(movement.quantity),
      unit: String(movement.unit || 'meters'),
      canonicalMetres:
        movement.canonical_metres == null ? null : Number(movement.canonical_metres),
      stockBefore: movement.stock_before == null ? null : Number(movement.stock_before),
      stockAfter: movement.stock_after == null ? null : Number(movement.stock_after),
      projectId: movement.project_id ? String(movement.project_id) : undefined,
      referenceNumber: (movement.reference_number as string) || null,
      notes: (movement.notes as string) || null,
      createdAt: new Date(String(movement.created_at)),
      createdBy: movement.created_by ? String(movement.created_by) : undefined,
    };
  });

  return {
    ok: true,
    rows,
    page,
    pageSize,
    hasMore,
    totalLoaded: rows.length,
  };
}

export function exportStockMovementsCsv(rows: StockMovementHistoryRow[]): string {
  const header = [
    'created_at',
    'profile_name',
    'profile_id',
    'movement_type',
    'quantity',
    'unit',
    'canonical_metres',
    'stock_before',
    'stock_after',
    'reference_number',
    'project_id',
    'notes',
  ];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.createdAt.toISOString(),
        row.profileName,
        row.profileId,
        row.movementType,
        row.quantity,
        row.unit,
        row.canonicalMetres,
        row.stockBefore,
        row.stockAfter,
        row.referenceNumber,
        row.projectId,
        row.notes,
      ]
        .map(escape)
        .join(','),
    );
  }
  return lines.join('\n');
}
