# AIM 3410 Machine Set Configuration

## Overview

This machine set configuration is based on the extracted AIM 3410 Technical File PDF. It ensures **exact alignment** with:

1. **AIM 3410 Technical Specifications**: All working capacity, spindle, and feed rate specifications
2. **ISO G-code Programming**: Complete G-code command set
3. **AIMCAM Programming System**: Macro program support
4. **Optimization Tab Generator**: Integrated with the cutting optimization engine

## Files Created

1. **`src/lib/machines/AIM3410MachineSet.ts`** - TypeScript definitions, G-code generation, and macro utilities
2. **`src/lib/machines/AIM3410MachineSet.json`** - JSON configuration file
3. **`src/lib/exports/machineProfiles.ts`** - Updated with AIM 3410 profile registration

## Machine Specifications

### Working Capacity
- **X-axis**: 3,200 mm
- **Y-axis**: 300 mm (top + back side surface)
- **Z-axis**: 260 mm
- **A-axis**: -95° to +95°

### Electro Spindle
- **Max Speed**: 24,000 RPM
- **Max Power S1**: 7.5 kW
- **Max Power S6**: 9 kW
- **Tool Holder**: HSK F63

### Automatic Tool Magazine
- **Capacity**: 8 tools (7 cutters + 1 saw blade)
- **Type**: Mobile with bridge
- **Max Saw Diameter**: 180 mm
- **Max Tool Weight**: 3 kg

### Feed Rates
- **X-axis**: 60 m/min
- **Y-axis**: 50 m/min
- **Z-axis**: 50 m/min
- **A-axis**: 72°/sec

### Servo Motors
- **X-axis**: 1 kW
- **Y-axis**: 1 kW
- **Z-axis**: 1 kW
- **A-axis**: 0.75 kW

### Profile Clamping
- **Standard Clamps**: 4
- **Max Optional Clamps**: 2 (total: 6)
- **Automatic Positioning**: Yes (via CAMPROX software)

## ISO G-code Commands

### Motion Commands
- `G00` - Rapid positioning
- `G01` - Linear interpolation
- `G02` - Circular interpolation clockwise
- `G03` - Circular interpolation counterclockwise
- `G04` - Dwell

### Coordinate System
- `G17` - XY plane selection
- `G18` - XZ plane selection
- `G19` - YZ plane selection
- `G20` - Inch units
- `G21` - Metric units
- `G28` - Return to reference point
- `G53` - Machine coordinate system
- `G54-G59` - Work coordinate systems

### Positioning Modes
- `G90` - Absolute positioning
- `G91` - Incremental positioning
- `G92` - Set work coordinate system

### Feed Rate Modes
- `G93` - Inverse time feed rate
- `G94` - Feed rate per minute
- `G95` - Feed rate per revolution

### Canned Cycles
- `G80` - Cancel canned cycle
- `G81` - Drilling cycle
- `G82` - Drilling cycle with dwell
- `G83` - Peck drilling cycle
- `G84` - Tapping cycle
- `G85-G89` - Boring cycles

## M-codes

- `M00` - Program stop
- `M01` - Optional stop
- `M02` - Program end
- `M03` - Spindle clockwise
- `M04` - Spindle counterclockwise
- `M05` - Spindle stop
- `M06` - Tool change
- `M07` - Coolant mist on
- `M08` - Coolant flood on
- `M09` - Coolant off
- `M30` - Program end and rewind
- `M98` - Subprogram call
- `M99` - Subprogram end / return

## Macro Programs

### Supported Macro Types
1. **Mill Slot** - Mill a slot in the profile
2. **Drill Hole** - Drill a hole in the profile
3. **Saw Cut** - Cut profile with saw blade (tool 8)
4. **Clamp Position** - Automatically position clamps (via CAMPROX)

### Macro Features
- Automatic G-code generation from parameters
- Tool parameter integration
- Clamp positioning automation
- Profile reference point support
- Speed and feed rate customization

## AIMCAM Programming

