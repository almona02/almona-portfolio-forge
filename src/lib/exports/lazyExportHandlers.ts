/**
 * Lazy Export Handlers - Dynamic imports for PDF/Excel export libraries
 * 
 * These functions load heavy export libraries (jspdf, exceljs, pdf-lib) only when
 * the user clicks an export button, not during initial page load.
 * 
 * This reduces initial bundle size by ~1.9MB (document-vendor chunk)
 */

/**
 * Lazy load PDF export functionality
 * Use this in button onClick handlers instead of importing PDFExportService directly
 */
export async function lazyExportPDF(
  project: any,
  optimization: any,
  options: any
): Promise<Blob> {
  // Dynamic import - chunk only loads when this function is called
  const { PDFExportService } = await import('@/modules/reporting/PDFExportService');
  const pdfService = new PDFExportService(options.branding || {});
  return await pdfService.generateCuttingListPDF(project, optimization, options);
}

/**
 * Lazy load quotation PDF export
 */
export async function lazyExportQuotationPDF(
  project: any,
  quote: any,
  options: any
): Promise<Blob> {
  // Dynamic import - chunk only loads when this function is called
  const { PDFExportService } = await import('@/modules/reporting/PDFExportService');
  const pdfService = new PDFExportService(options.branding || {});
  return await pdfService.generateQuotationPDF(project, quote, options);
}

/**
 * Lazy load Excel export functionality
 */
export async function lazyExportExcel(
  project: any,
  optimization: any,
  options: any
): Promise<Blob> {
  // Dynamic import - chunk only loads when this function is called
  const { ExportService } = await import('@/lib/exports/ExportService');
  const exportService = new ExportService();
  const result = await exportService.exportProject(project, optimization, 'csv', options);
  
  if (result.success && result.blob) {
    return result.blob;
  }
  throw new Error(result.error || 'Export failed');
}

/**
 * Lazy load complete export service
 * Use this when you need the full ExportService with all formats
 */
export async function lazyGetExportService() {
  const { ExportService } = await import('@/lib/exports/ExportService');
  return new ExportService();
}

/**
 * Lazy load PDF export generator with QR codes
 */
export async function lazyExportPDFWithQR(
  project: any,
  optimization: any,
  options: any
): Promise<Blob> {
  const { PDFExportGenerator } = await import('@/lib/exports/PDFExportGenerator');
  const generator = new PDFExportGenerator();
  return await generator.generate(project, optimization, {
    ...options,
    includeQRCode: true,
  });
}

