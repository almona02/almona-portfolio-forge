# YDT Intelligence Gate Architecture
## Technical Enforcement Specification

**Date:** January 7, 2026  
**Status:** Active Architecture Specification  
**Purpose:** Define where YDT is mandatory vs advisory vs not used

---

## 🎯 EXECUTIVE SUMMARY

**The Problem:** "YDT Everywhere" risks latency, developer friction, and silent bypassing.

**The Solution:** Three-Tier Decision Architecture with Intelligence Gates.

**The Rule:** YDT is the authority on WHY (strategy), not HOW (execution).

---

## 🔐 THREE-TIER DECISION ARCHITECTURE

### Tier 1: Strategic Gate (YDT MANDATORY)

**Definition:** Decisions that require market intelligence, business context, or strategic reasoning.

**YDT Role:** Authority on WHY (strategy, context, market intelligence)

**Enforcement:** Circuit breaker pattern (mandatory with fallback)

**Examples:**
- Pricing decisions
- Business viability checks
- Optimization strategy selection (remnant-first vs speed-first)
- Material recommendations
- Competitive positioning
- Customer tier assignments
- Project viability assessments

**Code Pattern:**
```typescript
// YDT is MANDATORY (circuit breaker enforced)
const ydt = YDTCoreService.getInstance();
const strategy = await ydtEnforcer.validateWithYDT(
  'pricing_decision',
  { project, workshop }
);
// If YDT fails, use certified baseline (not bypass)
```

---

### Tier 2: Execution Choice (YDT + TensorFlow)

**Definition:** Decisions that combine strategic context with pattern recognition.

**YDT Role:** Provides strategic context (WHAT to optimize for)

**TensorFlow Role:** Validates/executes with pattern recognition (HOW to optimize)

**Enforcement:** YDT provides context, TensorFlow makes final choice

**Examples:**
- Algorithm selection (YDT strategy → TensorFlow prediction)
- Remnant purchase decisions (YDT pricing + TensorFlow usage probability)
- Material demand forecasting (YDT alternatives + TensorFlow consumption)
- Quality check prioritization (YDT patterns + TensorFlow anomaly detection)

**Code Pattern:**
```typescript
// YDT provides context, TensorFlow validates
const [ydtContext, mlPrediction] = await Promise.all([
  ydt.getOptimizationStrategy(context), // YDT: WHY (strategy)
  mlPredictor.predict(jobFeatures) // TensorFlow: HOW (execution)
]);

// TensorFlow uses YDT context
const finalDecision = mlPredictor.predict({
  ...jobFeatures,
  strategy: ydtContext.data.strategy, // YDT context
  constraints: ydtContext.data.constraints
});
```

---

### Tier 3: Deterministic Operations (NO YDT)

**Definition:** Pure computation, geometry, CNC math, or I/O operations.

**YDT Role:** Not used (would add latency without value)

**Enforcement:** YDT is explicitly NOT called

**Examples:**
- Geometry calculations (cut lengths, angles, positions)
- CNC code generation (G-code, M-code)
- Material cutting optimization (pure algorithms: Greedy, LP, GA)
- File I/O (DXF parsing, MDB export)
- Database queries
- UI rendering
- Form validation

**Code Pattern:**
```typescript
// NO YDT - Pure computation
const optimizedResult = optimizationEngine.optimize(cuts);
// No YDT call here - this is deterministic math

// NO YDT - Geometry
const angle = calculateMiterAngle(profile1, profile2);
// No YDT call here - this is pure geometry

// NO YDT - CNC generation
const gcode = generateGCode(optimizedResult);
// No YDT call here - this is deterministic output
```

---

## 🚦 INTELLIGENCE GATE RULES

### Rule 1: YDT is Authority on WHY, Not HOW

**✅ YDT Decides:**
- What strategy to use (remnant-first vs speed-first)
- What price to charge (market intelligence)
- What material to recommend (shortage alerts, alternatives)
- What risk to accept (viability checks)

