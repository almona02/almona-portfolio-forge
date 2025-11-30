/**
 * Invoice Parser
 * Parses supplier invoices (PDF/CSV) and extracts profile information
 */

export interface InvoiceItem {
  profileCode: string;
  profileName?: string;
  quantity: number;
  unit: 'bar' | 'meter';
  barLengthM?: number;
  totalLengthM?: number;
  weightKg?: number;
  price?: number;
  supplier?: string;
  invoiceNumber?: string;
}

export interface ParsedInvoice {
  supplier: string;
  invoiceNumber: string;
  invoiceDate?: Date;
  items: InvoiceItem[];
  totalAmount?: number;
  currency?: string;
}

export class InvoiceParser {
  /**
   * Parse CSV invoice
   */
  async parseCSV(csvContent: string, options?: {
    supplier?: string;
    invoiceNumber?: string;
    columnMapping?: Record<string, string>;
  }): Promise<ParsedInvoice> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('Invalid CSV: insufficient data');
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const defaultMapping: Record<string, string> = {
      code: 'code',
      name: 'name',
      quantity: 'quantity',
      unit: 'unit',
      length: 'length',
      weight: 'weight',
      price: 'price',
    };

    const mapping = { ...defaultMapping, ...options?.columnMapping };

    const items: InvoiceItem[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const code = row[mapping.code] || row['code'] || row['profile_code'] || '';
      const quantity = parseFloat(row[mapping.quantity] || row['quantity'] || '0');
      const unit = (row[mapping.unit] || row['unit'] || 'bar').toLowerCase() as 'bar' | 'meter';
      const length = parseFloat(row[mapping.length] || row['length'] || row['bar_length'] || '0');
      const weight = parseFloat(row[mapping.weight] || row['weight'] || '0');
      const price = parseFloat(row[mapping.price] || row['price'] || '0');

      if (code && quantity > 0) {
        items.push({
          profileCode: code,
          profileName: row[mapping.name] || row['name'] || '',
          quantity,
          unit,
          barLengthM: unit === 'bar' ? length : undefined,
          totalLengthM: unit === 'meter' ? length : undefined,
          weightKg: weight || undefined,
          price: price || undefined,
          supplier: options?.supplier,
          invoiceNumber: options?.invoiceNumber,
        });
      }
    }

    return {
      supplier: options?.supplier || 'Unknown',
      invoiceNumber: options?.invoiceNumber || `INV-${Date.now()}`,
      items,
    };
  }

  /**
   * Parse PDF invoice (simplified - would use pdf-parse library in production)
   */
  async parsePDF(pdfFile: File): Promise<ParsedInvoice> {
    // This is a placeholder - in production would use pdf-parse or similar
    // For now, return error suggesting CSV upload
    throw new Error(
      'PDF parsing not yet implemented. Please upload a CSV file or contact support for PDF parsing.'
    );
  }

  /**
   * Auto-map invoice items to profiles using profile codes
   */
  mapItemsToProfiles(
    items: InvoiceItem[],
    availableProfiles: Array<{ id: string; code?: string; name?: string; supplier?: string }>
  ): Array<InvoiceItem & { matchedProfileId?: string; matchConfidence: 'high' | 'medium' | 'low' }> {
    return items.map((item) => {
      // Try exact code match first
      let matchedProfile = availableProfiles.find(
        (p) => p.code?.toLowerCase() === item.profileCode.toLowerCase()
      );

      if (matchedProfile) {
        return {
          ...item,
          matchedProfileId: matchedProfile.id,
          matchConfidence: 'high',
        };
      }

      // Try name match
      if (item.profileName) {
        matchedProfile = availableProfiles.find(
          (p) => p.name?.toLowerCase().includes(item.profileName!.toLowerCase())
        );
        if (matchedProfile) {
          return {
            ...item,
            matchedProfileId: matchedProfile.id,
            matchConfidence: 'medium',
          };
        }
      }

      // Try supplier match
      if (item.supplier) {
        matchedProfile = availableProfiles.find(
          (p) => p.supplier?.toLowerCase() === item.supplier!.toLowerCase()
        );
        if (matchedProfile) {
          return {
            ...item,
            matchedProfileId: matchedProfile.id,
            matchConfidence: 'low',
          };
        }
      }

      return {
        ...item,
        matchConfidence: 'low',
      };
    });
  }
}

export const invoiceParser = new InvoiceParser();

