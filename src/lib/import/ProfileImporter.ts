/**
 * Profile Importer Utility
 * Parses Excel/CSV files and imports profiles
 */

// ExcelJS imported dynamically for better performance
// See EgyptianLoadingStrategy for connection-aware loading

export interface ParsedRow {
  [key: string]: any;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
}

export class ProfileImporter {
  /**
   * Parse Excel or CSV file
   */
  async parseFile(file: File): Promise<ParseResult> {
    return new Promise(async (resolve, reject) => {
      try {
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = await file.text();
          const lines = text.split('\n').filter((line) => line.trim());
          if (lines.length < 2) {
            reject(new Error('File must contain at least a header row and one data row'));
            return;
          }

          const headers = lines[0].split(',').map((h) => h.trim());
          const rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const obj: ParsedRow = {};
            headers.forEach((header, idx) => {
              obj[header] = values[idx] || '';
            });
            return obj;
          });

          resolve({ headers, rows });
        } else {
          // Parse Excel using ExcelJS (lazy loaded)
          const { EgyptianLoadingStrategy } = await import('@/lib/egyptian-loading-strategy');
          const ExcelJS = await EgyptianLoadingStrategy.loadExcelJS();
          
          const arrayBuffer = await file.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(arrayBuffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            reject(new Error('No worksheets found in file'));
            return;
          }

          const headerRow = worksheet.getRow(1);
          const headers = headerRow.values
            .slice(1)
            .map((v) => String(v || '').trim())
            .filter((h) => h);

          if (headers.length === 0) {
            reject(new Error('No headers found in file'));
            return;
          }

          const rows: ParsedRow[] = [];
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const obj: ParsedRow = {};
            headers.forEach((header, idx) => {
              const cell = row.getCell(idx + 2); // +2 because ExcelJS is 1-indexed and first column is empty
              obj[header] = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
            });
            rows.push(obj);
          });

          resolve({ headers, rows });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Auto-detect column mapping
   */
  detectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    const fieldKeywords: Record<string, string[]> = {
      name: ['name', 'profile name', 'profile_name', 'title'],
      code: ['code', 'profile code', 'profile_code', 'sku', 'part number'],
      width: ['width', 'w', 'profile width'],
      height: ['height', 'h', 'profile height', 'depth'],
      cost_per_meter: ['cost', 'price', 'cost per meter', 'cost_per_meter', 'price per meter'],
      weight_per_meter: ['weight', 'weight per meter', 'weight_per_meter', 'kg/m'],
      supplier: ['supplier', 'vendor', 'manufacturer'],
    };

    headers.forEach((header) => {
      const lowerHeader = header.toLowerCase();
      for (const [field, keywords] of Object.entries(fieldKeywords)) {
        if (keywords.some((keyword) => lowerHeader.includes(keyword))) {
          mapping[header] = field;
          break;
        }
      }
      if (!mapping[header]) {
        mapping[header] = 'ignore';
      }
    });

    return mapping;
  }

  /**
   * Import profiles from file
   */
  async importProfiles(
    file: File,
    columnMapping: Record<string, string>,
    userId: string
  ): Promise<any[]> {
    const { rows } = await this.parseFile(file);
    const profiles: any[] = [];

    for (const row of rows) {
      const profile: any = {
        user_id: userId,
      };

      for (const [csvColumn, profileField] of Object.entries(columnMapping)) {
        if (profileField === 'ignore') continue;

        const value = row[csvColumn];
        if (value !== undefined && value !== null && value !== '') {
          // Convert to appropriate type
          if (['width', 'height', 'cost_per_meter', 'weight_per_meter'].includes(profileField)) {
            profile[profileField] = parseFloat(String(value)) || 0;
          } else {
            profile[profileField] = String(value).trim();
          }
        }
      }

      // Set defaults
      profile.material = profile.material || 'aluminum';
      profile.stock_quantity = profile.stock_quantity || 0;
      profile.cutting_allowance = profile.cutting_allowance || 3;

      if (profile.name || profile.code) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  /**
   * Validate profiles before import
   */
  validateProfiles(profiles: any[]): string[] {
    const errors: string[] = [];

    profiles.forEach((profile, idx) => {
      if (!profile.name && !profile.code) {
        errors.push(`Row ${idx + 1}: Missing name or code`);
      }
      if (profile.width && (profile.width <= 0 || profile.width > 1000)) {
        errors.push(`Row ${idx + 1}: Invalid width (must be between 0 and 1000mm)`);
      }
      if (profile.height && (profile.height <= 0 || profile.height > 1000)) {
        errors.push(`Row ${idx + 1}: Invalid height (must be between 0 and 1000mm)`);
      }
      if (profile.cost_per_meter && profile.cost_per_meter < 0) {
        errors.push(`Row ${idx + 1}: Invalid cost (must be >= 0)`);
      }
    });

    return errors;
  }
}

