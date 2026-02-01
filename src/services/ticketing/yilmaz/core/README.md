# YILMAZ Core Services

This directory contains core infrastructure components for the YILMAZ service analytics system.

## Components

### YilmazTelemetrySimulator.ts

**Purpose**: Generate realistic telemetry data for testing and demos without real sensors ($0 hardware budget).

**Features**:
- Simulates 3 YILMAZ machines (AIM 4410, AIM 7510, ALM 6510)
- Egypt-specific environmental patterns:
  - Khamsin dust storms (March-May)
  - Summer heat (June-September, 40°C+)
  - Voltage fluctuations (Egyptian grid)
- Time-of-day variations (business hours vs. off-hours)
- Location-specific patterns (Cairo, Alexandria, Giza)
- Automatic symptom generation based on readings

**Usage**:
```typescript
import { yilmazTelemetrySimulator } from '@/services/ticketing/yilmaz';

// Generate telemetry for a specific machine
const telemetry = yilmazTelemetrySimulator.generateTelemetry('YIL-2019-07812');

// Force specific conditions for testing
const khamsinTelemetry = yilmazTelemetrySimulator.generateTelemetry(
  'YIL-2019-07812',
  { forceKhamsin: true, forceOverheating: true }
);

// Convert to technician input for rules engine
const technicianInput = yilmazTelemetrySimulator.toTechnicianInput(telemetry);

// Feed into rules engine
const ruleResult = yilmazEgyptRulesEngine.executeRules(technicianInput);
```

### YilmazSimulationDemo.ts

**Purpose**: Full end-to-end demo of the Wave 3 system.

**Demos**:
1. **Khamsin Season** — Dust storm scenario with filter recommendations
2. **Voltage Fluctuation** — Egypt grid instability with AVR recommendation
3. **Summer Overheating** — High temperature scenario with cooling upgrade
4. **Fleet-Wide** — All machines analyzed simultaneously

**Usage**:
```typescript
import { runYilmazSimulationDemo } from '@/services/ticketing/yilmaz/core/YilmazSimulationDemo';

// Run all demos
await runYilmazSimulationDemo();

// Or run individual demos
import { demoKhamsinSeason, demoVoltageFluctuation } from '@/services/ticketing/yilmaz/core/YilmazSimulationDemo';
await demoKhamsinSeason();
await demoVoltageFluctuation();
```

**CLI Usage**:
```bash
# Run demo from command line
npx tsx src/services/ticketing/yilmaz/core/YilmazSimulationDemo.ts
```

## Constitutional Compliance

Both components are **Tier 1** (Testing Infrastructure) under AICS-001 §8:
- ✅ **No Authority**: Simulation only, no autonomous actions
- ✅ **Feeds Tier 3**: Output goes through deterministic rules engine
- ✅ **Human Validation**: All advisories require technician approval
- ✅ **No Bypass**: Cannot override constitutional governance

## Simulated Machines

| Machine | Serial | Model | Year | Location | Customer |
|---------|--------|-------|------|----------|----------|
| YILMAZ-AIM-4410-2019 | YIL-2019-07812 | AIM_4410 | 2019 | Cairo | MetalWorks Egypt |
| YILMAZ-AIM-7510-2020 | YIL-2020-05234 | AIM_7510 | 2020 | Alexandria | Precision Aluminum |
| YILMAZ-ALM-6510-2024 | YIL-2024-01103 | ALM_6510 | 2024 | Giza | Modern Windows |

## Simulation Parameters

### Environmental Patterns

- **Khamsin Season**: March-May (Dust level 3-5)
- **Summer Heat**: June-September (Ambient 35-44°C)
- **Voltage Range**: 190-240V (Egypt grid instability)
- **Business Hours**: 8:00-17:00 (Higher operating load)

### Sensor Ranges

- **Hydraulic Pressure**: 110-160 bar (Normal: 140-160)
- **Spindle Temperature**: 50-90°C (Normal: <70)
- **Input Voltage**: 190-240V (Normal: 220±10)
- **Dust Level**: 1-5 (Warning: ≥3)
- **Ambient Temperature**: 20-45°C (Summer: 35-44)

## Testing Use Cases

### Test Case 1: Khamsin Dust Storm
```typescript
const telemetry = yilmazTelemetrySimulator.generateTelemetry(
  'YIL-2019-07812',
  { forceKhamsin: true }
);
// Expected: Rule YIL-EGY-001 (Dust Clog) with filter parts
```

### Test Case 2: Voltage Fluctuation
```typescript
const telemetry = yilmazTelemetrySimulator.generateTelemetry(
  'YIL-2020-05234',
  { forceVoltageIssue: true }
);
// Expected: Rule YIL-EGY-002 (Voltage Instability) with AVR
```

### Test Case 3: Summer Overheating
```typescript
const telemetry = yilmazTelemetrySimulator.generateTelemetry(
  'YIL-2024-01103',
  { forceSummer: true, forceOverheating: true }
);
// Expected: Rule YIL-EGY-003 (Summer Overheating) with cooler
```

## Integration with Real Sensors (Future)

When real sensors are available, replace the simulator with actual telemetry:

```typescript
// Before (Simulated)
const telemetry = yilmazTelemetrySimulator.generateTelemetry('YIL-2019-07812');

// After (Real Sensors)
const telemetry = await yilmazRealTelemetryService.fetchTelemetry('YIL-2019-07812');

// Same interface, same downstream processing
const technicianInput = telemetryToTechnicianInput(telemetry);
const advisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);
```

## Notes

- ✅ Simulator is **Tier 1** — No authority, testing only
- ✅ All simulated data is marked with `simulationNote` field
- ✅ Output format matches real sensor interface
- ✅ Safe for production (cannot trigger actual actions)
- ✅ Useful for training, demos, and integration testing
