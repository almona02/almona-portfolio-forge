# ALM 6510 Machine Set Configuration

## Overview

This machine set configuration is based on the extracted MDB table structure and ALM 6510 process documentation. It ensures **exact alignment** with:

1. **MDB Table Structure**: All 37 columns from `Table1` in the extracted MDB file
2. **ALM 6510 Operation Codes**: Complete P1-P7 operation code system
3. **Optimization Tab Generator**: Integrated with the cutting optimization engine

## Files Created

1. **`src/lib/machines/ALM6510MachineSet.ts`** - TypeScript definitions and utilities
2. **`src/lib/machines/ALM6510MachineSet.json`** - JSON configuration file
3. **`src/lib/exports/machineProfiles.ts`** - Updated with ALM 6510 profile registration

## MDB Table Structure (37 Columns)

The configuration follows the exact MDB table structure:

```typescript
interface ALM6510MDBRecord {
  PROGRAM_NO: number;
  CUSTOMER_CODE: string;
  CUSTOMER_NAME: string;
  STOCK_CODE: string;
  STOCK_NAME: string;
  ORDER_NO: string;
  EXPLANATION1: string;
  EXPLANATION2: string;
  LENGTH: string;              // mm as string (e.g., "10000")
  INCH_MM: number;             // 0 = mm, 1 = inch
  FRAME_X: string;             // mm as string
  FRAME_Y: string;             // mm as string
  POSE_NO: number;
  TROLLEY: number;
  UNIT: number;
  LEFT_ANGLE: number;           // 900 = 90° (format: angle * 10)
  RIGHT_ANGLE: number;          // 900 = 90° (format: angle * 10)
  SIDE: number;                 // 1=left, 2=top, 3=right, 4=bottom
  CUTTED: number;               // 0=not cut, 1=cut
  HEIGHT: number;               // mm
  SELLER: string | null;
  IMAGE: string;                // Image path
  PAIR: number;
  BAR_NO: number;
  TOTAL_SIZE: string;           // mm as string
  PICE_NO: number;
  GRUP: string | null;
  WIDTH: number;                // mm
  TYPE: string;                 // "A" = Aluminum, "P" = PVC
  COLOR_CODE: string;
  STIL_LENGTH: string;          // mm as string
  FRAME_NO: number;
  REMAINING_LENGTH: string | null;
  CODE: string | null;          // Operation codes (P1-P7 format)
  ROBOT_Y: number;              // mm
  ROBOT_Z: number;              // mm
  ROBOT_VERTICAL: number;        // 0 or 1
}
```

## Operation Codes (P1-P7)

### P1: Slot for lock
- **Tool**: T50
- **Format**: `P1T50X12000 Y300Z600L1760 W175D200//`
- **Parameters**: X, Y, Z, L (length), W (width), D (depth)

### P2: Espagnolette Channel (Slot)
- **Tools**: T50 or T51
- **Format**: `P2T50X12000 Y300Z600L1000 W150R75D200//`
- **Parameters**: X, Y, Z, L, W, R (radius), D

### P3: Water Drain
- **Tools**: T20, T50, T60, T70
- **Format**: `P3T70X1200 Y300Z600L400D200//`
- **Parameters**: X, Y, Z, L, D

### P4: Left Barrel
- **Tools**: T30, T32, T60
- **Format**: `P4T32X12000 Y300Z600L330W100C170D650//`
- **Parameters**: X, Y, Z, L, W, C (diameter), R, D

### P5: Right Barrel
- **Tools**: T30, T31, T32, T60, T70, T71
- **Format**: `P5T32X12000 Y300Z600L330W100C170D600//`
- **Parameters**: X, Y, Z, L, W, C, R, D

### P6: Drill (hole)
- **Tools**: T30, T31, T60, T70, T71
- **Format**: `P6T30X12000 Y300Z600C180D250//`
- **Parameters**: X, Y, Z, C, D

### P7: Marking and drilling
- **Tools**: T10, T11, T20, T30, T40, T50, T60, T70, T71
- **Format**: `P7T50X400Y0Z60D30//`
- **Parameters**: X, Y, Z, D

## Dimension Format

- **Length**: Multiply by 10 (1200.5 mm → 12005)
- **Angle**: Multiply by 10 (45.4° → 454)

## Usage in Optimization Tab

The machine set is registered in `machineProfiles.ts` with ID: `yilmaz_alm_6510`

### Example Usage:

```typescript
import { 
  ALM6510_CONFIG, 
  convertToALM6510MDB, 
  parseOperationCode,
  generateOperationCode 
} from '@/lib/machines/ALM6510MachineSet';

// Convert cutting plan to MDB format
const mdbRecord = convertToALM6510MDB(cuttingPlan, {
  CUSTOMER_CODE: 'C4-0006',
  ORDER_NO: '400006',
  STOCK_CODE: '000000716CF00001',
});

// Parse operation codes
const operations = parseOperationCode('P7T10X250Y80Z350D20//P7T30X250Y200Z700D20//');

// Generate operation code
const code = generateOperationCode(operations);
```

## Integration Points

1. **Optimization Engine**: Machine set is available in the optimization tab generator
2. **MDB Export**: Direct export to MDB format with exact table structure
3. **Operation Code Generation**: Automatic generation of P1-P7 operation codes
4. **Tool Selection**: Automatic tool selection based on operation type

## Machine Specifications

- **Max X Travel**: 6500 mm
- **Max Y Travel**: 1200 mm
- **Max Z Travel**: 300 mm
- **Max Profile Length**: 6500 mm
- **Min Profile Length**: 700 mm
- **Max Profile Height**: 180 mm
- **Max Profile Width**: 130 mm
- **CNC Axes**: 8
- **Spindle Speed**: 12,000 RPM

## Default Values

When creating MDB records, the following defaults are applied:

- `INCH_MM`: 0 (millimeters)
- `POSE_NO`: 1
- `TROLLEY`: 1
- `UNIT`: 1
- `LEFT_ANGLE`: 900 (90°)
- `RIGHT_ANGLE`: 900 (90°)
- `CUTTED`: 1
- `PAIR`: 1
- `BAR_NO`: 1
- `PICE_NO`: 1
- `TYPE`: 'A' (Aluminum)
- `COLOR_CODE`: '1'
- `FRAME_NO`: 1
- `ROBOT_VERTICAL`: 0

## Validation

The configuration ensures:
- ✅ All 37 MDB columns are mapped
- ✅ Operation codes (P1-P7) are fully supported
- ✅ Tool numbers (T10-T71) are configured
- ✅ Dimension format matches MDB requirements
- ✅ Integration with optimization tab generator

## Next Steps

1. Use `yilmaz_alm_6510` as the machine ID in the optimization tab
2. Export cutting plans directly to MDB format
3. Operation codes are automatically generated based on operations
4. Tool selection is automatic based on operation type and parameters

---

*Configuration created based on extracted MDB data and ALM 6510 process documentation*

