# TMG Shield - Business Requirements Analysis
## Week 11: Requirements Documentation

**Date**: 2025-02-20  
**Status**: 🟢 IN PROGRESS  
**Phase**: Phase 6 - Week 11  
**Vertical**: TMG Shield (Asset Management & Maintenance Compliance)

---

## Executive Summary

TMG Shield is a maintenance and asset management vertical for RealityOS, focusing on asset tracking, maintenance compliance, and audit trail generation. This document captures the business requirements for implementing TMG Shield as the second RealityOS vertical.

---

## 1. Business Context

### 1.1 Problem Statement

**Current State**:
- Asset management relies on manual tracking and paper records
- Maintenance schedules tracked in separate systems (SAP/Oracle)
- Compliance verification requires manual audit preparation
- No cryptographic proof of maintenance completion
- Contractor work verification lacks immutable records

**Desired State**:
- Immutable asset lifecycle tracking with QR verification
- Automated maintenance compliance monitoring
- Government-ready audit trails with cryptographic proof
- Human-verified contractor work records
- Real-time compliance status dashboard

### 1.2 Business Value

- **Compliance**: Government-ready audit documentation
- **Efficiency**: Automated compliance tracking reduces manual work
- **Trust**: Cryptographic proof of maintenance completion
- **Accountability**: Immutable records of contractor work
- **Visibility**: Real-time asset and maintenance status

---

## 2. Core Requirements

### 2.1 Asset Management

#### 2.1.1 Asset Registration

**Requirement**: Register physical assets with QR code verification

**Details**:
- Each asset must have a unique QR code
- Asset registration requires:
  - QR code scan (mandatory)
  - GPS location (mandatory)
  - Asset metadata (type, serial number, installation date)
  - Photo of asset (optional, max 2)
  - Timestamp (server-synced)

**Event Type**: `VERIFICATION`

**Proof Requirements**:
- ✅ QR code (mandatory)
- ✅ GPS coordinates (mandatory)
- ⚠️ Photos (optional, max 2)
- ✅ Timestamp (mandatory)

#### 2.1.2 Asset Location Tracking

**Requirement**: Track asset location changes

**Details**:
- Asset relocation requires new event
- Location changes must be verified with:
  - QR code scan (mandatory)
  - New GPS location (mandatory)
  - Photo of new location (optional)
  - Timestamp (mandatory)

**Event Type**: `VERIFICATION`

#### 2.1.3 Asset Status Monitoring

**Requirement**: Track asset operational status

**Status Types**:
- `OPERATIONAL` - Asset is in service
- `MAINTENANCE` - Asset is under maintenance
- `RETIRED` - Asset is decommissioned
- `OFFLINE` - Asset is temporarily unavailable

**Event Types**:
- `VERIFICATION` - Status change to OPERATIONAL
- `INSPECTION` - Status change to MAINTENANCE
- `OFF` - Status change to RETIRED or OFFLINE

#### 2.1.4 Asset Lifecycle Events

**Requirement**: Track complete asset lifecycle

**Lifecycle Stages**:
1. **Installation** - Asset installed and registered
2. **Inspection** - Regular inspections
3. **Maintenance** - Scheduled and unscheduled maintenance
4. **Decommission** - Asset retired/removed

**Event Types**:
- `VERIFICATION` - Installation, maintenance completion
- `INSPECTION` - Regular inspections, maintenance scheduled
- `OFF` - Decommission, retirement

---

### 2.2 Maintenance Compliance

#### 2.2.1 Scheduled Maintenance Tracking

**Requirement**: Track scheduled maintenance events

**Details**:
- Maintenance schedules imported from ERP (SAP/Oracle)
- Each scheduled maintenance has:
  - Asset ID
  - Scheduled date/time
  - Maintenance type
  - Required tasks
  - Contractor assignment (if applicable)

**Event Type**: `INSPECTION` (scheduled)

#### 2.2.2 Actual Maintenance Verification

**Requirement**: Verify maintenance completion with proof

**Details**:
- Maintenance completion requires:
  - QR code scan (mandatory)
  - GPS location (mandatory)
  - Photos of work completed (mandatory, max 2)
  - Contractor ID (mandatory if contractor work)
  - Timestamp (mandatory)
  - Maintenance checklist completion

**Event Type**: `VERIFICATION` (completed)

**Proof Requirements**:
- ✅ QR code (mandatory)
- ✅ GPS coordinates (mandatory)
- ✅ Photos (mandatory, max 2)
- ✅ Contractor ID (mandatory if applicable)
- ✅ Timestamp (mandatory)

#### 2.2.3 Compliance Reporting

**Requirement**: Generate compliance reports

**Compliance Metrics**:
- **On-Time**: Maintenance completed within scheduled window
- **Overdue**: Maintenance past due date
- **Missed**: Maintenance not completed
- **Compliance Rate**: Percentage of on-time maintenance

**Report Types**:
- Asset-level compliance
- Contractor-level compliance
- Overall compliance dashboard
- Audit-ready compliance reports

