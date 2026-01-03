# RealityOS Extraction Plan
**Version: 1.0 | Status: IN PROGRESS | Created: 2025-02-20**

## Overview

This document outlines the step-by-step plan to extract RealityOS Core from Almona's existing codebase. The extraction follows a disciplined, low-risk approach that preserves Almona's functionality while building the generic platform foundation.

**Principle:** Extract, don't rewrite. Almona becomes the first vertical, not a rewrite target.

---

## Phase 1: Foundation (Week 1-2) ✅ COMPLETE

### Week 1: Constitution & Core Structure

**Status:** ✅ **COMPLETE**

- [x] Create `REALITYOS_CONSTITUTION.md` with 6 immutable principles
- [x] Calculate and store constitution hash
- [x] Create `realityos_core/` directory structure
- [x] Extract HMAC signature module from Calibration Safety Net
- [x] Create validation script
- [x] Verify Almona still works

**Files Created:**
- `REALITYOS_CONSTITUTION.md` (constitutional anchor)
- `realityos_core/__init__.py`
- `realityos_core/.constitution_hash`
- `realityos_core/cryptography/__init__.py`
- `realityos_core/cryptography/hmac_signatures.py`
- `scripts/validate_realityos_extraction.py`

**Validation:**
```bash
python scripts/validate_realityos_extraction.py
```

**Result:** All checks passing ✅

---

## Phase 2: Generic Event Ledger (Week 3-4)

### Week 3: Event Schema Design

**Goal:** Create generic event ledger schema that can handle any vertical's events.

**Tasks:**
- [ ] Design `reality_events` table schema (JSON-based, Option A)
- [ ] Create migration script
- [ ] Define event types enum (ON, OFF, FAULT, INSPECTION, VERIFICATION)
- [ ] Implement hash chain linking (`prev_hash` field)
- [ ] Add database constraints (append-only enforcement)

**Schema Design:**
```sql
CREATE TABLE reality_events (
    id BIGSERIAL PRIMARY KEY,
    event_hash CHAR(64) UNIQUE NOT NULL,  -- SHA-256 hash
    prev_hash CHAR(64) REFERENCES reality_events(event_hash),
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN ('ON', 'OFF', 'FAULT', 'INSPECTION', 'VERIFICATION')
    ),
    entity_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,  -- Vertical-specific data
    proof JSONB NOT NULL,     -- QR, photo_hash, GPS, timestamp, verified_by
    chain_position INTEGER GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Append-only enforcement
REVOKE UPDATE, DELETE ON reality_events FROM application_user;
ALTER TABLE reality_events ENABLE ROW LEVEL SECURITY;
```

**Files to Create:**
- `realityos_core/event_ledger.py` (EventLedger class)
- `migrations/041_reality_events_schema.sql`
- `realityos_core/models/event_models.py` (Pydantic models)

---

### Week 4: Event Ledger Implementation

**Goal:** Implement EventLedger class with full chain integrity.

**Tasks:**
- [ ] Implement `EventLedger.record_event()` method
- [ ] Implement hash chain computation
- [ ] Implement `EventLedger.get_chain()` method
- [ ] Create `ChainVerifier` class for daily verification
- [ ] Add event validation (proof requirements)

**Implementation:**
```python
class EventLedger:
    def record_event(
        self,
        event_type: EventType,
        entity_id: str,
        payload: Dict[str, Any],
        proof: RealityProof
    ) -> EventRecord:
        # 1. Validate proof (QR, photo, GPS, timestamp, verified_by)
        # 2. Get previous event hash (for chain)
        # 3. Compute event hash
        # 4. Insert into database (ACID transaction)
        # 5. Return event record
```

**Files to Create:**
- `realityos_core/event_ledger.py` (complete implementation)
- `realityos_core/chain_verifier.py`
- `realityos_core/models/proof_models.py`

---

## Phase 3: Reality Capture Gateway (Week 5-6)

### Week 5: Capture Gateway Design

**Goal:** Create gateway that validates reality capture before events are recorded.

**Tasks:**
- [ ] Design `RealityCaptureGateway` class
- [ ] Implement QR validation
- [ ] Implement photo validation (max 2, hash computation)
- [ ] Implement GPS validation (geofence checking)
- [ ] Implement timestamp validation (sanity checks)

**Implementation:**
```python
class RealityCaptureGateway:
    MAX_PHOTOS = 2
    GPS_TOLERANCE_METERS = 100
    TIME_TOLERANCE_MINUTES = 15
    
    def validate_capture(
        self,
        qr_data: str,
        photos: List[bytes],
        gps: GPSPoint,
        timestamp: datetime,
        verified_by: str
    ) -> RealityProof:
        # Validate all components
        # Generate proof hash
        # Return RealityProof object
```

**Files to Create:**
- `realityos_core/capture_gateway.py`
- `realityos_core/models/proof_models.py` (RealityProof class)

---

### Week 6: Integration Testing

**Goal:** Test capture gateway with real scenarios.

**Tasks:**
- [ ] Unit tests for each validation component
- [ ] Integration test: Full capture → EventLedger flow
- [ ] Test edge cases (missing photos, GPS drift, clock skew)
- [ ] Performance testing (throughput, latency)

---

## Phase 4: Almona Adapter (Week 7-8)

### Week 7: Build Adapter

**Goal:** Create adapter that allows Almona to use RealityOS Core without breaking.

**Tasks:**
- [ ] Create `almona_realityos_adapter.py`
- [ ] Map calibration events to generic events
- [ ] Dual-write: Old path + New RealityOS path
- [ ] Compare outputs for 100% match

