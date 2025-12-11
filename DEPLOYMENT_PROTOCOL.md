# Phase 1 Deployment Protocol
**Target Workshop:** El Sherif Aluminum (Nasr City)  
**Deployment Date:** Day 1  
**Goal:** 95% accuracy on 10 cuts → 98% accuracy after 1 week

## Workshop Information

```typescript
const DEPLOYMENT_PROTOCOL = {
  workshop: {
    name: "El Sherif Aluminum (Nasr City)",
    contact: "Mohamed +20 100 123 4567",
    specialization: "Panda residential windows",
    cncMachine: "Yilmaz CNC Router",
    sawBlade: "4.2mm diamond-tip aluminum blade"
  },
  
  // ONLY TEST THESE
  testSystems: ['panda-50', 'rock-60'],
  
  testProjects: [
    {
      id: 'TEST-001',
      description: '2-sash sliding window (1200×1500)',
      expectedCuts: 12,
      material: 'Panda 50 aluminum',
      dimensions: {
        width: 1200,
        height: 1500
      }
    },
    {
      id: 'TEST-002', 
      description: 'Single casement with transom (900×1200)',
      expectedCuts: 8,
      material: 'ROCK 60 aluminum',
      dimensions: {
        width: 900,
        height: 1200
      }
    }
  ],
  
  successCriteria: {
    initialAccuracy: '95% (within 5mm total error on 10 cuts)',
    targetAccuracy: '98% after 1 week calibration',
    materialSavings: 'Track wasted aluminum (kg)',
    timeSavings: 'Measure minutes saved per window'
  }
};
```

## The 3-Cut Validation Method

**Start SMALL to validate the engine:**

```typescript
// First validation: Just 3 cuts
const FIRST_TEST = {
  cuts: [
    { label: 'Frame Left', planned: 1485.0, role: 'frame' },
    { label: 'Frame Right', planned: 1485.0, role: 'frame' },
    { label: 'Sash Horizontal', planned: 1430.0, role: 'sash' }
  ],
  
  validationSteps: [
    '1. Print QR-coded cutting list from software',
    '2. Maalem cuts on CNC using software instructions',
    '3. Measure ACTUAL cut pieces (not CNC display)',
    '4. Enter actual lengths in CalibrationView',
    '5. Check delta patterns immediately'
  ],
  
  expectedPatterns: [
    'IF all 3 cuts are ~4.2mm short → Kerf correction needed',
    'IF first cut significantly different → Bar trim issue',
    'IF all within ±1.0mm → Engine is already accurate'
  ]
};
```

## Data Collection Protocol

### 1. Workshop Data Sheet (Physical)

**Project:** TEST-001  
**Date:** __________  
**Maalem:** __________

| Piece | Planned (mm) | Actual (mm) | Delta (mm) | Notes |
|-------|-------------|-------------|-----------|--------|
| Frame L | 1485.0 | __________ | __________ | ________ |
| Frame R | 1485.0 | __________ | __________ | ________ |
| Sash H | 1430.0 | __________ | __________ | ________ |
| Sash V | 890.0 | __________ | __________ | ________ |
| Transom | 1330.0 | __________ | __________ | ________ |

**Patterns noticed:**
- [ ] All cuts consistently short/long
- [ ] First/last cuts different
- [ ] Transoms causing gaps
- [ ] Screens need trimming

### 2. The 3 Critical Validation Questions

After Day 1 deployment, answer these:

**Kerf Question:** Are cuts consistently 4.2mm short?
- ✅ Yes → Your kerf calculation is correct
- ❌ No → Adjust kerf value in MicronEngine

**Trim Question:** Are first/last cuts problematic?
- ✅ Yes → Your 15mm trim is correct
- ❌ No → Reduce trim value or check clamping

**Milling Question:** Do transoms fit without gaps?
- ✅ Yes → Your 2.5mm milling is correct
- ❌ No → Increase milling depth

## Common Reality Scenarios & Solutions

### Scenario 1: "All cuts are 5.0mm short, not 4.2mm"
**Solution:** Workshop uses 5.0mm blade, not 4.2mm
```typescript
// Update in MicronEngine config
sawBladeKerf: 5.0 // Workshop reality
```

### Scenario 2: "First cut is fine, last cut is 20mm short"
**Solution:** Bar is actually 5980mm, not 6000mm
```typescript
// Update bar calibration
barNominalLength: 5980 // Actual measured
```

### Scenario 3: "Screens still need trimming"
**Solution:** This workshop's adapter offset is 18mm, not 15mm
```typescript
// Update Panda config for this workshop
screenAdapterOffset: 18 // Workshop-specific calibration
```

## Week 1 Success Criteria

### Minimum Viable Success (Keep Funding)
```typescript
const WEEK_1_SUCCESS = {
  accuracy: '96% on 50+ cuts',
  workshopFeedback: 'Would use again tomorrow',
  materialSavings: '>2kg aluminum saved per project',
  timeSavings: '>15 minutes saved per window'
};
```

### Exceptional Success (Expand Funding)
```typescript
const WEEK_1_EXCEPTIONAL = {
  accuracy: '98% on 100+ cuts',
  workshopFeedback: 'Will pay 500 EGP/month',
  materialSavings: '>5kg aluminum saved (worth ~1,000 EGP)',
  timeSavings: '>30 minutes saved per window',
  referral: 'Will recommend to other workshops'
};
```

## Deployment Checklist

### Pre-Deployment (Today)
- [ ] Test MicronEngine with sample cuts (1485mm, 1430mm, etc.)
- [ ] Verify Panda screen calculation with adapter offset
- [ ] Print test cutting lists with QR codes
- [ ] Brief El Sherif workshop on the 3-cut validation method

### Day 1 (Tomorrow)
- [ ] Deploy to El Sherif workshop (USB drive or local network)
- [ ] Run TEST-001 (2-sash sliding window)
- [ ] Collect actual measurements
- [ ] Calculate initial accuracy
- [ ] Identify first pattern (kerf/trim/milling)

### Day 2-7 (Calibration Week)
- [ ] Adjust MicronEngine based on Day 1 patterns
- [ ] Run TEST-002 (casement with transom)
- [ ] Validate Panda screen calculations
- [ ] Achieve 96%+ accuracy on 50+ cuts
- [ ] Document material/time savings

