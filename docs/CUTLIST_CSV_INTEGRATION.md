# Cut List CSV

## Fabricator cut list CSV (CutListExport)

- **Format**: Comma-delimited. One row per cut line (aggregated by bar/profile/role/length/angle; quantity in column).
- **Columns**: `Bar`, `Profile`, `Role`, `Length_mm`, `Angle_deg`, `Position_mm`, `Waste_mm`, `Qty`
- **No placeholders**: Only real data. Profile names with commas/quotes are escaped.
- **Usage**: CutListViewer / AlmonaCutListViewer → Export CSV → `exportCutListToCSV(cutList, projectName)` → download.

## Drafting cut list (MachineExportService)

- **Location**: `src/components/fabricator/drafting/` — CutListPanel uses CutListGenerator + MachineExportService.generateYilmazCSV for “Yilmaz CSV” (semicolon, 550PB template columns).
- Use that flow when you need the exact machine template for Yılmaz DC 421/550 import.