**❌ YDT Does NOT Decide:**
- Which algorithm to run (TensorFlow decides)
- How to calculate geometry (math decides)
- How to generate CNC code (templates decide)
- How to parse DXF files (parsers decide)

**Enforcement:**
```typescript
// ✅ CORRECT: YDT decides strategy
const strategy = await ydt.getOptimizationStrategy(context);
optimizationEngine.setStrategy(strategy.data.strategy);

// ❌ WRONG: YDT decides algorithm
const algorithm = await ydt.getAlgorithm(context); // NO - TensorFlow decides

// ✅ CORRECT: TensorFlow decides algorithm with YDT context
const algorithm = await mlPredictor.predict({
  ...features,
  strategy: ydtStrategy.data.strategy // YDT provides context
});
```

---

### Rule 2: YDT Must Always Explain Itself

**Every YDT Response Must Include:**
- Why this decision? (reasoning)
- What assumption? (market context, data source)
- What would change the answer? (confidence, alternatives)

**Enforcement:**
```typescript
interface YDTResponse<T> {
  data: T;
  confidence: number;
  source: string;
  reasoning: string; // REQUIRED: Why this decision?
  assumptions: string[]; // REQUIRED: What assumptions?
  alternatives?: T[]; // OPTIONAL: What would change the answer?
}

// If YDT response lacks reasoning, reject it
if (!response.reasoning) {
  throw new Error('YDT response must include reasoning');
}
```

---

### Rule 3: Strategic Decisions Must Cross Intelligence Gate

**Enforcement Pattern:**
```typescript
// File: src/lib/ydt/IntelligenceGate.ts

export class IntelligenceGate {
  /**
   * Enforce YDT for strategic decisions
   */
  static async enforceStrategic<T>(
    operation: string,
    inputs: any,
    ydtCall: () => Promise<YDTResponse<T>>
  ): Promise<T> {
    // Circuit breaker ensures YDT is called (with fallback)
    const enforcer = YDTEnforcementService.getInstance();
    return await enforcer.validateWithYDT(operation, inputs, ydtCall);
  }

  /**
   * Allow YDT for execution decisions (optional context)
   */
  static async allowExecution<T>(
    operation: string,
    inputs: any,
    ydtCall: () => Promise<YDTResponse<T>>,
    mlCall: () => Promise<T>
  ): Promise<T> {
    // YDT provides context, ML makes decision
    const [ydtContext, mlResult] = await Promise.all([
      ydtCall().catch(() => null), // Optional - can fail
      mlCall() // Required
    ]);

    // If YDT provides context, use it
    if (ydtContext) {
      return mlCall({ ...inputs, ydtContext: ydtContext.data });
    }

    // Otherwise, ML decides alone
    return mlResult;
  }

  /**
   * Block YDT for deterministic operations
   */
  static blockDeterministic(operation: string): void {
    // Log warning if YDT is called for deterministic operation
    console.warn(
      `YDT called for deterministic operation: ${operation}. ` +
      `This should not use YDT.`
    );
  }
}
```

---

## 📊 DECISION CLASSIFICATION MATRIX

### Complete Decision Map

| Decision | Tier | YDT Role | TensorFlow Role | Enforcement |
|----------|------|----------|-----------------|-------------|
| **Pricing** | 1 | ✅ Mandatory (strategy) | ❌ None | Circuit breaker |
| **Business Viability** | 1 | ✅ Mandatory (assessment) | ❌ None | Circuit breaker |
| **Optimization Strategy** | 1 | ✅ Mandatory (remnant-first vs speed-first) | ❌ None | Circuit breaker |
| **Material Recommendation** | 1 | ✅ Mandatory (alternatives, shortages) | ❌ None | Circuit breaker |
| **Competitive Analysis** | 1 | ✅ Mandatory (market intelligence) | ❌ None | Circuit breaker |
| **Algorithm Selection** | 2 | ⚠️ Context (strategy) | ✅ Decision (prediction) | YDT optional, ML required |
| **Remnant Purchase** | 2 | ⚠️ Context (pricing) | ✅ Decision (usage probability) | YDT optional, ML required |
| **Material Demand Forecast** | 2 | ⚠️ Context (alternatives) | ✅ Decision (consumption) | YDT optional, ML required |
| **Quality Check Priority** | 2 | ⚠️ Context (patterns) | ✅ Decision (anomaly detection) | YDT optional, ML required |
| **Cutting Optimization** | 3 | ❌ Not used | ❌ Not used | Pure algorithm |
| **Geometry Calculation** | 3 | ❌ Not used | ❌ Not used | Pure math |
| **CNC Code Generation** | 3 | ❌ Not used | ❌ Not used | Template-based |
| **DXF Parsing** | 3 | ❌ Not used | ❌ Not used | Parser-based |
| **Form Validation** | 3 | ❌ Not used | ❌ Not used | Schema-based |

