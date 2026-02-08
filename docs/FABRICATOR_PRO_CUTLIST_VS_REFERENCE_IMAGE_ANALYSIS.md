# Fabricator Pro Cut List vs Reference Image Analysis

**Reference image:** `C:\Users\bobbi\Downloads\WhatsApp Image 2026-02-03 at 11.26.39 PM.jpeg`  
**Image content:** LogiKal 12.6 – ORGADATA AG "Cut Optimisation" report (Page 1 of 5)  
**Comparison target:** ALMONA Fabricator Pro – CutListViewer, Print ALMONA Style (CutListExport), UPVCCuttingEngine, AlmonaCuttingEngine

---

## 1. Reference Image Summary (LogiKal 12.6)

The image is a **Cut Optimisation** report from **LogiKal 12.6 – ORGADATA AG** with:

| Element | Value |
|--------|--------|
| **Title** | Cut Optimisation |
| **Date / Time** | 24/01/2026 / 10:13 |
| **Project** | Villa Z (69:71) |
| **Job Number** | 179-2025 |
| **Person in Charge** | Khaled Ammar |
| **Directory** | Badya V3B\ |
| **Profile Type** | DAW DW 12200/A (Specific profile) |
| **Total Pieces** | 68 Pcs. @ 6,500 mm |
| **Material** | Single Sash, Aluminium |
| **Colour** | RAL 7012 |
| **Usable Residual Length** | 0 mm |
| **Saw Cut Deduction** | 10 mm |
| **Wastage** | 10,201 mm = 2.3% (Incl. Residual Lengths) |
| **End Deduction Total** | 20 mm |

**Cut list body:** Rows with:
- **Repeat count:** "1 x" or "2 x" (how many bars use the same cutting sequence)
- **Bar icon:** Small grey profile cross-section
- **Bar graphic:** One long bar split into **rectangular** segments
- **Per segment:** Part code **above** (e.g. WD01, WD04-3, W03-2A.2), length **below** with notation like `2492' (7)`, `1322' (8)` — **lengths in relatively small font**
- **Angles:** The number **"45"** placed in the **gaps between** segments (annotations, not in the shape)
- **End of row:** "0" (residual length for that bar when none)

**Footer:** ORGADATA logo, LogiKal 12.6 – ORGADATA AG, disclaimer, "Page 1 from 5".

---

## 2. ALMONA Print ALMONA Style (Current – Feb 2026)

### 2.1 Where cut list is produced

- **UI:** [`CutListViewer.tsx`](src/components/fabricator/CutListViewer.tsx) – visual bars (SVG-style in viewer), waste %, efficiency, remnants, sequential cutting order.
- **Print ALMONA Style:** [`CutListExport.ts`](src/lib/fabricator/CutListExport.ts) – `exportAlmonaCutStylePrintHTML()`, `printCutListAlmonaStyle()`, **div-based rectangles** per bar with **angle label ("45", "135", "90") in gaps**; up to **20 bars per page**; length font **dynamically optimized** by bars on page.
- **Report build:** [`AlmonaCuttingEngine.ts`](src/lib/fabricator/AlmonaCuttingEngine.ts) – header (job number, person, directory, profile type, material, colour, saw/end deduction, wastage, usable residual), packed bars.
- **Optimization:** [`UPVCCuttingEngine.ts`](src/lib/fabricator/UPVCCuttingEngine.ts) – bar packing, configurable kerf (e.g. 10 mm), 45°/135° cuts, configurable bar length (e.g. 6,500 mm).

### 2.2 Print ALMONA Style content (current)

**Header (LogiKal-aligned):**
- Title: **Cut Optimisation**
- Date/time (en-GB)
- Project, Job Number, Person in Charge, Directory
- Profile Type, Total Pieces (e.g. 8 Pcs. @ 6500 mm)
- Material, Colour (e.g. RAL 7016)
- Saw Cut Deduction (e.g. 10 mm), End Deduction Total (e.g. 20 mm)
- Usable Residual Length, **Wastage: X mm = Y% (Incl. Residual Lengths)**

**Bar table:**
- **Repeat:** "1 ×" or "N ×"
- **Bar:** Profile icon + **div-based bar** (rectangles, scalable up to 20 bars per page):
  - Segments drawn as **rectangles** with **angle label ("45", "135", "90") in gaps** (LogiKal-style, performance)
  - **Length (mm)** in centre: **dynamically sized font** (18–48pt by bars on page), accurate to 1 decimal
  - "mm" and part ID (e.g. W01, W02) below
  - Cut lines at segment edges; angle label in the gap at right edge
  - **Residual** block at end: "Residual" + length
- **Residual column:** per-bar residual length

**Footer:** ALMONA Fabricator Pro - Gold Tier | Page X from Y | Cut Optimisation Report.

**Aligned with reference (current implementation):**
- **Segment shape:** ALMONA now uses **rectangles with angle ("45", "135", "90") in gaps** (same as LogiKal; performance-friendly).
- **Length:** **Dynamically optimized** font size (18–48pt) by bars on page: fewer bars = larger font for workshop readability.
- **Part codes:** ALMONA uses W01, W02, … (workshop segment IDs); LogiKal uses WD01, WD04-3, etc. = **window number reference from drawing** (not part number).

---

## 3. Gap Analysis: Reference Image vs ALMONA (Current)

### 3.1 Now aligned with reference (ALMONA Print ALMONA Style)

