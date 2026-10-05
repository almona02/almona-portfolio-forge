# 📊 PHASE 2: QUICK REFERENCE GUIDE

## 🎯 At a Glance

**Goal:** Professional multi-format reporting system (PDF, CSV, DXF)  
**Timeline:** 3-4 weeks  
**Key Deliverables:** 3 report types × 3 export formats = 9 core features

---

## 📁 File Structure Quick Reference

```
src/modules/reporting/
├── CuttingListReport.tsx      [UPDATE] - Enhanced cutting list UI
├── AccessoriesReport.tsx       [NEW] - Hardware/accessories report
├── GlassReport.tsx             [NEW] - Glass/glazing report
└── ReportEngine.tsx            [UPDATE] - Add new report types

src/lib/
├── reports/
│   └── CuttingListGenerator.ts [NEW] - Business logic for cutting lists
└── exports/
    ├── ExportService.ts        [NEW] - Main orchestrator
    ├── PDFExportGenerator.ts   [NEW] - PDF generation
    ├── CSVExportGenerator.ts   [NEW] - CSV generation
    ├── DXFExportGenerator.ts  [NEW] - DXF generation
    └── types.ts                [NEW] - Shared types
```

---

## 🔧 Dependencies to Add

```bash
npm install dxf-writer qrcode
# Optional: npm install jsbarcode
```

---

## 🚀 Quick Start Commands

### 1. Enhanced Cutting List Report
```typescript
// Component usage
<CuttingListReport
  project={project}
  optimization={optimization}
  branding={branding}
  language="en"
  onExport={(format) => handleExport(format)}
/>
```

### 2. Accessories Report
```typescript
<AccessoriesReport
  project={project}
  accessories={accessories}
  pricing={pricing}
  language="en"
/>
```

### 3. Glass Report
```typescript
<GlassReport
  project={project}
  glazing={glazing}
  language="en"
/>
```

### 4. Export Service
```typescript
import { ExportService } from '@/lib/exports/ExportService';

const exportService = new ExportService();

// Single export
const blob = await exportService.export(
  data,
  'pdf',
  { type: 'cutting_list', branding, language: 'en' }
);

// Batch export
const blobs = await exportService.exportBatch(
  projects,
  'pdf',
  options
);
```

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Create `src/lib/exports/` directory
- [ ] Create `ExportService.ts` with basic structure
- [ ] Create `CuttingListGenerator.ts`
- [ ] Enhance `PDFExportService.ts` (or create `PDFExportGenerator.ts`)
- [ ] Set up types in `types.ts`

### Week 2: Core Reports
- [ ] Implement `CuttingListReport.tsx`
- [ ] Implement `AccessoriesReport.tsx`
- [ ] Implement `GlassReport.tsx`
- [ ] Create `CSVExportGenerator.ts`
- [ ] Integrate with `ReportEngine.tsx`

### Week 3: Advanced Features
- [ ] Create `DXFExportGenerator.ts`
- [ ] Add batch export to `ExportService`
- [ ] Add progress tracking
- [ ] Add QR code generation
- [ ] Template system (optional)

### Week 4: Polish
- [ ] Add translations (`locales/*/reports.json`)
- [ ] RTL support for Arabic
- [ ] Print styles
- [ ] Unit tests
- [ ] Documentation

---

## 🔑 Key Interfaces

### ExportService
```typescript
class ExportService {
  export(data, format, options): Promise<Blob>
  exportBatch(items, format, options): Promise<Blob[]>
  onProgress(callback): void
  cancel(): void
}
```

### CuttingListGenerator
```typescript
class CuttingListGenerator {
  processCuttingPlan(optimization): ProcessedCuttingPlan
  calculateStatistics(plan): CuttingStatistics
  generateDiagramData(plan): DiagramData
  formatForPDF(data): PDFData
  formatForCSV(data): CSVData
  formatForDXF(data): DXFData
}
```

### Report Components Props
```typescript
interface CuttingListReportProps {
  project: WindowUnit
  optimization: OptimizationResult
  branding?: CompanyBranding
  language?: 'en' | 'tr' | 'ar'
  onExport?: (format: 'pdf' | 'csv' | 'dxf') => void
}
```

---

## 🌍 Localization Keys

### Translation File: `locales/{lang}/reports.json`

```json
{
  "cutting_list": {
    "title": "Cutting List Report",
    "profile": "Profile",
    "stock_length": "Stock Length",
    "utilization": "Utilization"
  },
  "accessories": {
    "title": "Accessories & Hardware Report",
    "category": "Category",
    "quantity": "Quantity"
  },
  "glass": {
    "title": "Glass & Glazing Report",
    "type": "Glass Type",
    "dimensions": "Dimensions"
  },
  "export": {
    "pdf": "Export PDF",
    "csv": "Export CSV",
    "dxf": "Export DXF"
  }
}
```

---

## 🔗 Integration Points

### 1. With Phase 1 (Profiles & Pricing)
```typescript
import { useFabricatorProfiles } from '@/lib/supabase/fabricatorClient';
import { PricingEngine } from '@/lib/pricing/PricingEngine';

// Use in reports
const { profiles } = useFabricatorProfiles();
const pricingEngine = new PricingEngine(config);
```

### 2. With Cutting Optimization
```typescript
// Reports consume optimization results
<CuttingListReport 
  project={project}
  optimization={optimizationResult}
/>
```

### 3. With ReportEngine
```typescript
// Add new types
type ReportType = 
  | 'quotation' 
  | 'cutting_list' 
  | 'accessories'
  | 'glass'
  | 'complete';
```

---

## 🧪 Testing Quick Reference

### Unit Tests
```typescript
// Test generators
describe('CuttingListGenerator', () => {
  it('processes cutting plan correctly', () => {});
  it('calculates statistics', () => {});
});

// Test exporters
describe('PDFExportGenerator', () => {
  it('generates valid PDF', async () => {});
  it('includes branding', async () => {});
});
```

### Integration Tests
- Export service with real data
- Batch export functionality
- Progress tracking
- Error handling

---

## 📊 Success Criteria

✅ **Functional:**
- All 3 report types work
- All 3 export formats work
- Multi-language (EN, TR, AR)
- Branding integration
- Batch export

✅ **Performance:**
- PDF: < 3 seconds
- CSV: < 1 second
- DXF: < 2 seconds

✅ **Quality:**
- Files open correctly in target apps
- Print-ready
- Matches design specs

---

## 🐛 Common Issues & Solutions

### Issue: PDF not generating
**Solution:** Check pdf-lib initialization, ensure async/await

### Issue: CSV has encoding problems
**Solution:** Use UTF-8 BOM for Excel compatibility

### Issue: DXF not opening in AutoCAD
**Solution:** Check DXF version (R12 or R2000), verify entity structure

### Issue: RTL text not displaying correctly
**Solution:** Use proper RTL fonts, reverse table columns

---

## 📚 Additional Resources

- [DXF Format Reference](http://paulbourke.net/dataformats/dxf/)
- [PDF-lib Documentation](https://pdf-lib.js.org/)
- [CSV RFC 4180](https://tools.ietf.org/html/rfc4180)
- [i18next Documentation](https://www.i18next.com/)

---

## 🎯 Next Steps After Phase 2

- Phase 3: Advanced Design & Visualization
- Phase 4: Advanced Optimization
- Email report delivery
- Cloud storage integration
- Report scheduling

---

**Quick Command Reference:**
```bash
# Install dependencies
npm install dxf-writer qrcode

# Run tests
npm run test

# Type check
npm run type-check

# Build
npm run build
```

---

**Ready to build! 🚀**