The AIMCAM program allows:
- **Programming special milling operations**
- **The ability to use saw**
- **Automatic clamp handling before operation**
- **Automatic clamp handling during operation**
- **Customer-specific graphic drawings**
- **Automatic G-code creation**

## CNC Control System

### Hardware
- **CPU**: Intel Atom E3815
- **CPU Speed**: 1460 MHz, single core
- **RAM**: 1 GB DDR3 SDRAM
- **Cache**: 512 kB L2
- **USB**: 1x USB3.0, 1x USB2.0
- **Display**: 15'' Colorful touch screen
- **Control Board**: Speed control board for 4 axes and spindle

### Software Features
- Displaying position of axes on screen
- Clamp control
- Rotational speed of spindle display
- Manual control of axes
- Automatic cooling control
- Profile support control
- Machine safety cover control

### Tables
- **Tool Table**: Storing tool parameters and offsets
- **CNC Setting Tables**: Machine parameters for maintenance
  - Axial length
  - Origins
  - Number of clamps
  - Number of magazines
  - Correction values

## Usage in Optimization Tab

The machine set is registered in `machineProfiles.ts` with ID: `yilmaz_aim_3410`

### Example Usage:

```typescript
import { 
  AIM3410_CONFIG, 
  AIM3410_MACROS,
  generateAIM3410Program,
  validateAIM3410GCode,
  AIM3410ToolTableEntry
} from '@/lib/machines/AIM3410MachineSet';

// Define tool table
const toolTable: AIM3410ToolTableEntry[] = [
  {
    toolNumber: 1,
    toolName: 'Ø5mm Cutter',
    toolType: 'cutter',
    diameter: 5,
    length: 50,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    spindleSpeed: 24000,
    feedRate: 1000,
    maxDepth: 20,
    material: 'aluminum',
  },
  // ... more tools
];

// Generate program with macros
const program = generateAIM3410Program(
  [
    {
      macro: AIM3410_MACROS.find(m => m.id === 'drill_hole')!,
      parameters: {
        x: 100,
        y: 150,
        z: 10,
        diameter: 8,
        depth: 15,
        toolNumber: 1,
      },
    },
  ],
  toolTable
);

// Validate G-code
const validation = validateAIM3410GCode(program);
if (!validation.valid) {
  console.error('G-code errors:', validation.errors);
}
```

## Integration Points

1. **Optimization Engine**: Machine set is available in the optimization tab generator
2. **G-code Export**: Direct export to G-code format with ISO standard
3. **Macro Generation**: Automatic generation of macro programs
4. **Tool Selection**: Automatic tool selection based on operation type
5. **Clamp Positioning**: Automatic clamp positioning via CAMPROX

## Operations Supported

- Multi-piece operations (holes, slots, notching, saw blade cuts)
- Milling on top + side faces + end (1+2+2)
- Saw cutting on top + side faces + ends (1+2+2)
- Special milling operations
- Automatic clamp handling
- Profile positioning

## Features

- ✅ 4-axis CNC motion
- ✅ Automatic tool magazine (8 tools)
- ✅ Automatic clamp recognition and positioning
- ✅ PLC controlled spray tool cooling
- ✅ ISO G-code programming language
- ✅ AIMCAM programming software
- ✅ Macro program support
- ✅ Remote connection capability
- ✅ USB program import
- ✅ Multi-language support

## Validation

The configuration ensures:
- ✅ All G-code commands are ISO standard
- ✅ Macro programs are fully supported
- ✅ Tool table integration
- ✅ Clamp positioning automation
- ✅ Integration with optimization tab generator
- ✅ G-code validation against machine limits

## Next Steps

1. Use `yilmaz_aim_3410` as the machine ID in the optimization tab
2. Generate G-code programs directly
3. Use macro programs for common operations
4. Tool selection is automatic based on operation type
5. Clamp positioning is automatic via CAMPROX

---

*Configuration created based on extracted AIM 3410 Technical File PDF*

