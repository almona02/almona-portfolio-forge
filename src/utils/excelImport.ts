/**
 * Excel Import Utility for Spare Parts
 * 
 * This utility provides functionality to import spare parts data from Excel files
 * into the database. It maps to the products table with category 'spare_part'.
 * 
 * Features:
 * - Lazy-loads ExcelJS to avoid inflating initial bundle
 * - Supports flexible column header variations (case-insensitive)
 * - Maps to either products table or dedicated spare_parts table
 * - Handles data type conversions and validation
 * - Provides detailed error reporting
 * 
 * If you maintain a dedicated `spare_parts` table, adjust the upsert section accordingly.
 */
let ExcelJS: typeof import('exceljs');
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { table } from '@/lib/data/clientCore';

type ProductsTable = Database['public']['Tables']['products'];

/**
 * Interface for spare part data as it appears in Excel files
 * Supports multiple case variations for field names to handle different Excel formats
 */
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

/**
 * Options for configuring the import process
 */
export interface ImportOptions {
  /** 
   * If true, writes to a dedicated 'spare_parts' table using part_number as unique key.
   * Otherwise, upserts into 'products' with category='spare_part' and maps part_number -> sku.
   */
  useDedicatedTable?: boolean;
}

/**
 * Imports spare parts data from an Excel file
 * 
 * @param file - The Excel file to import
 * @param options - Configuration options for the import process
 * @returns Promise with success status and any errors encountered
 */
export const importSpareParts = async (file: File, options: ImportOptions = {}) => {
  if (!ExcelJS) {
    ExcelJS = await import('exceljs');
  }
  const { useDedicatedTable = false } = options;
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  
  // Convert worksheet to JSON format similar to xlsx
  const data: SparePartExcelRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    const rowData: SparePartExcelRow = {};
    row.eachCell((cell, colNumber) => {
      const header = worksheet.getRow(1).getCell(colNumber).value?.toString() || '';
      const value = cell.value;
      
      // Map common header variations
      const normalizedHeader = header.toLowerCase().replace(/[_\s]/g, '');
      switch (normalizedHeader) {
        case 'partnumber':
        case 'part_number':
          rowData.part_number = value?.toString();
          break;
        case 'name':
          rowData.name = value?.toString();
          break;
        case 'description':
          rowData.description = value?.toString();
          break;
        case 'category':
          rowData.category = value?.toString();
          break;
        case 'subcategory':
          rowData.subcategory = value?.toString();
          break;
        case 'compatiblemachines':
        case 'compatible_machines':
          rowData.compatible_machines = value?.toString();
          break;
        case 'price':
          rowData.price = typeof value === 'number' ? value : parseFloat(value?.toString() || '0');
          break;
        case 'originalprice':
        case 'original_price':
          rowData.original_price = typeof value === 'number' ? value : parseFloat(value?.toString() || '0');
          break;
        case 'stockquantity':
        case 'stock_quantity':
          rowData.stock_quantity = typeof value === 'number' ? value : parseInt(value?.toString() || '0', 10);
          break;
        case 'minorderquantity':
        case 'min_order_quantity':
          rowData.min_order_quantity = typeof value === 'number' ? value : parseInt(value?.toString() || '1', 10);
          break;
        case 'weightkg':
        case 'weight_kg':
          rowData.weight_kg = typeof value === 'number' ? value : parseFloat(value?.toString() || '0');
          break;
        case 'specifications':
          rowData.specifications = value?.toString();
          break;
        case 'imageurl':
        case 'image_url':
          rowData.image_url = value?.toString();
          break;
        case 'iscritical':
        case 'is_critical':
          rowData.is_critical = value?.toString() === 'true' || value === true;
          break;
        case 'isactive':
        case 'is_active':
          rowData.is_active = value?.toString() === 'true' || value === true;
          break;
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      data.push(rowData);
    }
  });

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
          image_urls: payload.image_url ? [payload.image_url] : [] as string[],
          video_urls: [] as string[],
          document_urls: [] as string[],
          model_3d_url: null,
          keywords: [] as string[],
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
