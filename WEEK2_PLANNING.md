# Week 2 Planning: Production Sequence Optimization

**Date:** January 2025  
**Status:** 🟢 Ready for Execution  
**Phase:** Phase 0, Week 2 - Gold Tier Migration

---

## 🎯 Week 2 Objectives

### Primary Goals
1. **Production Sequence Optimization** - Station assignments + timing
2. **Cut List Integration** - Connect to existing CuttingListGenerator
3. **FabricationData Conversion** - Convert CuttingList to FabricationData format
4. **Cross-Validation** - Compare dual-output vs. 99.8% system

### Success Criteria
- ✅ Production sequence generated for all window types
- ✅ Cut list properly integrated with existing system
- ✅ FabricationData conversion working
- ✅ Cross-validation shows <1mm differences
- ✅ No regression in 99.8% accuracy

---

## 📋 Task Breakdown

### Day 1 (Tuesday): Analysis & Design

#### Morning: Workshop Workflow Analysis
- [ ] **Analyze current production workflow**
  - Document station types: Cutting → Machining → Assembly → Glazing → QC
  - Identify bottlenecks and optimization opportunities
  - Review partner workshop feedback

- [ ] **Define ProductionSequence data structure**
  ```typescript
  // File: src/types/fabricator.ts
  export interface ProductionSequence {
    steps: ProductionStep[];
    totalEstimatedTime: number; // minutes
    stations: Station[];
    dependencies: StepDependency[];
  }

  export interface ProductionStep {
    stepNumber: number;
    operation: string;
    station: 'cutting' | 'machining' | 'assembly' | 'glazing' | 'qc';
    estimatedTime: number; // minutes
    toolsRequired: string[];
    skillsRequired: 'basic' | 'intermediate' | 'expert';
    qualityGates: string[];
    dependencies: number[]; // Step numbers that must complete first
  }
  ```

#### Afternoon: Technical Design
- [ ] **Design ProductionSequenceOptimizer class**
  - Input: FabricationData
  - Output: Optimized ProductionSequence
  - Algorithm: Dependency graph + station scheduling

- [ ] **Design CutListConverter class**
  - Input: CuttingList (existing format)
  - Output: FabricationData
  - Mapping strategy: Profile-by-profile conversion

---

### Day 2 (Wednesday): Implementation

#### Morning: ProductionSequenceOptimizer
- [ ] **Create ProductionSequenceOptimizer.ts**
  ```typescript
  // File: src/lib/fabricator/ProductionSequenceOptimizer.ts
  export class ProductionSequenceOptimizer {
    generateSequence(fabricationData: FabricationData): ProductionSequence {
      // 1. Identify all operations needed
      // 2. Build dependency graph
      // 3. Assign stations
      // 4. Calculate timing
      // 5. Optimize order
    }
  }
  ```

- [ ] **Implement station assignment logic**
  - Cutting station: Profile cutting operations
  - Machining station: Drill, mill, notch operations
  - Assembly station: Frame assembly, hardware installation
  - Glazing station: Glass installation
  - QC station: Final inspection

#### Afternoon: Timing Calculations
- [ ] **Calculate estimated times per operation**
  - Cutting: Based on profile length + kerf
  - Machining: Based on operation type + complexity
  - Assembly: Based on component count
  - Glazing: Based on glass area
  - QC: Standard inspection time

---

### Day 3 (Thursday): Integration

#### Morning: Cut List Integration
- [ ] **Integrate with existing CuttingListGenerator**
  ```typescript
  // File: src/lib/fabricator/DualOutputGenerator.ts
  // Update generateForWindowUnit() to use existing cut list
  const existingCutList = await generateCuttingListFromSystemPack(
    windowUnit.systemPackId,
    windowUnit.overallWidth,
    windowUnit.overallHeight
  );
  ```

- [ ] **Create CutListConverter.ts**
  ```typescript
  // File: src/lib/fabricator/CutListConverter.ts
  export class CutListConverter {
    convertToFabricationData(cutList: CuttingList): FabricationData {
      // Map CuttingList format to FabricationData format
      // Preserve all accuracy-critical data
    }
  }
  ```

#### Afternoon: Cross-Validation
- [ ] **Implement cross-validation logic**
  ```typescript
  // File: src/lib/fabricator/DualOutputGenerator.ts
  private findDiscrepancies(
    fabricationProfiles: FabricationData['profiles'],
    existingComponents: any[]
  ): Discrepancy[] {
    // Compare profile lengths
    // Flag differences >1mm
    // Return detailed discrepancy report
  }
  ```

