# Wizard Engine - Activation Requirements

> **Status:** DORMANT  
> **Truth Domain:** Process Truth (AICS-001 §6.3.4)  
> **Last Updated:** 2026-01-18

---

## Components Preserved

| File | Size | Purpose |
|------|------|---------|
| `EducationalValidationGate.tsx` | 13KB | Educational mode validation |
| `OptimizationCheck.tsx` | 13KB | Optimization verification |
| `ProductionQueue.tsx` | 6KB | Production queue management |
| `WizardModeWrapper.tsx` | 26KB | Wizard flow container |

---

## Constitutional Barrier

Wizard components imply **flow control** and **state transitions**. Under AICS-001 §6.3.4, these require explicit Process Truth authority.

### Why Dormant

Wizards can:
- Skip validation steps (§3.6 violation risk)
- Imply implicit decisions (§5.2 subordination risk)
- Control execution flow (§2.7 execution boundary risk)

### Activation Requirements

#### 1. Process Truth Canon Integration

- [ ] Define explicit step dependencies
- [ ] Map each step to truth domain
- [ ] Identify mandatory vs optional steps

#### 2. Validation Gate at Each Step

```typescript
// Each wizard step requires:
interface WizardStep {
  id: string;
  truthDomain: 'geometry' | 'material' | 'machine' | 'process' | 'certification';
  validationEnvelope: ValidationEnvelope;
  cannotSkip: boolean;
  auditRequired: boolean;
}
```

#### 3. Integration with EngineeringBay Personas

**Target:** Wire to persona-based UI in EngineeringBay

| Persona | Wizard Access |
|---------|--------------|
| Owner | Full wizard flow |
| Fabricator | Production-only steps |
| Accountant | Read-only view |

---

## Activation Priority: MEDIUM

These components support educational and guided workflows. Activation recommended after core constitutional framework is stable.
