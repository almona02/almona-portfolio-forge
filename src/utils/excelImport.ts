// Excel import utility for Spare Parts (maps to products table with category 'spare_part')
// If you maintain a dedicated `spare_parts` table, adjust the upsert section accordingly.
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { table } from '@/lib/data/clientCore';

type ProductsTable = Database['public']['Tables']['products'];

interface SparePartExcelRow {
  part_number?: string;
  PART_NUMBER?: string;
  Part_Number?: string;
  PartNumber?: string;
  name?: string;
  Name?: string;
  description?: string;
  Description?: string;
  category?: string;
  Category?: string;
  subcategory?: string;
  Subcategory?: string;
  compatible_machines?: string | string[];
  price?: string | number;
  original_price?: string | number;
  stock_quantity?: string | number;
  min_order_quantity?: string | number;
  weight_kg?: string | number;
  specifications?: string;
  image_url?: string;
  is_critical?: string | boolean;
  is_active?: string | boolean;
}

const toBoolean = (v: string | boolean | number | null | undefined): boolean | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(s);
};

const toFloat = (v: string | number | null | undefined): number | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

const toInt = (v: string | number | null | undefined): number | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return Math.trunc(v);
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

export interface ImportOptions {
  // If true, writes to a dedicated 'spare_parts' table using part_number as unique key.
  // Otherwise, upserts into 'products' with category='spare_part' and maps part_number -> sku.
  useDedicatedTable?: boolean;
}

export const importSpareParts = async (file: File, options: ImportOptions = {}) => {
  const { useDedicatedTable = false } = options;
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<SparePartExcelRow>(worksheet);

  const errors: Array<{ part_number?: string; message: string } > = [];

  for (const item of data) {
    try {
      // Normalize fields (tolerate header case variations)
      const part_number = item.part_number ?? item.PART_NUMBER ?? item.Part_Number ?? item.PartNumber;

      const payload = {
        part_number,
        name: item.name ?? item.Name,
        description: item.description ?? item.Description ?? null,
        category: item.category ?? item.Category ?? null,
        subcategory: item.subcategory ?? item.Subcategory ?? null,
        compatible_machines: typeof item.compatible_machines === 'string'
          ? (item.compatible_machines as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(item.compatible_machines) ? item.compatible_machines : [],
  price: toFloat(item.price),
  original_price: toFloat(item.original_price),
  stock_quantity: toInt(item.stock_quantity) ?? 0,
  min_order_quantity: toInt(item.min_order_quantity) ?? 1,
  weight_kg: toFloat(item.weight_kg),
        specifications: (() => {
          try { return item.specifications ? JSON.parse(item.specifications) : {}; } catch { return {}; }
        })(),
        image_url: item.image_url ?? null,
        is_critical: toBoolean(item.is_critical) ?? false,
        is_active: toBoolean(item.is_active) ?? true,
      };

      if (!payload.part_number) {
        errors.push({ part_number: undefined, message: 'Missing part_number' });
        continue;
      }

  if (!useDedicatedTable) {
        // Map to products table (recommended for current repo schema)
        // Map: part_number -> sku, name -> name_en (keep name_ar same for now), category forced to 'spare_part'
        const product: ProductsTable['Insert'] = {
          sku: payload.part_number,
          name_ar: payload.name,
          name_en: payload.name,
          description_ar: payload.description,
          description_en: payload.description,
          category: 'spare_part' as const,
          subcategory: payload.subcategory,
          brand: null as string | null,
          model: null as string | null,
          price: payload.price,
          cost_price: null as number | null,
          currency: 'EGP',
          stock_quantity: payload.stock_quantity ?? 0,
          min_stock_level: 0,
          max_stock_level: 0,
          weight_kg: payload.weight_kg,
          dimensions: null,
          specifications: payload.specifications ?? {},
          features: {},
          compatible_machines: payload.compatible_machines ?? [],
          image_urls: payload.image_url ? [payload.image_url] : [],
          video_urls: [],
          document_urls: [],
          model_3d_url: null,
          keywords: [],
          is_active: payload.is_active ?? true,
          is_featured: false,
          is_new: false,
          is_on_sale: payload.original_price != null && payload.price != null && payload.original_price > payload.price,
        } as const;
        // Use table helper to avoid strict generic inference to never; ok to cast on this line
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (table('products') as any)
          .upsert(product, { onConflict: 'sku' });
        if (error) throw error;
      } else {
        // If a separate spare_parts table exists and is exposed in Database types, map and upsert there.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('spare_parts')
          .upsert({
            part_number: payload.part_number!,
            name: payload.name!,
            description: payload.description,
            compatible_machines: [] as string[],
            price: payload.price ?? 0,
            original_price: payload.original_price ?? null,
            stock_quantity: payload.stock_quantity ?? 0,
            min_order_quantity: 1,
            weight_kg: payload.weight_kg ?? null,
            specifications: payload.specifications ?? {},
            image_url: payload.image_url ?? null,
            is_critical: payload.is_critical ?? false,
            is_active: payload.is_active ?? true,
          }, { onConflict: 'part_number' });
        if (error) throw error;
      }
    } catch (e) {
      console.error('Error importing part:', item?.part_number, e);
      errors.push({ part_number: item?.part_number, message: (e as Error)?.message ?? 'Unknown error' });
    }
  }

  return { success: errors.length === 0, errors };
};
