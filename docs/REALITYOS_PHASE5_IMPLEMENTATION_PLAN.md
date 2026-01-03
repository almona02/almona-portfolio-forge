# Phase 5: Vertical Plugin System - Implementation Plan

**Date**: 2025-02-20  
**Status**: 🟢 PLANNING  
**Goal**: Transform RealityOS from "Almona's new backend" to "a platform that can host any industrial vertical"

## Executive Summary

Phase 5 extracts Almona-specific rules into a vertical plugin, creating a plugin registry system that allows RealityOS to host multiple industrial and governmental verticals simultaneously.

## Strategy

### Current State
- Almona is integrated via adapter (Phase 4)
- Almona rules are embedded in adapter code
- RealityOS is effectively "Almona's backend"

### Target State
- Almona is a vertical plugin (like any other vertical)
- Plugin registry manages all verticals
- RealityOS is a true horizontal platform
- TMG Shield can be added as another vertical

## Phase 5 Timeline (Week 9-10)

### Week 9: Plugin System Foundation

#### Day 1-2: Design VerticalRegistry and Plugin Contract

**Tasks**:
- [ ] Design `VerticalRegistry` class for plugin management
- [ ] Define `BaseRealityRule` abstract class (vertical contract)
- [ ] Design plugin manifest structure (JSON)
- [ ] Define plugin lifecycle (load, unload, reload)
- [ ] Design vertical isolation (per-vertical secrets, event routing)

**Deliverables**:
- `realityos_core/vertical_registry.py` - Plugin registry
- `realityos_core/base_rule.py` - Base rule contract
- `docs/REALITYOS_VERTICAL_CONTRACT.md` - Contract specification

#### Day 3-4: Extract Almona Rules to Vertical Plugin

**Tasks**:
- [ ] Create `vertical_almona/` directory structure
- [ ] Extract calibration rules from adapter
- [ ] Create `AlmonaCalibrationRule` extending `BaseRealityRule`
- [ ] Create `AlmonaAnomalyRule` for anomaly handling
- [ ] Create plugin manifest (`manifest.json`)
- [ ] Test Almona rules as plugin

**Deliverables**:
- `vertical_almona/manifest.json` - Plugin metadata
- `vertical_almona/rules/calibration_rule.py` - Calibration rule
- `vertical_almona/rules/anomaly_rule.py` - Anomaly rule
- `vertical_almona/__init__.py` - Plugin entry point

#### Day 5-7: Test Almona Works as Vertical

**Tasks**:
- [ ] Register Almona vertical in registry
- [ ] Test calibration events route through plugin
- [ ] Test anomaly events route through plugin
- [ ] Verify all existing Almona functionality preserved
- [ ] Performance testing (no degradation)
- [ ] Integration tests for plugin system

**Deliverables**:
- `tests/integration/test_vertical_registry.py` - Registry tests
- `tests/integration/test_almona_vertical.py` - Almona as vertical tests
- `docs/REALITYOS_PHASE5_WEEK9_COMPLETE.md` - Week 9 completion

### Week 10: TMG Shield Preparation

#### Day 1-3: Design TMG Shield Vertical Architecture

**Tasks**:
- [ ] Analyze TMG Shield requirements
- [ ] Design TMG event types (inspection, compliance, audit)
- [ ] Design TMG proof requirements (QR, photos, GPS, signatures)
- [ ] Design TMG validation rules
- [ ] Create TMG vertical structure skeleton

**Deliverables**:
- `docs/TMG_SHIELD_VERTICAL_DESIGN.md` - Architecture design
- `vertical_tmg_shield/manifest.json` - TMG manifest skeleton
- `vertical_tmg_shield/rules/` - Rule structure

#### Day 4-5: Create TMG Event Types and Rules

**Tasks**:
- [ ] Define TMG-specific event types
- [ ] Create `TMGInspectionRule` class
- [ ] Create `TMGComplianceRule` class
- [ ] Create `TMGAuditRule` class
- [ ] Test TMG rules with mock data

**Deliverables**:
- `vertical_tmg_shield/rules/inspection_rule.py` - Inspection rule
- `vertical_tmg_shield/rules/compliance_rule.py` - Compliance rule
- `vertical_tmg_shield/rules/audit_rule.py` - Audit rule

#### Day 6-7: Prepare for Phase 6 Implementation

**Tasks**:
- [ ] Complete TMG vertical skeleton
- [ ] Document TMG integration requirements
- [ ] Create Phase 6 implementation plan
- [ ] Validate plugin system ready for TMG

**Deliverables**:
- `docs/REALITYOS_PHASE6_IMPLEMENTATION_PLAN.md` - Phase 6 plan
- `docs/REALITYOS_PHASE5_COMPLETE.md` - Phase 5 completion report

## Success Criteria

### Functional Requirements

