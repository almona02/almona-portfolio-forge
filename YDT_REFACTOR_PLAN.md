# YDT Intelligence Gate Refactor Plan
## Converting Architecture into Measurable Reality

**Date:** January 7, 2026  
**Status:** Execution Plan  
**Purpose:** Classify all existing YDT calls and enforce tier boundaries

---

## 🎯 REFACTOR OBJECTIVES

### Primary Goals
1. **Classify all YDT calls** by tier (Strategic, Execution, Deterministic)
2. **Remove accidental Tier 3 YDT usage** (YDT in hot paths)
3. **Enforce Tier 1 reasoning requirements** (quality, not just presence)
4. **Measure Tier 1 coverage** (% of strategic decisions using YDT)
5. **Add tier violation metrics** (early detection of architectural drift)

### Success Criteria
- ✅ 100% of Tier 1 decisions use IntelligenceGate.strategic()
- ✅ 0% of Tier 3 operations call YDT
- ✅ 100% of YDT responses include quality reasoning
- ✅ Tier violation metrics are tracked and visible

---

## 📋 FILE-BY-FILE REFACTOR PLAN

### Phase 1: Core YDT Services (Week 1-2)

#### 1.1 Pricing Services

**Files to Refactor:**
- `src/lib/pricing/YDTPricingOracle.ts`
- `src/lib/pricing/PricingEngine.ts`
- `src/lib/pricing/RealTimeQuoteCalculator.ts`

**Current State:**
```typescript
// YDTPricingOracle.ts - Direct YDT call
async calculatePriceWithYDT(project: Project, workshop: Workshop) {
  const marketPricing = await this.ydt.getMarketPricing(project, workshop.id);
  // ...
}
```

**Target State:**
```typescript
// YDTPricingOracle.ts - Tier 1: Strategic (YDT mandatory)
import { IntelligenceGate, DecisionTier } from '@/lib/ydt/IntelligenceGate';

async calculatePriceWithYDT(project: Project, workshop: Workshop) {
  return await IntelligenceGate.strategic(
    'pricing_decision',
    { project, workshop },
    async (inputs) => {
      return await this.ydt.getMarketPricing(
        inputs.project,
        inputs.workshop.id
      );
    }
  );
}
```

**Classification:** Tier 1 (Strategic)  
**Reasoning Required:** Yes (market intelligence, competitive analysis)  
**Estimated Time:** 2 hours

---

#### 1.2 Optimization Services

**Files to Refactor:**
- `src/lib/ydt/YDTOptimizationWrapper.ts`
- `src/lib/fabricator/OptimizationEngine.ts`

**Current State:**
```typescript
// YDTOptimizationWrapper.ts - Direct YDT call
async getOptimizationStrategy(context: OptimizationContext) {
  return await this.ydt.getOptimizationStrategy(context);
}
```

**Target State:**
```typescript
// YDTOptimizationWrapper.ts - Tier 1: Strategic (YDT mandatory)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

async getOptimizationStrategy(context: OptimizationContext) {
  return await IntelligenceGate.strategic(
    'optimization_strategy',
    { context },
    async (inputs) => {
      return await this.ydt.getOptimizationStrategy(inputs.context);
    }
  );
}
```

**Classification:** Tier 1 (Strategic)  
**Reasoning Required:** Yes (remnant-first vs speed-first strategy)  
**Estimated Time:** 1 hour

---

#### 1.3 Services Intelligence

**Files to Refactor:**
- `src/lib/services/YDTServiceIntelligence.ts`

**Current State:**
```typescript
// YDTServiceIntelligence.ts - Direct YDT calls
async suggestTicketAssignment(ticket: Ticket) {
  const result = await this.enforcer.validateWithYDT(
    'ticket_assignment',
    { ticket },
    async () => {
      return await this.ydtCore.analyzeTicket(ticket);
    }
  );
  // ...
}
```

**Target State:**
```typescript
// YDTServiceIntelligence.ts - Tier 1: Strategic (YDT mandatory)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

async suggestTicketAssignment(ticket: Ticket) {
  return await IntelligenceGate.strategic(
    'ticket_assignment',
    { ticket },
    async (inputs) => {
      return await this.ydtCore.analyzeTicket(inputs.ticket);
    }
  );
}
```

**Classification:** Tier 1 (Strategic)  
**Reasoning Required:** Yes (agent selection, priority assignment)  
**Estimated Time:** 1 hour