**Event Types**:
- `VERIFICATION` - Maintenance completed (on-time)
- `FAULT` - Maintenance overdue/missed
- `INSPECTION` - Compliance status check

---

### 2.3 Audit Trails

#### 2.3.1 Complete Event History

**Requirement**: Maintain complete, immutable event history for each asset

**Details**:
- Every asset action creates an event
- Events are cryptographically chained
- Events cannot be modified or deleted
- Events include full proof chain (QR, GPS, photos, timestamps)

**Event Types**: All event types contribute to audit trail

#### 2.3.2 Human Verification Records

**Requirement**: Record who verified each event

**Details**:
- Each event must have human verifier
- Verifier ID recorded in event
- QR code scan proves human presence
- GPS location proves physical presence
- Photos provide visual evidence

#### 2.3.3 Proof Chain

**Requirement**: Maintain cryptographic proof chain

**Proof Elements**:
- QR code hash
- GPS coordinates
- Photo hashes
- Timestamp (server-synced)
- Previous event hash (chain link)
- Event hash (cryptographic signature)

#### 2.3.4 Exportable Audit Reports

**Requirement**: Generate exportable audit reports

**Report Formats**:
- PDF (human-readable)
- JSON (machine-readable)
- CSV (spreadsheet-compatible)

**Report Contents**:
- Complete event history
- Proof chain verification
- Compliance status
- Contractor performance
- Asset lifecycle

---

### 2.4 Contractor Verification

#### 2.4.1 Contractor Work Verification

**Requirement**: Verify contractor work with proof

**Details**:
- Contractor work requires:
  - QR code scan (mandatory)
  - GPS location (mandatory)
  - Photos of completed work (mandatory, max 2)
  - Contractor ID (mandatory)
  - Work completion checklist
  - Timestamp (mandatory)

**Event Type**: `VERIFICATION`

#### 2.4.2 Work Quality Inspection

**Requirement**: Inspect contractor work quality

**Details**:
- Quality inspection requires:
  - Inspector ID (mandatory)
  - Inspection checklist
  - Quality rating
  - Photos of inspected work (optional)
  - GPS location (mandatory)
  - Timestamp (mandatory)

**Event Type**: `INSPECTION`

#### 2.4.3 Contractor Performance Tracking

**Requirement**: Track contractor performance metrics

**Metrics**:
- On-time completion rate
- Quality rating average
- Number of completed jobs
- Number of rejected jobs
- Average completion time

**Event Types**:
- `VERIFICATION` - Work completed
- `INSPECTION` - Quality inspection
- `FAULT` - Work rejected/needs rework

---

## 3. System Integration Requirements

### 3.1 ERP Integration

#### 3.1.1 SAP Integration (if applicable)

**Requirement**: Sync with SAP system

**Integration Points**:
- Asset master data sync (SAP → RealityOS)
- Maintenance schedule sync (SAP → RealityOS)
- Maintenance completion sync (RealityOS → SAP)
- Compliance report export (RealityOS → SAP)

**Pattern**: ERP Bridge (one-way: RealityOS → ERP)

#### 3.1.2 Oracle Integration (if applicable)

**Requirement**: Sync with Oracle system

**Integration Points**:
- Asset master data sync (Oracle → RealityOS)
- Maintenance schedule sync (Oracle → RealityOS)
- Maintenance completion sync (RealityOS → Oracle)
- Compliance report export (RealityOS → Oracle)

**Pattern**: ERP Bridge (one-way: RealityOS → ERP)

### 3.2 Mobile App Integration

**Requirement**: Mobile app for field workers

**Features**:
- QR code scanning
- GPS location capture
- Photo capture
- Maintenance checklist
- Offline capability
- Sync when online

---

## 4. Constitutional Requirements

### 4.1 Principle 1: Human-Verified Before System-Trusted

**Requirement**: All events require human verification

**Implementation**:
- QR code scan required for all asset verification
- Maintenance completion requires human verification
- Contractor work requires contractor ID
- No system-inferred events

### 4.2 Principle 2: Append-Only Reality

**Requirement**: No updates or deletes to events

**Implementation**:
- Events are immutable once created
- Status changes create new events
- No event modification allowed
- Database constraints enforce append-only

### 4.3 Principle 3: Cryptographic Chain of Custody

**Requirement**: Events must be cryptographically chained

**Implementation**:
- Events linked via `prev_hash`
- Proof hashes computed for all events
- Chain integrity verified automatically
- No chain breaks allowed

### 4.4 Principle 4: ERP is Consumer Not Source

**Requirement**: ERP systems consume events, don't create them

**Implementation**:
- One-way sync: RealityOS → ERP
- ERP Bridge pattern
- No ERP events create RealityOS events
- RealityOS is source of truth

### 4.5 Principle 5: Vertical Agnosticism

**Requirement**: Per-vertical isolation

**Implementation**:
- TMG vertical has separate signing key
- No cross-vertical data access
- Vertical isolation enforced
- Per-vertical event routing

