/**
 * Output Validation Utilities
 * Week 4: Output Validation & Quality Assurance
 * 
 * Validates export outputs for compliance, encoding, and compatibility
 */

import { ExportResult, ExportFormat } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    fileSize: number;
    encoding?: string;
    pageCount?: number;
    recordCount?: number;
  };
}

/**
 * Validate PDF export
 */
export async function validatePDF(result: ExportResult): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success || !result.blob) {
    return {
      valid: false,
      errors: ['PDF export failed or blob is missing'],
      warnings: [],
    };
  }

  // Check file size
  if (result.blob.size === 0) {
    errors.push('PDF file is empty');
  } else if (result.blob.size < 100) {
    warnings.push('PDF file is unusually small');
  }

  // Check PDF header (PDF files start with %PDF)
  const firstBytes = await result.blob.slice(0, 4).text();
  if (!firstBytes.startsWith('%PDF')) {
    errors.push('Invalid PDF header');
  }

  // Check for PDF/A compliance markers (simplified check)
  const fullText = await result.blob.text();
  if (!fullText.includes('/Type/Catalog')) {
    warnings.push('PDF may not be PDF/A compliant');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize: result.blob.size,
      pageCount: result.metadata?.pageCount,
    },
  };
}

/**
 * Validate CSV export
 */
export async function validateCSV(result: ExportResult): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success || !result.blob) {
    return {
      valid: false,
      errors: ['CSV export failed or blob is missing'],
      warnings: [],
    };
  }

  // Check file size
  if (result.blob.size === 0) {
    errors.push('CSV file is empty');
  }

  // Check encoding (should be UTF-8)
  const text = await result.blob.text();
  
  // Check for UTF-8 BOM (for Excel compatibility)
  const hasBOM = text.charCodeAt(0) === 0xFEFF;
  if (!hasBOM) {
    warnings.push('CSV file missing UTF-8 BOM (may not open correctly in Excel)');
  }

  // Validate CSV structure
  const lines = text.split('\n');
  if (lines.length < 2) {
    warnings.push('CSV file has very few rows');
  }

  // Check for proper delimiter usage
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  
  if (commaCount === 0 && semicolonCount === 0) {
    warnings.push('CSV file may not have proper delimiters');
  }

  // Check for encoding issues (non-printable characters)
  const hasInvalidChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(text);
  if (hasInvalidChars) {
    warnings.push('CSV file contains non-printable characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize: result.blob.size,
      encoding: hasBOM ? 'UTF-8 with BOM' : 'UTF-8',
      recordCount: lines.length - 1, // Subtract header
    },
  };
}

/**
 * Validate DXF export
 */
export async function validateDXF(result: ExportResult): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success || !result.blob) {
    return {
      valid: false,
      errors: ['DXF export failed or blob is missing'],
      warnings: [],
    };
  }

  // Check file size
  if (result.blob.size === 0) {
    errors.push('DXF file is empty');
  } else if (result.blob.size < 100) {
    warnings.push('DXF file is unusually small');
  }

  // Check DXF header (DXF files start with specific sections)
  const text = await result.blob.text();
  if (!text.includes('SECTION') || !text.includes('ENDSEC')) {
    errors.push('Invalid DXF structure');
  }

  // Check for required sections
  if (!text.includes('HEADER')) {
    warnings.push('DXF file missing HEADER section');
  }
  if (!text.includes('ENTITIES')) {
    warnings.push('DXF file missing ENTITIES section');
  }

  // Check DXF version compatibility
  if (!text.includes('AC1015') && !text.includes('AC1018') && !text.includes('AC1021')) {
    warnings.push('DXF version may not be compatible with all CAD software');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileSize: result.blob.size,
    },
  };
}

/**
 * Validate export result based on format
 */
export async function validateExport(result: ExportResult): Promise<ValidationResult> {
  switch (result.format) {
    case 'pdf':
      return validatePDF(result);
    case 'csv':
      return validateCSV(result);
    case 'dxf':
      return validateDXF(result);
    default:
      return {
        valid: false,
        errors: [`Unsupported format: ${result.format}`],
        warnings: [],
      };
  }
}

/**
 * Check file size limits
 */
export function checkFileSizeLimit(fileSize: number, format: ExportFormat): {
  withinLimit: boolean;
  warning?: string;
} {
  const limits: Record<ExportFormat, number> = {
    pdf: 50 * 1024 * 1024, // 50 MB
    csv: 10 * 1024 * 1024, // 10 MB
    dxf: 20 * 1024 * 1024, // 20 MB
  };

  const limit = limits[format];
  if (fileSize > limit) {
    return {
      withinLimit: false,
      warning: `File size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds recommended limit (${(limit / 1024 / 1024).toFixed(2)} MB)`,
    };
  }

  return { withinLimit: true };
}

/**
 * Validate encoding for text-based formats
 */
export async function validateEncoding(blob: Blob, expectedEncoding: 'UTF-8' | 'UTF-8-BOM' = 'UTF-8'): Promise<{
  valid: boolean;
  detected?: string;
  warning?: string;
}> {
  const text = await blob.text();
  
  // Check for BOM
  const hasBOM = text.charCodeAt(0) === 0xFEFF;
  
  if (expectedEncoding === 'UTF-8-BOM' && !hasBOM) {
    return {
      valid: false,
      detected: 'UTF-8',
      warning: 'Expected UTF-8 with BOM but BOM is missing',
    };
  }
  
  if (expectedEncoding === 'UTF-8' && hasBOM) {
    return {
      valid: true,
      detected: 'UTF-8 with BOM',
      warning: 'File has BOM but UTF-8 without BOM was expected',
    };
  }

  // Basic UTF-8 validation
  try {
    // Try to decode as UTF-8
    new TextDecoder('utf-8', { fatal: true }).decode(await blob.arrayBuffer());
    return {
      valid: true,
      detected: hasBOM ? 'UTF-8 with BOM' : 'UTF-8',
    };
  } catch (error) {
    return {
      valid: false,
      detected: 'Unknown',
      warning: 'File does not appear to be valid UTF-8',
    };
  }
}