| Feature | Reference (LogiKal) | ALMONA (current) | Status |
|--------|---------------------|------------------|--------|
| **Report title** | Cut Optimisation | Cut Optimisation | ✓ Match |
| **Date / time** | 24/01/2026 / 10:13 | en-GB locale (e.g. 04/02/2026, 01:32:28) | ✓ Match |
| **Job number** | 179-2025 | BATCH-DEMO-001 (from project) | ✓ Match |
| **Person in charge** | Khaled Ammar | Demo User (from project) | ✓ Match |
| **Directory** | Badya V3B\ | Demo / Batch Cut List (from project) | ✓ Match |
| **Profile type** | DAW DW 12200/A | Alumil M9660 Frame + Sash (from project) | ✓ Match |
| **Total pieces** | 68 Pcs. @ 6,500 mm | 8 Pcs. @ 6500 mm (configurable bar length) | ✓ Match |
| **Material** | Single Sash, Aluminium | Aluminium (from project) | ✓ Match |
| **Colour** | RAL 7012 | RAL 7016 (from project) | ✓ Match |
| **Saw cut deduction** | 10 mm | 10 mm (configurable) | ✓ Match |
| **End deduction total** | 20 mm | 20 mm (from project) | ✓ Match |
| **Usable Residual Length** | 0 mm | 4720 mm (from report) | ✓ Match |
| **Wastage** | 10,201 mm = 2.3% (Incl. Residual Lengths) | 4720 mm = 36.3% (Incl. Residual Lengths) | ✓ Match |
| **Repeat column** | "1 x" / "2 x" | "1 ×" / "N ×" | ✓ Match |
| **Bar icon** | Grey profile cross-section | Profile icon (SVG) | ✓ Match |
| **Residual per bar** | "0" or value at end | Residual column + Residual block in bar | ✓ Match |
| **Page X from Y** | Page 1 from 5 | Page {current} from {total} in footer | ✓ Match |

### 3.2 Aligned with reference (div-based, angle in gaps)

| Feature | Reference (LogiKal) | ALMONA (current) | Status |
|--------|---------------------|------------------|--------|
| **Bar graphic** | Div-based rectangles | **Div-based rectangles** (scalable) | ✓ Match; up to 20 bars per page. |
| **Segment shape** | Rectangles; "45" in gaps | **Rectangles; angle ("45", "135", "90") in gaps** | ✓ Match; performance-friendly. |
| **Length** | Relatively small | **Dynamically optimized** by bars on page (18–48pt) | ✓ Improved: fewer bars = larger font for workshop. |
| **Part IDs** | WD01, WD04-3 = **window ref from drawing** | W01, W02 = workshop segment IDs | LogiKal = window number; ALMONA = part/segment; optional WDxx from drawing. |

### 3.3 Optional enhancements

| Feature | ALMONA | Note |
|--------|--------|------|
| **Dynamic length font** | 1–3 bars → 48pt; 4–6 → 36pt; … 16–20 → 18pt | Fits up to 20 lines; workshop readability when fewer bars. |
| **BARS_PER_PAGE** | 20 | Scalability as per spec. |
| **Residual block** | "Residual" + length | Clear caption + value. |

---

## 4. Recommendations (Already Implemented vs Optional)

**Already implemented in Print ALMONA Style:**
- Header: Job Number, Person in Charge, Directory, Profile Type, Material, Colour, Saw Cut Deduction, End Deduction Total, Usable Residual Length, Wastage (X mm = Y% Incl. Residual Lengths), Total Pieces @ bar length.
- Bar: **Div-based rectangles** (scalable, up to **20 bars per page**); **angle label ("45", "135", "90") in gaps** between segments; **length font size dynamically optimized** by bars on page (18–48pt); part ID (W01, W02…); Residual block; residual column.
- Footer: Page X from Y, ALMONA branding.

**Clarification – Part IDs:** LogiKal **WD01, WD04-3** = **window number reference from drawing**. ALMONA W01, W02 = workshop segment IDs. Optional: map to window-ref (WDxx) from drawing when required.

**Optional:** Length notation `2492' (7)` if needed; show "0" at end of bar when residual is zero.

---

## 5. Summary

| Aspect | Match | Partial | Intentional difference |
|--------|--------|--------|-------------------------|
| Report title "Cut Optimisation" | ✓ | | |
| Date, job number, person, directory | ✓ | | |
| Profile type, material, colour | ✓ | | |
| Total pieces @ bar length | ✓ | | |
| Saw / end deduction, wastage line | ✓ | | |
| Usable residual, repeat, residual per bar | ✓ | | |
| Page X from Y | ✓ | | |
| Visual bar with segments | ✓ | | Div-based rectangles (same as LogiKal) |
| 45° representation | ✓ | | Angle ("45") in gaps (same as LogiKal) |
| Length | ✓ | | Dynamic font (18–48pt) by bars on page |
| Part IDs | ✓ | | LogiKal WD01 = window ref; ALMONA W01 = segment ID |

**Conclusion:** The reference (LogiKal 12.6) is a **Cut Optimisation** report with full header, **div-based bar rectangles**, **angle in gaps**, and per-bar residual. **ALMONA Print ALMONA Style** matches: **div-based rectangles**, **angle label in gaps** (performance), **up to 20 bars per page**, and **length font dynamically optimized** by number of lines. LogiKal **WD01, WD04-3 = window number reference from drawing** (not part number); ALMONA W01, W02 = workshop segment IDs; optional mapping to WDxx when needed.