### 4.6 Principle 6: No Admin Correction Flags

**Requirement**: No bypass mechanisms

**Implementation**:
- No admin override features
- No bypass mechanisms
- Constitutional compliance cannot be bypassed
- All events must pass validation

---

## 5. Proof Requirements

### 5.1 Asset Verification

**Required Proof Elements**:
- ✅ QR code (mandatory)
- ✅ GPS coordinates (mandatory)
- ⚠️ Photos (optional, max 2)
- ✅ Timestamp (mandatory, server-synced)

### 5.2 Maintenance Completion

**Required Proof Elements**:
- ✅ QR code (mandatory)
- ✅ GPS coordinates (mandatory)
- ✅ Photos (mandatory, max 2)
- ✅ Contractor ID (mandatory if contractor work)
- ✅ Timestamp (mandatory, server-synced)

### 5.3 Contractor Work

**Required Proof Elements**:
- ✅ QR code (mandatory)
- ✅ GPS coordinates (mandatory)
- ✅ Photos (mandatory, max 2)
- ✅ Contractor ID (mandatory)
- ✅ Timestamp (mandatory, server-synced)

---

## 6. Event Type Mapping

### 6.1 Core Event Types

| Event Type | Use Case | Proof Requirements |
|------------|----------|-------------------|
| `VERIFICATION` | Asset registration, maintenance completion, contractor work | QR + GPS + (Photos if maintenance/contractor) |
| `INSPECTION` | Asset inspection, maintenance scheduled, quality inspection | QR + GPS + (Photos optional) |
| `FAULT` | Maintenance overdue, work rejected | QR + GPS + (Photos optional) |
| `OFF` | Asset decommissioned, retired | QR + GPS + (Photos optional) |

### 6.2 Event Payload Structure

**Asset Registration**:
```json
{
  "asset_id": "string",
  "asset_type": "string",
  "serial_number": "string",
  "installation_date": "datetime",
  "location": {
    "latitude": "float",
    "longitude": "float",
    "accuracy_meters": "float"
  }
}
```

**Maintenance Completion**:
```json
{
  "asset_id": "string",
  "maintenance_type": "string",
  "scheduled_date": "datetime",
  "completed_date": "datetime",
  "contractor_id": "string (if applicable)",
  "checklist_completed": "boolean",
  "location": {
    "latitude": "float",
    "longitude": "float",
    "accuracy_meters": "float"
  }
}
```

---

## 7. Success Criteria

### 7.1 Functional Requirements

- ✅ Asset registration with QR verification
- ✅ Asset location tracking
- ✅ Maintenance schedule tracking
- ✅ Maintenance completion verification
- ✅ Compliance reporting
- ✅ Audit trail generation
- ✅ Contractor work verification
- ✅ ERP integration (SAP/Oracle)

### 7.2 Performance Requirements

- ✅ Event creation: <100ms
- ✅ Rule lookup: <10ms
- ✅ ERP sync: <5s
- ✅ Dashboard load: <2s
- ✅ No performance degradation to platform

### 7.3 Quality Requirements

- ✅ Test coverage: >90%
- ✅ Constitutional compliance: 100%
- ✅ Documentation: Complete
- ✅ Pilot validation: Successful

---

## 8. Open Questions

### 8.1 Stakeholder Questions

1. **ERP System**: Which ERP system does TMG use? (SAP, Oracle, other?)
2. **Asset Types**: What types of assets need to be tracked?
3. **Maintenance Types**: What are the different maintenance types?
4. **Contractor Management**: How are contractors managed? (separate system?)
5. **Pilot Site**: Which site will be used for pilot deployment?

### 8.2 Technical Questions

1. **Mobile App**: Is there an existing mobile app, or should we build one?
2. **QR Code Format**: What format should QR codes use?
3. **Photo Storage**: Where should photos be stored? (Supabase Storage?)
4. **Notification System**: How should maintenance reminders be sent?
5. **Reporting**: What reporting formats are required?

---

## 9. Next Steps

### Week 11 (Remaining)

- [ ] Schedule stakeholder meetings
- [ ] Answer open questions
- [ ] Document existing systems analysis
- [ ] Complete event mapping
- [ ] Finalize proof requirements

### Week 12

- [ ] Design TMG vertical structure
- [ ] Design event types
- [ ] Design validation rules
- [ ] Create vertical skeleton
- [ ] Design ERP integration points

---

## 10. References

- [RealityOS Constitution](../REALITYOS_CONSTITUTION.md)
- [Phase 6 Preparation Guide](./REALITYOS_PHASE6_TMG_SHIELD_PREPARATION.md)
- [RealityOS Platform Architecture](./REALITYOS_PLATFORM_ARCHITECTURE.md)
- [Almona Vertical Implementation](../vertical_almona/) (reference)

---

**Status**: 🟢 IN PROGRESS - Week 11 Requirements Analysis  
**Next Update**: After stakeholder meetings