---

### Phase 2: Execution Decisions (Week 2-3)

#### 2.1 Algorithm Selection

**Files to Refactor:**
- `src/lib/ml/AlgorithmPredictor.ts`
- `src/lib/optimization/AlgorithmSelector.ts` (if exists)

**Current State:**
```typescript
// AlgorithmPredictor.ts - TensorFlow only
async predict(complexity: JobComplexity): Promise<AlgorithmPrediction> {
  // ML prediction only
  return this.mlPredict(complexity);
}
```

**Target State:**
```typescript
// AlgorithmPredictor.ts - Tier 2: Execution (YDT + TensorFlow)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';
import { YDTCoreService } from '@/lib/ydt/YDTCoreService';

async predict(
  complexity: JobComplexity,
  context?: OptimizationContext
): Promise<AlgorithmPrediction> {
  const ydt = YDTCoreService.getInstance();
  
  return await IntelligenceGate.execution(
    'algorithm_selection',
    { complexity, context },
    // YDT provides context (optional)
    async (inputs) => {
      if (!inputs.context) return null;
      return await ydt.getOptimizationStrategy(inputs.context);
    },
    // TensorFlow makes decision (required)
    async (inputs, ydtContext) => {
      return await this.mlPredict({
        ...inputs.complexity,
        strategy: ydtContext?.strategy,
        constraints: ydtContext?.constraints
      });
    }
  );
}
```

**Classification:** Tier 2 (Execution)  
**Reasoning Required:** YDT context optional, ML prediction required  
**Estimated Time:** 3 hours

---

#### 2.2 Remnant Purchase Decisions

**Files to Refactor:**
- `src/lib/ml/RemnantUsagePredictor.ts`
- `src/components/inventory/RemnantMarketplace.tsx` (if exists)

**Current State:**
```typescript
// RemnantUsagePredictor.ts - TensorFlow only
async predict(remnant: Remnant, features: RemnantFeatures) {
  return await this.predictWithML(features);
}
```

**Target State:**
```typescript
// RemnantUsagePredictor.ts - Tier 2: Execution (YDT + TensorFlow)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';
import { YDTCoreService } from '@/lib/ydt/YDTCoreService';

async predict(
  remnant: Remnant,
  features: RemnantFeatures,
  workshopLocation?: string
) {
  const ydt = YDTCoreService.getInstance();
  
  return await IntelligenceGate.execution(
    'remnant_purchase_decision',
    { remnant, features, workshopLocation },
    // YDT provides pricing context (optional)
    async (inputs) => {
      if (!inputs.workshopLocation) return null;
      return await ydt.getMarketPricing({
        type: 'remnant',
        material: inputs.remnant.material,
        location: inputs.workshopLocation
      } as any);
    },
    // TensorFlow predicts usage (required)
    async (inputs, ydtContext) => {
      return await this.predictWithML(inputs.features);
    }
  );
}
```

**Classification:** Tier 2 (Execution)  
**Reasoning Required:** YDT pricing optional, ML usage prediction required  
**Estimated Time:** 2 hours

---

### Phase 3: Deterministic Operations (Week 3)

#### 3.1 Cutting Optimization

**Files to Refactor:**
- `src/lib/fabricator/OptimizationEngine.ts`
- `src/lib/fabricator/SimplifiedOptimizationEngine.ts`

**Current State:**
```typescript
// SimplifiedOptimizationEngine.ts - Pure algorithm
optimize(cuts: Cut[], systemPackId?: string): OptimizedResult {
  // Pure algorithm - no YDT
  const correctedCuts = cuts.map(cut => this.applyCorrections(cut));
  // ...
}
```

**Target State:**
```typescript
// SimplifiedOptimizationEngine.ts - Tier 3: Deterministic (NO YDT)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

optimize(cuts: Cut[], systemPackId?: string): OptimizedResult {
  return IntelligenceGate.deterministic(
    'cutting_optimization',
    () => {
      // Pure algorithm - no YDT
      const correctedCuts = cuts.map(cut => this.applyCorrections(cut));
      const sortedCuts = this.sortByLength(correctedCuts);
      return this.packIntoBars(sortedCuts);
    }
  );
}
```

**Classification:** Tier 3 (Deterministic)  
**Reasoning Required:** No (pure math)  
**Estimated Time:** 1 hour

---

#### 3.2 Geometry Calculations

