/**
 * PR2 — Quoted-field CSV parser + stock intake line validation/preview.
 * Rejects unknown units; does not treat them as bars.
 */

export type CsvIntakeUnit = 'meters' | 'pieces';

export interface CsvIntakePreviewRow {
  rowNumber: number;
  profileCode: string;
  quantity: number | null;
  unitRaw: string;
  inputUnit: CsvIntakeUnit | null;
  barLengthM: number | null;
  invoiceNo: string;
  supplier: string;
  errors: string[];
  /** Set when a unique owned profile was resolved. */
  profileId?: string;
  profileName?: string;
}

export interface CsvIntakeParseResult {
  headers: string[];
  rows: CsvIntakePreviewRow[];
  validRows: CsvIntakePreviewRow[];
  hasErrors: boolean;
}

/** Minimal RFC4180-ish CSV parse (quoted fields, commas inside quotes). */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field.trim());
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field.trim());
      field = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

function normalizeUnit(raw: string): CsvIntakeUnit | null {
  const u = raw.trim().toLowerCase();
  if (u === 'm' || u === 'meter' || u === 'meters') return 'meters';
  if (u === 'bar' || u === 'bars' || u === 'piece' || u === 'pieces' || u === 'pcs') return 'pieces';
  return null;
}

export interface ResolveProfileFn {
  (profileCode: string): { id: string; name: string; defaultBarLengthM?: number } | null | 'ambiguous';
}

export function buildCsvIntakePreview(
  text: string,
  resolveProfile: ResolveProfileFn,
): CsvIntakeParseResult {
  const table = parseCsvText(text);
  if (table.length < 2) {
    return { headers: [], rows: [], validRows: [], hasErrors: true };
  }
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const idxProfileCode = headers.indexOf('profile_code');
  const idxQuantity = headers.indexOf('quantity');
  const idxUnit = headers.indexOf('unit');
  const idxBarLength = headers.indexOf('bar_length_m');
  const idxInvoiceNo = headers.indexOf('invoice_no');
  const idxSupplier = headers.indexOf('supplier');

  const headerErrors: string[] = [];
  if (idxProfileCode === -1) headerErrors.push('Missing profile_code column');
  if (idxQuantity === -1) headerErrors.push('Missing quantity column');
  if (idxUnit === -1) headerErrors.push('Missing unit column');

  if (headerErrors.length) {
    return {
      headers,
      rows: [
        {
          rowNumber: 1,
          profileCode: '',
          quantity: null,
          unitRaw: '',
          inputUnit: null,
          barLengthM: null,
          invoiceNo: '',
          supplier: '',
          errors: headerErrors,
        },
      ],
      validRows: [],
      hasErrors: true,
    };
  }

  const rows: CsvIntakePreviewRow[] = [];
  for (let r = 1; r < table.length; r += 1) {
    const cols = table[r];
    const errors: string[] = [];
    const profileCode = cols[idxProfileCode] || '';
    const quantityRaw = cols[idxQuantity] || '';
    const unitRaw = cols[idxUnit] || '';
    const barRaw = idxBarLength >= 0 ? cols[idxBarLength] || '' : '';
    const invoiceNo = idxInvoiceNo >= 0 ? cols[idxInvoiceNo] || '' : '';
    const supplier = idxSupplier >= 0 ? cols[idxSupplier] || '' : '';

    if (!profileCode) errors.push('profile_code is required');
    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push('quantity must be a finite positive number');
    }
    const inputUnit = normalizeUnit(unitRaw);
    if (!inputUnit) {
      errors.push(`unsupported unit "${unitRaw}" (use meters or pieces/bars)`);
    }
    let barLengthM: number | null = null;
    if (barRaw) {
      const n = Number(barRaw);
      if (!Number.isFinite(n) || n <= 0) errors.push('bar_length_m must be a positive number');
      else barLengthM = n;
    }

    let profileId: string | undefined;
    let profileName: string | undefined;
    let defaultBar: number | undefined;
    if (profileCode) {
      const resolved = resolveProfile(profileCode);
      if (resolved === 'ambiguous') {
        errors.push(`ambiguous catalogue code "${profileCode}"`);
      } else if (!resolved) {
        errors.push(`unknown profile code "${profileCode}"`);
      } else {
        profileId = resolved.id;
        profileName = resolved.name;
        defaultBar = resolved.defaultBarLengthM;
      }
    }

    if (inputUnit === 'pieces') {
      const effective = barLengthM ?? defaultBar ?? null;
      if (!(effective && effective > 0)) {
        errors.push('pieces/bars require positive bar_length_m');
      } else {
        barLengthM = effective;
      }
    }

    rows.push({
      rowNumber: r + 1,
      profileCode,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      unitRaw,
      inputUnit,
      barLengthM,
      invoiceNo,
      supplier,
      errors,
      profileId,
      profileName,
    });
  }

  const validRows = rows.filter((row) => row.errors.length === 0);
  return {
    headers,
    rows,
    validRows,
    hasErrors: rows.some((row) => row.errors.length > 0) || validRows.length === 0,
  };
}
