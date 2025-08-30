import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExcelProduct {
  sku: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  category: 'machine' | 'spare_part' | 'raw_material' | 'tool' | 'accessory';
  subcategory?: string;
  brand?: string;
  model?: string;
  price?: number;
  cost_price?: number;
  stock_quantity?: number;
  weight_kg?: number;
  compatible_machines_skus?: string; // Comma-separated SKUs
  specifications?: string; // JSON string
  features?: string; // JSON string
  image_urls?: string; // Comma-separated URLs
  video_urls?: string; // Comma-separated URLs
  document_urls?: string; // Comma-separated URLs
  model_3d_url?: string;
  meta_title_ar?: string;
  meta_title_en?: string;
  meta_description_ar?: string;
  meta_description_en?: string;
  keywords?: string; // Comma-separated keywords
  is_active?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  is_on_sale?: boolean;
}

async function importProductsFromExcel(filePath: string) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: ExcelProduct[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${rawData.length} products in Excel file`);

    // Transform and validate data
    const productsToInsert = rawData.map((row, index) => {
      try {
        // Parse specifications JSON
        let specifications = {};
        if (row.specifications) {
          try {
            specifications = JSON.parse(row.specifications);
          } catch (e) {
            console.warn(`Row ${index + 1}: Invalid specifications JSON, using empty object`);
          }
        }

        // Parse features JSON
        let features = {};
        if (row.features) {
          try {
            features = JSON.parse(row.features);
          } catch (e) {
            console.warn(`Row ${index + 1}: Invalid features JSON, using empty object`);
          }
        }

        // Parse arrays from comma-separated strings
        const parseCommaSeparated = (str?: string): string[] | null => {
          if (!str) return null;
          return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
        };

        const product = {
          sku: row.sku?.toString().trim(),
          name_ar: row.name_ar?.toString().trim(),
          name_en: row.name_en?.toString().trim(),
          description_ar: row.description_ar?.toString().trim() || null,
          description_en: row.description_en?.toString().trim() || null,
          short_description_ar: row.description_ar?.toString().substring(0, 200) || null,
          short_description_en: row.description_en?.toString().substring(0, 200) || null,
          category: row.category as 'machine' | 'spare_part' | 'raw_material' | 'tool' | 'accessory',
          subcategory: row.subcategory?.toString().trim() || null,
          brand: row.brand?.toString().trim() || null,
          model: row.model?.toString().trim() || null,
          price: row.price ? Number(row.price) : null,
          cost_price: row.cost_price ? Number(row.cost_price) : null,
          currency: 'EGP',
          stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
          min_stock_level: 0,
          max_stock_level: 1000,
          weight_kg: row.weight_kg ? Number(row.weight_kg) : null,
          dimensions: null, // Can be added later
          specifications,
          features,
          compatible_machines: parseCommaSeparated(row.compatible_machines_skus),
          image_urls: parseCommaSeparated(row.image_urls),
          video_urls: parseCommaSeparated(row.video_urls),
          document_urls: parseCommaSeparated(row.document_urls),
          model_3d_url: row.model_3d_url?.toString().trim() || null,
          meta_title_ar: row.meta_title_ar?.toString().trim() || null,
          meta_title_en: row.meta_title_en?.toString().trim() || null,
          meta_description_ar: row.meta_description_ar?.toString().trim() || null,
          meta_description_en: row.meta_description_en?.toString().trim() || null,
          keywords: parseCommaSeparated(row.keywords),
          is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
          is_featured: row.is_featured !== undefined ? Boolean(row.is_featured) : false,
          is_new: row.is_new !== undefined ? Boolean(row.is_new) : false,
          is_on_sale: row.is_on_sale !== undefined ? Boolean(row.is_on_sale) : false,
        };

        // Validate required fields
        if (!product.sku) {
          throw new Error(`Row ${index + 1}: SKU is required`);
        }
        if (!product.name_ar) {
          throw new Error(`Row ${index + 1}: Arabic name is required`);
        }
        if (!product.name_en) {
          throw new Error(`Row ${index + 1}: English name is required`);
        }
        if (!product.category) {
          throw new Error(`Row ${index + 1}: Category is required`);
        }

        return product;
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        throw error;
      }
    });

    console.log(`Processed ${productsToInsert.length} products for insertion`);

    // Insert products in batches to avoid timeout
    const batchSize = 100;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsToInsert.length / batchSize)} (${batch.length} products)`);

      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(batch, { 
            onConflict: 'sku',
            ignoreDuplicates: false 
          })
          .select('id, sku');

        if (error) {
          console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error);
          errorCount += batch.length;
        } else {
          insertedCount += data?.length || 0;
          console.log(`Batch ${Math.floor(i / batchSize) + 1} completed: ${data?.length || 0} products upserted`);
        }
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} exception:`, error);
        errorCount += batch.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total products processed: ${productsToInsert.length}`);
    console.log(`Successfully inserted/updated: ${insertedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('======================\n');

    return {
      total: productsToInsert.length,
      inserted: insertedCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

async function createSampleProducts() {
  console.log('Creating sample products...');

  const sampleProducts = [
    {
      sku: 'YM-CNC-001',
      name_ar: 'آلة CNC للألمنيوم يلماز موديل 2024',
      name_en: 'YILMAZ CNC Aluminum Machine Model 2024',
      description_ar: 'آلة CNC متطورة لتشكيل الألمنيوم بدقة عالية ومواصفات احترافية',
      description_en: 'Advanced CNC machine for aluminum processing with high precision and professional specifications',
      short_description_ar: 'آلة CNC متطورة لتشكيل الألمنيوم بدقة عالية',
      short_description_en: 'Advanced CNC machine for aluminum processing',
      category: 'machine' as const,
      subcategory: 'CNC Machines',
      brand: 'YILMAZ',
      model: '2024-AL-CNC',
      price: 250000,
      cost_price: 200000,
      currency: 'EGP',
      stock_quantity: 5,
      min_stock_level: 1,
      max_stock_level: 10,
      weight_kg: 2500,
      specifications: {
        'Working Area': '1200x800x600 mm',
        'Spindle Speed': '24000 RPM',
        'Tool Changer': '20 Tools',
        'Control System': 'Fanuc',
        'Power': '15 KW'
      },
      features: {
        'Automatic Tool Changer': true,
        'Coolant System': true,
        'Safety Enclosure': true,
        'Remote Monitoring': true
      },
      image_urls: ['/images/machines/cnc-001-1.jpg', '/images/machines/cnc-001-2.jpg'],
      video_urls: ['/videos/cnc-001-demo.mp4'],
      document_urls: ['/documents/specs/cnc-001-specs.pdf'],
      meta_title_ar: 'آلة CNC للألمنيوم يلماز - دقة عالية وأداء متميز',
      meta_title_en: 'YILMAZ CNC Aluminum Machine - High Precision Performance',
      keywords: ['CNC', 'آلة', 'ألمنيوم', 'يلماز', 'تشكيل'],
      is_active: true,
      is_featured: true,
      is_new: true,
      is_on_sale: false,
    },
    {
      sku: 'YM-SP-001',
      name_ar: 'قطعة غيار - محرك دوران رئيسي',
      name_en: 'Spare Part - Main Spindle Motor',
      description_ar: 'محرك دوران رئيسي عالي الجودة متوافق مع آلات يلماز CNC',
      description_en: 'High-quality main spindle motor compatible with YILMAZ CNC machines',
      short_description_ar: 'محرك دوران رئيسي عالي الجودة',
      short_description_en: 'High-quality main spindle motor',
      category: 'spare_part' as const,
      subcategory: 'Motors',
      brand: 'YILMAZ',
      model: 'SM-2024',
      price: 15000,
      cost_price: 12000,
      currency: 'EGP',
      stock_quantity: 20,
      min_stock_level: 5,
      max_stock_level: 50,
      weight_kg: 25,
      specifications: {
        'Power': '5 KW',
        'Speed': '24000 RPM',
        'Voltage': '380V',
        'Frequency': '50Hz',
        'Cooling': 'Air Cooled'
      },
      features: {
        'High Precision': true,
        'Low Noise': true,
        'Long Life': true
      },
      compatible_machines: ['YM-CNC-001', 'YM-CNC-002'],
      image_urls: ['/images/spare-parts/motor-001.jpg'],
      document_urls: ['/documents/specs/motor-001-specs.pdf'],
      meta_title_ar: 'محرك دوران رئيسي - قطع غيار يلماز الأصلية',
      meta_title_en: 'Main Spindle Motor - Original YILMAZ Spare Parts',
      keywords: ['محرك', 'قطعة غيار', 'يلماز', 'CNC'],
      is_active: true,
      is_featured: false,
      is_new: false,
      is_on_sale: true,
    }
  ];

  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(sampleProducts, { onConflict: 'sku' })
      .select();

    if (error) throw error;

    console.log(`Successfully created ${data?.length || 0} sample products`);
    return data;
  } catch (error) {
    console.error('Error creating sample products:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm run import-data <excel-file-path>  - Import from Excel file');
    console.log('  npm run import-data --sample           - Create sample products');
    process.exit(1);
  }

  try {
    if (args[0] === '--sample') {
      await createSampleProducts();
    } else {
      const filePath = path.resolve(args[0]);
      await importProductsFromExcel(filePath);
    }
    
    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { importProductsFromExcel, createSampleProducts };
