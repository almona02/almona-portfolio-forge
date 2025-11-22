# 📊 Reporting System User Guide
## Week 4: Production Deployment Documentation

### Table of Contents
1. [Overview](#overview)
2. [Report Types](#report-types)
3. [Export Formats](#export-formats)
4. [Localization](#localization)
5. [Batch Processing](#batch-processing)
6. [Template Management](#template-management)
7. [Print Optimization](#print-optimization)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Reporting System provides comprehensive, multi-format export capabilities for cutting lists, accessories, and glass reports. All reports support multiple languages, print optimization, and enterprise-grade batch processing.

### Key Features
- ✅ **3 Report Types**: Cutting List, Accessories, Glass
- ✅ **3 Export Formats**: PDF, CSV, DXF
- ✅ **Multi-Language**: English, Turkish, Arabic (RTL)
- ✅ **Batch Processing**: Export multiple projects simultaneously
- ✅ **Print Optimized**: Shop-floor ready formatting
- ✅ **QR Codes & Barcodes**: Component tracking integration

---

## Report Types

### 1. Cutting List Report

**Purpose**: Detailed cutting plans with diagrams and optimization metrics.

**Features**:
- Visual cutting diagrams (SVG)
- Profile information display
- Cut sequence visualization
- Waste calculation per stock piece
- Utilization percentage
- QR code for tracking

**Usage**:
```typescript
<CuttingListReport
  project={project}
  optimization={optimization}
  branding={branding}
  language="en"
  onExport={(format) => handleExport(format)}
/>
```

### 2. Accessories Report

**Purpose**: Comprehensive hardware and accessories listing with pricing.

**Features**:
- Group hardware by category
- Quantities, unit prices, and total costs
- Supplier information and SKU numbers
- Procurement checklist
- Integration with PricingEngine

**Usage**:
```typescript
<AccessoriesReport
  project={project}
  accessories={accessories}
  pricing={pricing}
  language="en"
/>
```

### 3. Glass Report

**Purpose**: Glass and glazing specifications with area calculations.

**Features**:
- Glass specifications per component
- Area calculations
- Weight calculations
- Quality control checklist
- Cutting optimization data

**Usage**:
```typescript
<GlassReport
  project={project}
  glazing={glazing}
  language="en"
/>
```

---

## Export Formats

### PDF Export

**Best For**: Professional documentation, client-facing reports, printing.

**Features**:
- Branded headers and footers
- QR codes and barcodes
- High-quality diagrams
- Print-optimized layout
- Multi-page support

**Options**:
```typescript
{
  language: 'en' | 'tr' | 'ar',
  includeQRCode: true,
  includeDiagrams: true,
  includeCuttingList: true,
  includeAccessories: false,
  includeGlazing: false,
  pageSize: 'A4' | 'Letter' | 'A3',
  orientation: 'portrait' | 'landscape',
}
```

### CSV Export

**Best For**: Spreadsheet analysis, data import, Excel compatibility.

**Features**:
- Excel-compatible format
- UTF-8 BOM for proper encoding
- Customizable delimiters
- Regional number formatting
- QR code data included

**Options**:
```typescript
{
  language: 'en' | 'tr' | 'ar',
  delimiter: ',' | ';' | '\t',
  decimalSeparator: '.' | ',',
  excelCompatible: true,
  includeHeaders: true,
}
```

### DXF Export

**Best For**: CAD/CAM integration, CNC machine files, technical drawings.

**Features**:
- AutoCAD-compatible format
- Layer organization
- Dimension annotations
- Component barcodes
- Unit conversion (mm/inches)

**Options**:
```typescript
{
  language: 'en' | 'tr' | 'ar',
  units: 'mm' | 'inches',
  scale: 1,
  includeDimensions: true,
  includeAnnotations: true,
}
```

---

## Localization

### Supported Languages

- **English (en)**: Default language, LTR layout
- **Turkish (tr)**: Turkish market, LTR layout, Turkish Lira
- **Arabic (ar)**: Egyptian market, RTL layout, EGP currency

### Language Selection

Reports automatically adapt to the selected language:
- Text translations
- Number formatting (decimal separators)
- Date formatting
- Currency symbols
- Unit preferences (mm/cm/meters)
- Text direction (RTL for Arabic)

### RTL Support (Arabic)

Arabic reports feature complete RTL support:
- Right-to-left text direction
- Reversed table columns
- Mirrored layouts
- Proper Arabic font rendering
- Cultural date/number formats

---

## Batch Processing

### Basic Batch Export

Export multiple projects at once:

```typescript
const exportService = new ExportService();

const result = await exportService.exportBatch({
  projects: [project1, project2, project3],
  format: 'pdf',
  options: { language: 'en' },
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
});
```

### Advanced Batch Export

Enterprise features for large-scale operations:

```typescript
const result = await exportService.exportBatchAdvanced({
  projects: projects,
  format: 'pdf',
  options: { language: 'en' },
  priority: 'urgent',
  maxConcurrent: 3,
  memoryLimit: 500, // MB
  qualityCheck: true,
  validation: true,
  onProgress: (progress) => {
    // Track progress
  },
});
```

### Queue Management

Add exports to queue for priority processing:

```typescript
const queueId = exportService.queueExport({
  project: project,
  optimization: optimization,
  format: 'pdf',
  options: { language: 'en' },
  priority: 'urgent',
});

// Check queue status
const status = exportService.getQueueStatus();
console.log(`Pending: ${status.pending}, Processing: ${status.processing}`);
```

### Resume from Checkpoint

Resume interrupted batch exports:

```typescript
const result = await exportService.exportBatchAdvanced({
  projects: projects,
  format: 'pdf',
  options: { language: 'en' },
  resumeFromCheckpoint: true,
});
```

---

## Template Management

### Using Templates

Apply pre-configured templates to exports:

```typescript
import { templateManager } from '@/lib/exports/TemplateManager';

// Apply template
const result = templateManager.applyTemplate('workshop-template', options);

if (result.success) {
  const exportOptions = result.appliedOptions;
  // Use exportOptions for export
}
```

### Template Types

- **basic**: Standard report layout
- **premium**: Enhanced branding and styling
- **minimal**: Simplified layout
- **client-facing**: Professional presentation
- **workshop**: Shop-floor optimized
- **multi-language**: Multi-language support

---

## Print Optimization

### Print-Specific Features

All reports are optimized for printing:

- **Page Breaks**: Automatic page break management
- **Margins**: Optimized margins for standard paper sizes
- **Font Sizes**: Readable font sizes for shop-floor use
- **QR Codes**: High-contrast QR codes for reliable scanning
- **Tables**: Print-friendly table formatting
- **Ink Saving**: Optional ink-saving mode

### Print Styles

Print styles are automatically injected:

```typescript
import { injectPrintStyles } from '@/lib/localization/printStyles';

// Inject print styles (usually done automatically)
injectPrintStyles();
```

### Paper Sizes

Supported paper sizes:
- **A4**: Standard European size (default for TR, AR)
- **Letter**: Standard US size (default for EN)
- **A3**: Large format

---

## Troubleshooting

### Common Issues

#### 1. Export Fails

**Problem**: Export operation fails with error.

**Solutions**:
- Check that optimization data is available
- Verify project data is complete
- Check browser console for detailed errors
- Ensure sufficient memory for large exports

#### 2. PDF Not Printing Correctly

**Problem**: PDF prints with layout issues.

**Solutions**:
- Use print-optimized templates
- Check paper size settings
- Verify printer settings
- Use PDF viewer's print preview

#### 3. CSV Not Opening in Excel

**Problem**: CSV file doesn't open correctly in Excel.

**Solutions**:
- Enable `excelCompatible: true` option
- Check file encoding (should be UTF-8 with BOM)
- Verify delimiter matches Excel's regional settings
- Use Excel's "Import" feature instead of "Open"

#### 4. Arabic Text Not Displaying Correctly

**Problem**: Arabic text appears garbled or reversed.

**Solutions**:
- Ensure RTL layout is applied (`dir="rtl"`)
- Check font support for Arabic characters
- Verify language is set to 'ar'
- Test in different browsers

#### 5. Batch Export Too Slow

**Problem**: Batch export takes too long.

**Solutions**:
- Reduce `maxConcurrent` value
- Lower `memoryLimit` if memory constrained
- Use lower priority for non-urgent exports
- Process in smaller batches

#### 6. QR Code Not Scanning

**Problem**: QR codes don't scan properly.

**Solutions**:
- Ensure QR code size is at least 150x150px
- Check print quality and contrast
- Verify QR code data is valid
- Test with multiple QR code scanners

---

## Best Practices

### Performance

1. **Batch Size**: Process 50-100 projects per batch for optimal performance
2. **Concurrency**: Use 2-3 concurrent exports for balanced performance
3. **Memory**: Monitor memory usage for large batches
4. **Checkpoints**: Enable checkpoints for batches > 100 projects

### Quality

1. **Validation**: Enable validation for critical exports
2. **Quality Checks**: Use quality checks for production exports
3. **Testing**: Test exports in target applications before production use
4. **Templates**: Use appropriate templates for each use case

### Localization

1. **Language Selection**: Always specify language explicitly
2. **RTL Testing**: Test Arabic reports thoroughly for RTL correctness
3. **Formatting**: Verify number and date formatting for each locale
4. **Fonts**: Ensure proper fonts are available for all languages

---

## Support

For additional support:
- Check documentation: `/docs/reporting-system-guide.md`
- Review code examples: `/src/modules/reporting/`
- Test files: `/src/lib/exports/__tests__/`

---

**Version**: 1.0.0  
**Last Updated**: Week 4, 2024  
**Status**: Production Ready ✅