- ✅ **Plugin Registry Functional**: Can load/unload verticals at runtime
- ✅ **Almona Works as Vertical**: All functionality preserved as plugin
- ✅ **Vertical Contract Defined**: Clear interface for new verticals
- ✅ **Constitutional Compliance**: All verticals respect constitution
- ✅ **TMG Shield Ready**: Architecture designed for next vertical

### Performance Requirements

- ✅ **No Performance Degradation**: Plugin system adds <1% overhead
- ✅ **Fast Plugin Loading**: <100ms to load/unload vertical
- ✅ **Memory Efficient**: Plugin isolation without duplication

### Quality Requirements

- ✅ **Plugin Isolation**: Vertical failures don't affect others
- ✅ **Error Handling**: Graceful plugin failures
- ✅ **Documentation**: Complete plugin development guide
- ✅ **Testing**: Comprehensive plugin system tests

## Vertical Plugin Structure

```
vertical_almona/
├── manifest.json          # Metadata, dependencies, version
├── __init__.py           # Plugin entry point
├── rules/
│   ├── calibration_rule.py      # Maps Almona → RealityOS events
│   └── anomaly_rule.py          # Anomaly handling logic
└── ui/
    └── dashboard_widget.py      # Optional UI components
```

## Plugin Registry Design

```python
# realityos_core/vertical_registry.py
class VerticalRegistry:
    """Loads and manages vertical plugins."""
    
    def register(self, manifest_path: str) -> str:
        """
        Register a vertical plugin.
        
        1. Load manifest
        2. Validate core version compatibility
        3. Load rule classes
        4. Verify constitutional compliance
        5. Register vertical
        """
    
    def unregister(self, vertical_id: str) -> bool:
        """Unregister a vertical plugin."""
    
    def get_vertical(self, vertical_id: str) -> VerticalPlugin:
        """Get registered vertical."""
```

## Vertical Contract

```python
# realityos_core/base_rule.py
class BaseRealityRule(ABC):
    """Base class that all vertical rules must extend."""
    
    @abstractmethod
    def validate_event(self, event: BaseEvent) -> ValidationResult:
        """Validate event according to vertical rules."""
    
    @abstractmethod
    def get_event_types(self) -> List[CoreEventType]:
        """Return event types this vertical handles."""
```

## Constitutional Requirements

All verticals must:

1. **Respect Principle 1**: Human-Verified Before System-Trusted
   - All events must have proof (QR, photo, GPS, or timestamp)
   - Vertical-specific validation must not bypass gateway

2. **Respect Principle 2**: Append-Only Reality
   - No updates/deletes to events
   - Only new events can be created

3. **Respect Principle 3**: Cryptographic Chain of Custody
   - Events must be chained (prev_hash)
   - Proof hashes must be computed

4. **Respect Principle 5**: Vertical Agnosticism
   - Per-vertical signing keys
   - No cross-vertical data access

5. **Respect Principle 6**: No Admin Correction Flags
   - No bypass mechanisms
   - No "admin override" features

## Risk Mitigation

### Identified Risks

1. **Plugin Isolation**: What if plugin crashes?
   - **Mitigation**: Plugin sandboxing, error boundaries

2. **Performance Impact**: What if plugins slow down system?
   - **Mitigation**: Performance monitoring, plugin quotas

3. **Constitutional Violations**: What if plugin violates constitution?
   - **Mitigation**: Pre-registration validation, runtime checks

4. **Version Compatibility**: What if plugin requires different core version?
   - **Mitigation**: Manifest version checking, compatibility matrix

## Implementation Checklist

### Week 9

- [ ] Day 1: Design VerticalRegistry
- [ ] Day 2: Design BaseRealityRule contract
- [ ] Day 3: Extract Almona calibration rules
- [ ] Day 4: Extract Almona anomaly rules
- [ ] Day 5: Create Almona plugin manifest
- [ ] Day 6: Test Almona as vertical
- [ ] Day 7: Integration tests

### Week 10

- [ ] Day 1: Analyze TMG Shield requirements
- [ ] Day 2: Design TMG architecture
- [ ] Day 3: Create TMG structure
- [ ] Day 4: Create TMG event types
- [ ] Day 5: Create TMG rules
- [ ] Day 6: Document Phase 6 plan
- [ ] Day 7: Phase 5 completion report

## Next Steps

1. **Create VerticalRegistry**: Plugin management system
2. **Define BaseRealityRule**: Vertical contract
3. **Extract Almona Rules**: Transform adapter to plugin
4. **Test Plugin System**: Verify Almona works as vertical
5. **Design TMG Shield**: Prepare for Phase 6

## References

- [Phase 4 Completion Report](./REALITYOS_PHASE4_COMPLETE.md)
- [RealityOS Constitution](../REALITYOS_CONSTITUTION.md)
- [Event Ledger Documentation](./REALITYOS_PHASE2_COMPLETE.md)
- [Capture Gateway Documentation](./REALITYOS_PHASE3_COMPLETE.md)