**Files to Refactor:**
- `src/lib/fabricator/geometry.ts` (if exists)
- `src/lib/fabricator/MicronOptimizationEngine.ts`

**Current State:**
```typescript
// Geometry calculations - Pure math
function calculateMiterAngle(profile1: Profile, profile2: Profile): number {
  return Math.atan2(profile1.y - profile2.y, profile1.x - profile2.x);
}
```

**Target State:**
```typescript
// Geometry calculations - Tier 3: Deterministic (NO YDT)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

function calculateMiterAngle(profile1: Profile, profile2: Profile): number {
  return IntelligenceGate.deterministic(
    'geometry_calculation',
    () => {
      return Math.atan2(profile1.y - profile2.y, profile1.x - profile2.x);
    }
  );
}
```

**Classification:** Tier 3 (Deterministic)  
**Reasoning Required:** No (pure math)  
**Estimated Time:** 2 hours

---

#### 3.3 CNC Code Generation

**Files to Refactor:**
- `src/lib/fabricator/CNCGenerator.ts` (if exists)
- `src/lib/fabricator/DualOutputGenerator.ts`

**Current State:**
```typescript
// CNC generation - Template-based
generateGCode(optimizedResult: OptimizedResult): string {
  // Template-based generation
  return templateEngine.render(optimizedResult);
}
```

**Target State:**
```typescript
// CNC generation - Tier 3: Deterministic (NO YDT)
import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

generateGCode(optimizedResult: OptimizedResult): string {
  return IntelligenceGate.deterministic(
    'cnc_code_generation',
    () => {
      return templateEngine.render(optimizedResult);
    }
  );
}
```

**Classification:** Tier 3 (Deterministic)  
**Reasoning Required:** No (template-based)  
**Estimated Time:** 1 hour

---

## 📊 METRICS IMPLEMENTATION

### Metrics to Track

#### Tier Coverage Metrics
```typescript
// File: src/lib/ydt/TierMetrics.ts

export interface TierCoverageMetrics {
  tier1Decisions: number; // Strategic (YDT mandatory)
  tier2Decisions: number; // Execution (YDT + TensorFlow)
  tier3Decisions: number; // Deterministic (NO YDT)
  tier1Coverage: number; // % of strategic decisions using YDT
  tier3Purity: number; // % of deterministic operations with no YDT
}

export class TierMetrics {
  private static metrics: TierCoverageMetrics = {
    tier1Decisions: 0,
    tier2Decisions: 0,
    tier3Decisions: 0,
    tier1Coverage: 0,
    tier3Purity: 100
  };

  static recordTier1Decision(): void {
    this.metrics.tier1Decisions++;
    this.updateCoverage();
  }

  static recordTier2Decision(): void {
    this.metrics.tier2Decisions++;
  }

  static recordTier3Decision(): void {
    this.metrics.tier3Decisions++;
    this.updatePurity();
  }

  static getMetrics(): TierCoverageMetrics {
    return { ...this.metrics };
  }

  private static updateCoverage(): void {
    // Calculate % of strategic decisions using YDT
    // (This would compare against total strategic decisions)
  }

  private static updatePurity(): void {
    // Calculate % of deterministic operations with no YDT
    // (This would check for YDT violations in Tier 3)
  }
}
```

#### Violation Metrics
```typescript
// Already implemented in IntelligenceGate.ts
// Metrics tracked:
// - tierViolationCount
// - ydtCalledInDeterministicPath
// - missingReasoningCount
// - lowQualityReasoningCount
```

---

## ✅ REFACTOR CHECKLIST

### Phase 1: Core Services (Week 1-2)

- [ ] **Pricing Services**
  - [ ] Refactor `YDTPricingOracle.ts` to use `IntelligenceGate.strategic()`
  - [ ] Add reasoning validation
  - [ ] Test pricing decisions
  - [ ] Verify Tier 1 classification

- [ ] **Optimization Services**
  - [ ] Refactor `YDTOptimizationWrapper.ts` to use `IntelligenceGate.strategic()`
  - [ ] Add reasoning validation
  - [ ] Test optimization strategies
  - [ ] Verify Tier 1 classification

- [ ] **Services Intelligence**
  - [ ] Refactor `YDTServiceIntelligence.ts` to use `IntelligenceGate.strategic()`
  - [ ] Add reasoning validation
  - [ ] Test ticket routing
  - [ ] Verify Tier 1 classification

### Phase 2: Execution Decisions (Week 2-3)

