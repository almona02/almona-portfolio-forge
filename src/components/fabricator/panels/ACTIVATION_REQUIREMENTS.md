# Advisory Panels - Activation Requirements

> **Status:** DORMANT  
> **Tier:** Tier 2 (Advisory - AICS-001 §5.10.2)  
> **Last Updated:** 2026-01-18

---

## Components Preserved

| File | Size | Purpose |
|------|------|---------|
| `AISuggestionPanel.tsx` | 8KB | AI-driven suggestions |
| `DesignModeComparison.tsx` | 9KB | Mode comparison view |
| `DesignModeSelector.tsx` | 11KB | Mode selection UI |
| `OptimizationJobMonitor.tsx` | 8KB | Job monitoring |
| `ConstitutionalHealthDashboard.tsx` | 10KB | Governance health |
| `JobRiskIndicator.tsx` | 6KB | Risk assessment |
| `VirtualizedAnalyticsList.tsx` | 2KB | Analytics rendering |

---

## Tier 2 Activation Requirements

These components are **advisory-only** and must:
1. Never mutate state directly
2. Show confidence/uncertainty
3. Pass through IntelligenceGate

### Required Wrapper

```typescript
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

// All advisory panels must use:
const AdvisoryComponent = IntelligenceGate.tier2(
  () => import('@/future/advisory-panels/AISuggestionPanel'),
  { 
    readOnly: true,
    showConfidence: true,
    noStateWrite: true
  }
);
```

---

## Activation Priority: HIGH

These components support decision-making without execution authority. Recommended for activation after IntelligenceGate wiring infrastructure is complete.

**Fast-Track Candidates:**
- `ConstitutionalHealthDashboard.tsx` → Settings page
- `JobRiskIndicator.tsx` → Workflow validation