**Legend:**
- ✅ = Required
- ⚠️ = Optional (provides context)
- ❌ = Not used

---

## 🔧 TECHNICAL ENFORCEMENT IMPLEMENTATION

### 1. Intelligence Gate Service

```typescript
// File: src/lib/ydt/IntelligenceGate.ts

import { YDTEnforcementService } from './YDTEnforcementService';
import { YDTCoreService } from './YDTCoreService';

export enum DecisionTier {
  STRATEGIC = 'strategic', // Tier 1: YDT mandatory
  EXECUTION = 'execution', // Tier 2: YDT + TensorFlow
  DETERMINISTIC = 'deterministic' // Tier 3: No YDT
}

export class IntelligenceGate {
  private static enforcer = YDTEnforcementService.getInstance();
  private static ydt = YDTCoreService.getInstance();

  /**
   * Tier 1: Strategic decisions (YDT mandatory)
   */
  static async strategic<T>(
    operation: string,
    inputs: any,
    ydtMethod: (inputs: any) => Promise<YDTResponse<T>>
  ): Promise<T> {
    // Enforce YDT with circuit breaker
    const result = await this.enforcer.validateWithYDT(
      operation,
      inputs,
      () => ydtMethod(inputs)
    );

    // Validate response has reasoning
    if (!result.reasoning) {
      throw new Error(`YDT response for ${operation} must include reasoning`);
    }

    return result.data;
  }

  /**
   * Tier 2: Execution decisions (YDT + TensorFlow)
   */
  static async execution<T>(
    operation: string,
    inputs: any,
    ydtContextMethod: (inputs: any) => Promise<YDTResponse<any>>,
    mlMethod: (inputs: any, context?: any) => Promise<T>
  ): Promise<T> {
    // YDT provides context (optional - can fail)
    let ydtContext: any = null;
    try {
      const contextResult = await ydtContextMethod(inputs);
      ydtContext = contextResult.data;
    } catch (error) {
      console.warn(`YDT context failed for ${operation}, proceeding with ML only`);
    }

    // TensorFlow makes decision with YDT context
    return await mlMethod(inputs, ydtContext);
  }

  /**
   * Tier 3: Deterministic operations (no YDT)
   */
  static deterministic<T>(
    operation: string,
    method: () => T
  ): T {
    // Log warning if YDT is somehow called
    if (operation.includes('ydt') || operation.includes('YDT')) {
      console.warn(
        `YDT detected in deterministic operation: ${operation}. ` +
        `This should not use YDT.`
      );
    }

    // Execute without YDT
    return method();
  }
}
```

---

### 2. Decision Classification Decorator

```typescript
// File: src/lib/ydt/DecisionClassifier.ts

import { IntelligenceGate, DecisionTier } from './IntelligenceGate';

/**
 * Decorator to classify and enforce decision tier
 */
export function ClassifyDecision(tier: DecisionTier) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      switch (tier) {
        case DecisionTier.STRATEGIC:
          // Enforce YDT mandatory
          return IntelligenceGate.strategic(
            `${target.constructor.name}.${propertyKey}`,
            args,
            originalMethod.bind(this)
          );

        case DecisionTier.EXECUTION:
          // Allow YDT + TensorFlow
          return IntelligenceGate.execution(
            `${target.constructor.name}.${propertyKey}`,
            args,
            originalMethod.bind(this),
            originalMethod.bind(this) // ML method (would be separate in practice)
          );

        case DecisionTier.DETERMINISTIC:
          // Block YDT
          return IntelligenceGate.deterministic(
            `${target.constructor.name}.${propertyKey}`,
            () => originalMethod.apply(this, args)
          );

        default:
          return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}
```