- [ ] **Add validation reporting**
  - Visual indicators for discrepancies
  - Warning messages for review
  - Accuracy metrics

---

### Day 4 (Friday): Testing & Documentation

#### Morning: Testing
- [ ] **Create test suite for production sequence**
  - Test with simple windows
  - Test with complex multi-panel windows
  - Test with different system packs

- [ ] **Validate cut list conversion**
  - Compare converted FabricationData with original
  - Verify all profiles mapped correctly
  - Check hardware BOM accuracy

#### Afternoon: Documentation & Performance
- [ ] **Performance optimization**
  - Ensure <2s generation time
  - Optimize sequence calculation
  - Cache where appropriate

- [ ] **Documentation**
  - Update DualOutputGenerator docs
  - Document production sequence format
  - Create user guide for production workflow

---

## 🔧 Technical Architecture

### Production Sequence Flow

```
FabricationData
    ↓
ProductionSequenceOptimizer
    ↓
ProductionSequence
    ├─→ Step 1: Cut Frame Profiles (Cutting Station, 15 min)
    ├─→ Step 2: Cut Sash Profiles (Cutting Station, 12 min)
    ├─→ Step 3: Drill Hinge Holes (Machining Station, 8 min)
    ├─→ Step 4: Assemble Frame (Assembly Station, 20 min)
    ├─→ Step 5: Install Hardware (Assembly Station, 15 min)
    ├─→ Step 6: Install Glass (Glazing Station, 10 min)
    └─→ Step 7: Final QC (QC Station, 5 min)
```

### Cut List Conversion Flow

```
CuttingList (Existing Format)
    ↓
CutListConverter
    ↓
FabricationData
    ├─→ profiles: Mapped from CuttingList.components
    ├─→ hardware: Extracted from pattern.accessories
    ├─→ glazing: Calculated from window dimensions
    └─→ warnings: Generated from constraints
```

### Cross-Validation Flow

```
Dual-Output FabricationData
    ↓
Cross-Validator
    ↓
Existing 99.8% Cut List
    ↓
Discrepancy Report
    ├─→ Profile length differences
    ├─→ Quantity mismatches
    └─→ Hardware differences
```

---

## 📊 Key Files to Create/Modify

### New Files
1. `src/lib/fabricator/ProductionSequenceOptimizer.ts` - Sequence generation
2. `src/lib/fabricator/CutListConverter.ts` - Format conversion
3. `src/types/fabricator.ts` - Add ProductionSequence interfaces
4. `scripts/test-production-sequence.ts` - Test suite

### Modified Files
1. `src/lib/fabricator/DualOutputGenerator.ts`
   - Line 86: Implement proper cut list generation
   - Line 280: Implement cut list to FabricationData conversion
   - Line 345: Implement production sequence optimization

2. `src/lib/fabricator/CuttingListGenerator.ts`
   - Ensure compatibility with DualOutputGenerator
   - Add export for integration

---

## ⚠️ Risk Mitigation

### Risk 1: Cut List Format Mismatch
**Mitigation:** Create comprehensive mapping documentation, test with all system packs

### Risk 2: Performance Degradation
**Mitigation:** Profile sequence generation, optimize algorithms, use caching

### Risk 3: Accuracy Regression
**Mitigation:** Cross-validation must show <1mm differences, fallback to legacy if fails

---

## 🎯 Success Metrics

### Technical Metrics
- ✅ Production sequence generated for 100% of windows
- ✅ Cut list conversion accuracy: 99.8%+
- ✅ Cross-validation: <1mm differences
- ✅ Performance: <2s generation time
- ✅ Zero regression in existing system

### Business Metrics
- ✅ Production workflow visible to workshops
- ✅ Estimated times accurate within 10%
- ✅ Station assignments logical and efficient

---

## 📅 Daily Standup Focus

### Tuesday
- "What workshop workflows did you analyze?"
- "ProductionSequence structure finalized?"

### Wednesday
- "ProductionSequenceOptimizer implemented?"
- "Station assignment logic working?"

### Thursday
- "Cut list integration complete?"
- "Cross-validation passing?"

### Friday
- "All tests passing?"
- "Ready for Week 3?"

---

## 🚀 Week 2 Kickoff Checklist

- [ ] Review Week 1 validation results
- [ ] Assign Day 1 tasks to team members
- [ ] Schedule workshop workflow interviews
- [ ] Set up development environment
- [ ] Create feature branch: `phase0-week2-production-sequence`

---

**Status:** Ready for execution  
**Owner:** Backend Team + Lead Engineer  
**Start Date:** Tomorrow (after Week 1 validation complete)