- [ ] **Algorithm Selection**
  - [ ] Refactor `AlgorithmPredictor.ts` to use `IntelligenceGate.execution()`
  - [ ] Integrate YDT context (optional)
  - [ ] Test algorithm selection
  - [ ] Verify Tier 2 classification

- [ ] **Remnant Purchase**
  - [ ] Refactor `RemnantUsagePredictor.ts` to use `IntelligenceGate.execution()`
  - [ ] Integrate YDT pricing (optional)
  - [ ] Test remnant recommendations
  - [ ] Verify Tier 2 classification

### Phase 3: Deterministic Operations (Week 3)

- [ ] **Cutting Optimization**
  - [ ] Refactor `SimplifiedOptimizationEngine.ts` to use `IntelligenceGate.deterministic()`
  - [ ] Verify no YDT calls
  - [ ] Test optimization performance
  - [ ] Verify Tier 3 classification

- [ ] **Geometry Calculations**
  - [ ] Refactor geometry functions to use `IntelligenceGate.deterministic()`
  - [ ] Verify no YDT calls
  - [ ] Test geometry accuracy
  - [ ] Verify Tier 3 classification

- [ ] **CNC Code Generation**
  - [ ] Refactor CNC generators to use `IntelligenceGate.deterministic()`
  - [ ] Verify no YDT calls
  - [ ] Test CNC output
  - [ ] Verify Tier 3 classification

### Phase 4: Metrics & Monitoring (Week 3-4)

- [ ] **Tier Metrics**
  - [ ] Implement `TierMetrics.ts`
  - [ ] Add metrics tracking to `IntelligenceGate`
  - [ ] Create metrics dashboard
  - [ ] Test metrics collection

- [ ] **Violation Monitoring**
  - [ ] Verify violation metrics are tracked
  - [ ] Create violation alerts
  - [ ] Test violation detection
  - [ ] Create violation dashboard

---

## 🎯 SUCCESS METRICS

### Tier Coverage Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Tier 1 Coverage** | 100% | % of strategic decisions using `IntelligenceGate.strategic()` |
| **Tier 2 Coverage** | >80% | % of execution decisions using `IntelligenceGate.execution()` |
| **Tier 3 Purity** | 100% | % of deterministic operations using `IntelligenceGate.deterministic()` |
| **Tier Violations** | 0 | Count of tier violations detected |

### Reasoning Quality Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Reasoning Coverage** | 100% | % of YDT responses with reasoning |
| **Reasoning Quality** | >95% | % of YDT responses with structured reasoning |
| **Missing Reasoning** | 0 | Count of YDT responses without reasoning |
| **Low Quality Reasoning** | <5% | Count of YDT responses with poor reasoning |

---

## 🚀 EXECUTION TIMELINE

### Week 1: Core Services Refactor
- **Day 1-2:** Pricing services (Tier 1)
- **Day 3-4:** Optimization services (Tier 1)
- **Day 5:** Services intelligence (Tier 1)

### Week 2: Execution Decisions
- **Day 1-2:** Algorithm selection (Tier 2)
- **Day 3-4:** Remnant purchase (Tier 2)
- **Day 5:** Testing and validation

### Week 3: Deterministic Operations
- **Day 1-2:** Cutting optimization (Tier 3)
- **Day 3:** Geometry calculations (Tier 3)
- **Day 4:** CNC generation (Tier 3)
- **Day 5:** Testing and validation

### Week 4: Metrics & Monitoring
- **Day 1-2:** Tier metrics implementation
- **Day 3:** Violation monitoring
- **Day 4:** Dashboard creation
- **Day 5:** Documentation and review

---

## 📝 NOTES

### Key Principles
1. **Tier 1 (Strategic):** YDT is mandatory, reasoning is required
2. **Tier 2 (Execution):** YDT is optional context, TensorFlow decides
3. **Tier 3 (Deterministic):** YDT is explicitly blocked

### Common Pitfalls to Avoid
- ❌ Calling YDT in Tier 3 operations
- ❌ Missing reasoning in Tier 1 responses
- ❌ Using YDT to decide execution details (should be TensorFlow)
- ❌ Bypassing IntelligenceGate for "performance"

### Testing Strategy
- Unit tests for each tier enforcement
- Integration tests for tier boundaries
- Performance tests for Tier 3 operations (should be fast)
- Violation detection tests

---

**"Architecture becomes reality when code enforces it."**