---

### 3. Usage Examples

#### Example 1: Pricing (Tier 1 - Strategic)

```typescript
// File: src/lib/pricing/YDTPricingOracle.ts

import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';
import { YDTCoreService } from '@/lib/ydt/YDTCoreService';

export class YDTPricingOracle {
  private ydt = YDTCoreService.getInstance();

  /**
   * Tier 1: Strategic decision - YDT mandatory
   */
  async calculatePriceWithYDT(project: Project, workshop: Workshop) {
    return await IntelligenceGate.strategic(
      'pricing_decision',
      { project, workshop },
      async (inputs) => {
        // YDT is mandatory here
        return await this.ydt.getMarketPricing(
          inputs.project,
          inputs.workshop.id
        );
      }
    );
  }
}
```

#### Example 2: Algorithm Selection (Tier 2 - Execution)

```typescript
// File: src/lib/optimization/AlgorithmSelector.ts

import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';
import { YDTCoreService } from '@/lib/ydt/YDTCoreService';
import { AlgorithmPredictor } from '@/lib/ml/AlgorithmPredictor';

export class AlgorithmSelector {
  private ydt = YDTCoreService.getInstance();
  private mlPredictor = new AlgorithmPredictor();

  /**
   * Tier 2: Execution decision - YDT provides context, TensorFlow decides
   */
  async selectAlgorithm(jobComplexity: JobComplexity, context: OptimizationContext) {
    return await IntelligenceGate.execution(
      'algorithm_selection',
      { jobComplexity, context },
      // YDT provides context (optional)
      async (inputs) => {
        return await this.ydt.getOptimizationStrategy(inputs.context);
      },
      // TensorFlow makes decision (required)
      async (inputs, ydtContext) => {
        return await this.mlPredictor.predict({
          ...inputs.jobComplexity,
          strategy: ydtContext?.strategy, // Use YDT context if available
          constraints: ydtContext?.constraints
        });
      }
    );
  }
}
```

#### Example 3: Cutting Optimization (Tier 3 - Deterministic)

```typescript
// File: src/lib/fabricator/OptimizationEngine.ts

import { IntelligenceGate } from '@/lib/ydt/IntelligenceGate';

export class SimplifiedOptimizationEngine {
  /**
   * Tier 3: Deterministic operation - NO YDT
   */
  optimize(cuts: Cut[], systemPackId?: string): OptimizedResult {
    return IntelligenceGate.deterministic(
      'cutting_optimization',
      () => {
        // Pure algorithm - no YDT
        // This is deterministic math
        const correctedCuts = cuts.map(cut => this.applyCorrections(cut));
        const sortedCuts = this.sortByLength(correctedCuts);
        return this.packIntoBars(sortedCuts);
      }
    );
  }
}
```

---

## 🚨 ANTI-PATTERNS (WHAT NOT TO DO)

### ❌ Anti-Pattern 1: YDT in Deterministic Operations

```typescript
// ❌ WRONG: YDT in geometry calculation
async calculateAngle(profile1: Profile, profile2: Profile) {
  const ydt = YDTCoreService.getInstance();
  const strategy = await ydt.getOptimizationStrategy({...}); // NO!
  return Math.atan2(profile1.y - profile2.y, profile1.x - profile2.x);
}

// ✅ CORRECT: Pure geometry
calculateAngle(profile1: Profile, profile2: Profile) {
  return Math.atan2(profile1.y - profile2.y, profile1.x - profile2.x);
}
```

### ❌ Anti-Pattern 2: YDT Decides Execution Details

