# Machine Labs - Activation Requirements

> **Status:** DORMANT  
> **Truth Domain:** Machine Truth (AICS-001 §6.3.3)  
> **Last Updated:** 2026-01-18

---

## Components Preserved

| File | Size | Purpose |
|------|------|---------|
| `CuttingOptimizationEngine.tsx` | 34KB | Cutting optimization logic |
| `CuttingOptimizationPanel.tsx` | 28KB | Optimization UI |
| `KioskModeDashboard.tsx` | 19KB | Production kiosk display |
| `MachiningZoneJoystick.tsx` | 24KB | Zone manual control |
| `MachineMonitoringDashboard.tsx` | 14KB | Machine status display |
| `MachineTwinDisplay.tsx` | 11KB | Digital twin visualization |

---

## Constitutional Barrier: Machine Truth Canon Required (§6.3.3)

These components interact with machine execution paths. Under AICS-001:
- Machine truth overrides optimization preferences
- Unsupported operations are non-existent
- Machine truth is versioned per machine instance

### Activation Requirements

1. **Machine Configuration Registry**
   - [ ] Per-machine capability profiles
   - [ ] Axis limits and precision envelopes
   - [ ] Supported operations list

2. **Safety Envelope Integration**
   - [ ] Wire to existing `safety/` components
   - [ ] Collision detection required
   - [ ] System stop on limit violation

3. **Deterministic Execution Only**
   - [ ] No AI in execution path (Tier 3)
   - [ ] All outputs deterministically reproducible

---

## Activation Priority: MEDIUM

Requires machine configuration infrastructure. Recommended after safety envelope hardening is complete.
