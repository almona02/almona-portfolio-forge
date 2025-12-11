# Profile Information Extraction Summary

## Files Processed

1. **ALM PIM TEST PVC.mdb** - Microsoft Access Database
2. **ALM 6510 Alüminyum Profile Process_Eng.pdf** - Process Documentation PDF

---

## MDB File Extraction Results

### Database Structure
- **Table Name**: `Table1`
- **Total Rows**: 15
- **Columns**: 35 fields

### Key Columns Extracted:
- `PROGRAM_NO` - Program number
- `CUSTOMER_CODE` - Customer identifier (e.g., "C4-0006")
- `CUSTOMER_NAME` - Customer name (mix of Cyrillic and Latin)
- `STOCK_CODE` - Stock/item code (e.g., "000000716CF00001")
- `STOCK_NAME` - Stock name (e.g., "тест PIM 90гр", "Тест ALM 90гр")
- `ORDER_NO` - Order number (e.g., "400006")
- `LENGTH` - Profile length in mm (e.g., "10000", "5000", "4000", "9000")
- `FRAME_X`, `FRAME_Y` - Frame dimensions
- `LEFT_ANGLE`, `RIGHT_ANGLE` - Cutting angles (typically 900 = 90°)
- `HEIGHT`, `WIDTH` - Profile dimensions
- `CODE` - Operation codes (CNC operation sequences)
- `IMAGE` - Image file paths (e.g., "IMAGE\\S4000064960.BMP")

### Sample Data Insights:
- **Profile Types**: Mix of PVC (PIM) and Aluminum (ALM) profiles
- **Angles**: Mostly 90° cuts (900 in the format)
- **Dimensions**: Various sizes from 4000mm to 10000mm lengths
- **Operations**: Contains CNC operation codes with tool references (P7T10, P7T30, P7T50, etc.)
- **Frame Configurations**: Multiple frame types (KASA, РАМА БРУСБОКС, etc.)

### Operation Code Format:
The `CODE` field contains sequences like:
```
P7T10X250Y80Z350D20//P7T30X250Y200Z700D20//P7T50X250Y360Z350D20//P7T70X250Y200Z0D20
```
Where:
- `P7` = Operation type (Marking)
- `T10`, `T30`, `T50`, `T70` = Tool numbers
- `X`, `Y`, `Z` = Coordinates
- `D` = Depth
- `//` = Operation separator

---

## PDF File Extraction Results

### Document Information
- **Title**: ALM 6510 Alüminyum Profile Process_Eng
- **Pages**: 11
- **Author**: Microsoft
- **Total Text**: 8,739 characters

### Document Content Summary:

#### Page 1: Overview
- Machine capabilities and operations:
  - Slot for lock
  - Espagnolette slot with radius
  - Water drain slot
  - Left barrel hole
  - Right barrel hole
  - Drill hole
  - Marking

- **Dimensioning Format**: 
  - Length 1200.5 mm → entered as 12005
  - Angle 45.4° → entered as 454

#### Pages 2-8: Operation Codes

**P1: Slot for lock**
- Tool: T50
- Format: `P1T50X12000 Y300Z600L1760 W175D200//`
- Parameters: X, Y, Z coordinates, L (length), W (width), D (depth)

**P2: Espagnolette Channel (Slot)**
- Tools: T50 or T51 (depending on slot width)
- Format: `P2T50X12000 Y300Z600L1000 W150R75D200//`
- Additional parameter: R (radius)

**P3: Water Drain**
- Tools: T70 (inner), T60/T20 (outer/inner depending on profile type)
- Format: `P3T70X1200 Y300Z600L400D200//`
- Parameters: X, Y, Z, L (length), D (depth)

**P4: Left Barrel**
- Tools: T30, T32 (top), T60 (bottom)
- Format: `P4T32X12000 Y300Z600L330W100C170D650//`
- Parameters: L (length), W (width), C (diameter), R (radius), D (depth)
- Tool selection based on depth: D ≤ 70 = T32, D > 70 = T32+T60

**P5: Right Barrel**
- Tools: T30, T31 (top), T70, T71 (bottom)
- Format: `P5T32X12000 Y300Z600L330W100C170D600//`
- Similar parameters to P4

**P6: Drill (hole)**
- Tools: T30, T31 (top), T60 (bottom)
- Format: `P6T30X12000 Y300Z600C180D250//`
- Parameters: C (diameter), D (depth)
- Tool selection based on depth and diameter

**P7: Marking and drilling**
- Tools: T10, T20, T30, T40, T50, T60
- Format: `P7T50X400Y0Z60D30//`
- Used for hinge marking operations

#### Pages 9-11: Measurement and Positioning Guidelines

**Page 9**: How to measure height and width of profiles
- Frame Profiles: Height and width measurement reference points
- Sash Profiles: Height and width measurement reference points

**Page 10-11**: Profile positioning on machine
- Window Frame profile orientation
- Window/Door Frame profiles
- Window/Door Sash profiles (opening outwards)
- Sliding Frame Profile
- Sliding Window/Door Frame Profile
- Mullion Profile

---

## Key Findings

### MDB Data:
1. **Production Data**: Contains actual production orders with cutting specifications
2. **Mixed Materials**: Both PVC (PIM) and Aluminum (ALM) profiles
3. **Operation Codes**: Detailed CNC operation sequences embedded in CODE field
4. **Multi-language**: Customer names in Cyrillic and Latin scripts

### PDF Documentation:
1. **Process Manual**: Complete operation code reference for ALM 6510 profile
2. **Tool Reference**: Detailed tool selection (T10-T71) for different operations
3. **Coordinate System**: X, Y, Z coordinate system with reference points
4. **Format Standards**: Specific number format (no decimal point, multiply by 10)

### Integration Points:
- The MDB `CODE` field uses the same operation codes (P1-P7) documented in the PDF
- Tool numbers (T10, T30, T50, etc.) match between MDB data and PDF documentation
- Coordinate system (X, Y, Z) is consistent across both files

---

## Extracted Files

- **Full JSON**: `extracted_info.json` - Complete structured data
- **This Summary**: `EXTRACTION_SUMMARY.md`

---

## Next Steps

1. **Parse MDB CODE fields** to extract individual operations
2. **Map operations** to PDF documentation for validation
3. **Create profile templates** based on common configurations
4. **Integrate operation codes** into CNC generation system