```typescript
// ❌ WRONG: YDT decides algorithm
async selectAlgorithm(jobComplexity: JobComplexity) {
  const ydt = YDTCoreService.getInstance();
  return await ydt.getAlgorithm(jobComplexity); // NO - TensorFlow decides
}

// ✅ CORRECT: YDT provides context, TensorFlow decides
async selectAlgorithm(jobComplexity: JobComplexity, context: OptimizationContext) {
  const ydt = YDTCoreService.getInstance();
  const mlPredictor = new AlgorithmPredictor();
  
  // YDT provides strategy context
  const strategy = await ydt.getOptimizationStrategy(context);
  
  // TensorFlow decides algorithm with YDT context
  return await mlPredictor.predict({
    ...jobComplexity,
    strategy: strategy.data.strategy
  });
}
```

### ❌ Anti-Pattern 3: YDT Without Reasoning

```typescript
// ❌ WRONG: YDT response without reasoning
async getPricing(project: Project) {
  const ydt = YDTCoreService.getInstance();
  const result = await ydt.getMarketPricing(project);
  // Missing: result.reasoning, result.assumptions
  return result.data.finalPrice;
}

// ✅ CORRECT: YDT response with reasoning
async getPricing(project: Project) {
  const ydt = YDTCoreService.getInstance();
  const result = await ydt.getMarketPricing(project);
  
  // Validate reasoning exists
  if (!result.reasoning) {
    throw new Error('YDT pricing must include reasoning');
  }
  
  return {
    price: result.data.finalPrice,
    reasoning: result.reasoning, // Required
    assumptions: result.assumptions || [] // Required
  };
}
```

---

## 📋 ENFORCEMENT CHECKLIST

### For Every YDT Integration

- [ ] **Decision Classification:** Is this Tier 1, 2, or 3?
- [ ] **YDT Role:** Is YDT deciding WHY (strategy) or HOW (execution)?
- [ ] **Enforcement:** Is YDT mandatory (Tier 1) or optional (Tier 2)?
- [ ] **Reasoning:** Does YDT response include reasoning and assumptions?
- [ ] **Performance:** Is YDT call in hot path? (Should be Tier 1 or 2 only)
- [ ] **Fallback:** Is there a certified baseline if YDT fails? (Tier 1 only)

### For Every New Feature

- [ ] **Decision Type:** What tier is this decision?
- [ ] **YDT Integration:** Should YDT be involved? (Tier 1 or 2)
- [ ] **TensorFlow Integration:** Should TensorFlow be involved? (Tier 2)
- [ ] **Code Pattern:** Does code follow IntelligenceGate pattern?

---

## 🎯 SUCCESS CRITERIA

### Architecture Health Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Tier 1 YDT Coverage** | 100% | % of strategic decisions using YDT |
| **Tier 2 Combined Intelligence** | >80% | % of execution decisions using YDT + TensorFlow |
| **Tier 3 YDT Leakage** | 0% | % of deterministic operations calling YDT |
| **YDT Reasoning Coverage** | 100% | % of YDT responses with reasoning |
| **Engineer Bypass Rate** | <5% | % of YDT calls bypassed by engineers |

### Performance Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Tier 1 Latency** | <200ms | YDT response time for strategic decisions |
| **Tier 2 Latency** | <300ms | Combined YDT + TensorFlow response time |
| **Tier 3 Latency** | <50ms | Deterministic operation time (no YDT) |

---

## 🏁 CONCLUSION

**The Intelligence Gate Architecture ensures:**

1. ✅ YDT is mandatory where it matters (strategic decisions)
2. ✅ YDT is optional where it helps (execution decisions)
3. ✅ YDT is absent where it hurts (deterministic operations)
4. ✅ Engineers trust the system (clear boundaries)
5. ✅ Performance is preserved (no YDT in hot path)
6. ✅ Architecture is scalable (tier-based enforcement)

**The Result:**

YDT becomes the system engineers trust when the decision matters, not the system they must ask permission from to do math.

---

**"YDT decides WHY. TensorFlow decides HOW. Math executes without debate."**