**Implementation:**
```python
class AlmonaRealityOSAdapter:
    def record_calibration_event(self, calibration_data):
        # Convert to generic event
        event = {
            "event_type": "VERIFICATION",
            "entity_id": calibration_data["profile_id"],
            "payload": {
                "k_factor": calibration_data["k_factor"],
                "joint_type": calibration_data["joint_type"]
            }
        }
        # Record via EventLedger
        return self.event_ledger.record_event(...)
```

**Files to Create:**
- `python_backend/core/realityos_adapter.py`
- `tests/test_almona_adapter.py`

---

### Week 8: Dual-Run Validation

**Goal:** Run both systems in parallel, validate outputs match.

**Tasks:**
- [ ] Run Almona with dual-write enabled
- [ ] Compare old calibration events vs. new RealityOS events
- [ ] Validate 100% match (no discrepancies)
- [ ] Performance comparison (should be negligible overhead)
- [ ] Document results

**Success Criteria:**
- ✅ 100% event match (old vs. new)
- ✅ No performance degradation (< 5% overhead)
- ✅ All Almona tests still passing
- ✅ No data loss or corruption

---

## Phase 5: Vertical Plugin System (Week 9-10)

### Week 9: Plugin Registry

**Goal:** Create system for loading and validating vertical plugins.

**Tasks:**
- [ ] Design `VerticalRegistry` class
- [ ] Create plugin manifest schema
- [ ] Implement plugin loading and validation
- [ ] Implement core version compatibility checking
- [ ] Create `BaseRealityRule` abstract class

**Implementation:**
```python
class VerticalRegistry:
    def register(self, manifest_path: str) -> str:
        # 1. Load manifest
        # 2. Validate core version compatibility
        # 3. Load rule classes
        # 4. Verify inheritance from BaseRealityRule
        # 5. Register vertical
```

**Files to Create:**
- `realityos_core/vertical_registry.py`
- `realityos_core/base_rule.py` (BaseRealityRule)
- `docs/VERTICAL_PLUGIN_GUIDE.md`

---

### Week 10: Almona as First Vertical

**Goal:** Refactor Almona to be a RealityOS vertical plugin.

**Tasks:**
- [ ] Create `vertical_almona/manifest.json`
- [ ] Extract Almona rules to vertical plugin
- [ ] Register Almona as vertical
- [ ] Test: Almona works as vertical plugin
- [ ] Remove old calibration-specific code paths

**Files to Create:**
- `vertical_almona/manifest.json`
- `vertical_almona/rules/calibration_rule.py`
- `vertical_almona/__init__.py`

---

## Phase 6: TMG Shield Vertical (Week 11-18)

### Week 11-12: TMG Rules

**Goal:** Build TMG Shield vertical with asset and maintenance rules.

**Tasks:**
- [ ] Create `vertical_tmg_shield/manifest.json`
- [ ] Implement `AssetRuntimeRule`
- [ ] Implement `MaintenanceSLARule`
- [ ] Implement `ContractorVerificationRule`
- [ ] Test rules with sample events

---

### Week 13-14: TMG UI

**Goal:** Build TMG Shield user interface.

**Tasks:**
- [ ] Create asset dashboard
- [ ] Create maintenance tracking interface
- [ ] Create contractor proof interface
- [ ] Integrate with RealityOS Core APIs

---

### Week 15-16: SAP Integration

**Goal:** Integrate TMG Shield with SAP.

**Tasks:**
- [ ] Create SAP PM adapter
- [ ] Create SAP MM adapter
- [ ] Implement audit export
- [ ] Test integration

---

### Week 17-18: Pilot Deployment

**Goal:** Deploy TMG Shield pilot and validate.

**Tasks:**
- [ ] Deploy to TMG pilot site
- [ ] Real-world validation
- [ ] Collect feedback
- [ ] Document case study

---

## Success Criteria

### Phase 1 (Foundation) ✅
- [x] Constitution created and committed
- [x] Core structure established
- [x] HMAC extraction complete
- [x] Validation passing

### Phase 2 (Event Ledger) ✅
- [x] Generic event schema deployed
- [x] EventLedger class functional
- [x] Chain verification working
- [x] Validation script created
- [ ] All tests passing (run validation script)

### Phase 3 (Capture Gateway)
- [ ] Capture gateway validates all proof components
- [ ] Integration tests passing
- [ ] Performance acceptable

### Phase 4 (Almona Adapter)
- [ ] Dual-write working
- [ ] 100% output match
- [ ] Almona functionality preserved
- [ ] No performance degradation

### Phase 5 (Vertical System)
- [ ] Plugin registry functional
- [ ] Almona works as vertical
- [ ] Core remains domain-agnostic

### Phase 6 (TMG Shield)
- [ ] TMG Shield deployed
- [ ] Real-world validation successful
- [ ] Case study documented
- [ ] Revenue generated

---

## Risk Mitigation

### Risk: Breaking Almona
**Mitigation:** Dual-run strategy, adapter pattern, extensive testing

### Risk: Over-engineering
**Mitigation:** Start with JSON events (Option A), structure later

### Risk: Feature Creep
**Mitigation:** Constitution enforcement, one vertical at a time

### Risk: Performance Degradation
**Mitigation:** Benchmark before/after, optimize only if needed

---

## Next Steps

1. **Complete Phase 1 validation** ✅
2. **Begin Phase 2: Event Ledger design** (Week 3)
3. **Follow extraction plan strictly** (no improvisation)
4. **Run validation after each phase**

---

**Last Updated:** 2025-02-20  
**Status:** Phase 1 Complete, Phase 2 Pending

