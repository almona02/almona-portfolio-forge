# TMG IOMS: Technical Architecture Diagrams
## Visual Architecture Documentation

**Date**: 2025-02-20  
**Purpose**: Visual representation of TMG IOMS architecture  
**Audience**: Technical teams, Integration teams, Architects

---

## Diagram 1: High-Level Conceptual Architecture
### For Executive Presentation (Slide 3)

**Purpose**: Show roles and relationships between IOMS, SAP, and operational reality

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATIONAL REALITY                           │
│         (Physical World: Hotels, Malls, Sites, Assets)           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Human Actions: Maintenance, Inspections, Asset Movement  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│         TMG IOMS: Reality-Verified Operations Platform           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Capture & Verify Layer                                    │  │
│  │  • QR Code Scanning                                         │  │
│  │  • GPS Location Capture                                    │  │
│  │  • Photo Evidence                                           │  │
│  │  • Timestamp Validation                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TMG Shield Vertical (RealityOS)                           │  │
│  │  Constitutional Core: 6 Immutable Principles               │  │
│  │  • Human-Verified Before System-Trusted                     │  │
│  │  • Append-Only Reality                                     │  │
│  │  • Cryptographic Chain of Custody                         │  │
│  │  • ERP is Consumer Not Source                              │  │
│  │  • Vertical Agnosticism                                    │  │
│  │  • No Admin Override                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Operational Truth Ledger                                 │  │
│  │  • Assets (50,000+)                                       │  │
│  │  • Maintenance Events                                     │  │
│  │  • Project Milestones                                     │  │
│  │  • Contractor Work                                        │  │
│  │  • Immutable Audit Trail                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  SAP S/4HANA                  │  │  Executive Intelligence      │
│  Financial System of Record   │  │  Dashboard                   │
│                               │  │                              │
│  ┌─────────────────────────┐ │  │  • Real-time KPIs            │
│  │  Plant Maintenance (PM)  │ │  │  • Asset Status              │
│  └─────────────────────────┘ │  │  • Compliance Metrics        │
│  ┌─────────────────────────┐ │  │  • Project Visibility        │
│  │  Material Management(MM)│ │  │  • Decision Support          │
│  └─────────────────────────┘ │  │                              │
│  ┌─────────────────────────┐ │  │  (All Certified, All Provable)│
│  │  Project Systems (PS)   │ │  │                              │
│  └─────────────────────────┘ │  │                              │
│  ┌─────────────────────────┐ │  │                              │
│  │  Finance (FI/CO)        │ │  │                              │
│  └─────────────────────────┘ │  │                              │
└───────────────────────────────┘  └───────────────────────────────┘

DATA FLOW:
----------
1. Human Action → Capture & Verify (QR, GPS, Photos)
2. Capture → TMG Shield Vertical (Constitutional Validation)
3. TMG Shield → Operational Truth Ledger (Immutable Record)
4. Truth Ledger → SAP (Verified Events, One-Way Sync)
5. Truth Ledger → Executive Dashboard (Real-time KPIs)
6. SAP → Finance (Financial Postings)

KEY TAKEAWAY:
-------------
IOMS sits between operational reality and financial system,
ensuring only verified truth enters SAP. It makes SAP better.
```

---

## Diagram 2: Detailed Integration & Data Flow Architecture
### For Technical Review and Integration Planning

**Purpose**: Show technology stack, data flows, and integration points

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TMG END-USERS (Mobile App / Web - React PWA)                            │
│                                                                         │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│ │ Maintenance  │  │ Site Manager │  │ Contractor   │  │ Executive    ││
│ │ Technician   │  │              │  │              │  │              ││
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└──────────┬───────────────────┬───────────────────┬──────────────────────┘
           │                   │                   │
           │ (UI/UX)           │ (Real-time)       │ (API Calls)
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ IOMS PLATFORM (Hosted on AWS/Azure - Docker/Kubernetes)                 │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Frontend Layer (React + TypeScript)                                 │ │
│ │ • Web Dashboard                                                     │ │
│ │ • Mobile App (React Native)                                         │ │
│ │ • Executive Intelligence Dashboard                                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ API Gateway (FastAPI)                                                │ │
│ │ • Authentication & Authorization                                    │ │
│ │ • Rate Limiting                                                     │ │
│ │ • Request Routing                                                   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Backend Services (Python FastAPI)                                    │ │
│ │                                                                     │ │
│ │ ┌──────────────────┐   ┌──────────────────────────┐                │ │
│ │ │ Business Logic   │──▶│  TMG Shield Vertical    │                │ │
│ │ │ Services         │   │  (RealityOS Plugin)     │                │ │
│ │ │                  │   │                         │                │ │
│ │ │ • Asset Mgmt     │   │  ┌────────────────────┐ │                │ │
│ │ │ • Maintenance   │   │  │ TMGAssetRule       │ │                │ │
│ │ │ • Projects      │   │  │ TMGMaintenanceRule │ │                │ │
│ │ │ • Contractors  │   │  │ TMGAuditRule       │ │                │ │
│ │ └──────────────────┘   │  └────────────────────┘ │                │ │
│ │                        │                         │                │ │
│ │                        │  Constitutional Core   │                │ │
│ │                        │  • Principle 1-6       │                │ │
│ │                        │  • Event Validation    │                │ │
│ │                        │  • Proof Verification  │                │ │
│ │                        └─────────────────────────┘                │ │
│ │                              │                                     │ │
│ │                              ▼                                     │ │
│ │ ┌──────────────────────────────────────────────────────────────┐ │ │
│ │ │ AI/ML Services (TensorFlow.js, ONNX)                          │ │ │
│ │ │ • Predictive Maintenance                                     │ │ │
│ │ │ • Demand Forecasting                                          │ │ │
│ │ │ • Anomaly Detection                                            │ │ │
│ │ │ (Subordinate Intelligence - Advisory Only)                     │ │ │
│ │ └──────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ PostgreSQL Database (Supabase)                                       │ │
│ │                                                                     │ │
│ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│ │ │ Immutable Event Ledger                                        │   │ │
│ │ │ • Events (append-only, cryptographically chained)              │   │ │
│ │ │ • prev_hash links (chain integrity)                           │   │ │
│ │ │ • Proof hashes (QR, GPS, photos)                              │   │ │
│ │ └──────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│ │ │ Canonical Truth Schemas                                       │   │ │
│ │ │ • Asset Truth (50,000+ assets)                                │   │ │
│ │ │ • Maintenance Truth (schedules, completions)                  │   │ │
│ │ │ • Project Truth (milestones, progress)                        │   │ │
│ │ │ • Contractor Truth (work records)                             │   │ │
│ │ └──────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ │ ┌──────────────────────────────────────────────────────────────┐   │ │
│ │ │ Cryptographic Hashes                                          │   │ │
│ │ │ • Event hashes (HMAC-SHA256)                                  │   │ │
│ │ │ • Proof hashes (QR, GPS, photos)                              │   │ │
│ │ │ • Chain verification                                          │   │ │
│ │ └──────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Middleware & SAP Integration Gateway                                      │
│ (SAP PI/PO, MuleSoft, or Custom Kafka-based)                             │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Data Transformation & Mapping                                        │ │
│ │ • IOMS Events → SAP Structures                                       │ │
│ │ • Event Type Mapping (VERIFICATION → PM Work Order)                 │ │
│ │ • Payload Transformation                                             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ API Call Orchestration & Scheduling                                  │ │
│ │ • Real-time Sync (critical events)                                  │ │
│ │ • Nightly Batches (bulk updates)                                     │ │
│ │ • Error Handling & Retry Logic                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Integration Protocols:                                                  │
│ • OData (RESTful, read operations)                                     │
│ • BAPI (Business Application Programming Interface)                    │
│ • RFC (Remote Function Call)                                           │
│ • IDoc (Intermediate Document, batch)                                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         (Secure, Audited, One-Way Communication)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SAP S/4HANA CORE (Financial System of Record)                            │
│                                                                         │
│ ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐│
│ │ PM Module    │◀──│ MM Module    │◀──│ PS Module    │◀──│ FI/CO      ││
│ │ (Work Orders)│   │(Goods Issue) │   │ (Milestones) │   │ (Postings) ││
│ │              │   │              │   │              │   │            ││
│ │ • Maintenance│   │ • Material    │   │ • Projects   │   │ • Finance  ││
│ │   Scheduling│   │   Movement    │   │   Progress   │   │ • Costing  ││
│ │ • Completion │   │ • Inventory  │   │   Tracking   │   │ • Reporting ││
│ └──────────────┘   └──────────────┘   └──────────────┘   └────────────┘│
│                                                                         │
│ SAP Remains: Financial System of Record                                │
│ IOMS Feeds: Verified Operational Truth                                 │
└─────────────────────────────────────────────────────────────────────────┘

DATA FLOW SUMMARY:
------------------
1. REALITY CAPTURE:
   Maintenance tech scans QR code using IOMS mobile app
   → App captures: QR data, GPS location, photos, timestamp

2. VERIFICATION:
   IOMS Backend receives request
   → Validates with TMG Shield Vertical (constitutional rules)
   → Checks proof requirements (QR, GPS, photos)
   → Validates against deterministic constraints

3. IMMUTABLE LOGGING:
   TMG Shield creates new event
   → Computes cryptographic hash
   → Links to previous event (prev_hash)
   → Stores in PostgreSQL Event Ledger (append-only)

4. INTELLIGENCE (Optional):
   Event may trigger AI service
   → Updates predictive maintenance model
   → Provides advisory suggestions (subordinate intelligence)

5. REAL-TIME UPDATE:
   Event stored in ledger
   → WebSocket notification sent
   → User dashboard updated in real-time
   → Executive dashboard reflects new data

6. SAP SYNC:
   Middleware Gateway polls for new verified events
   → Transforms IOMS event to SAP structure
   → Maps event types (VERIFICATION → PM Work Order)
   → Schedules API call (real-time or batch)

7. TRANSFORMATION:
   Gateway transforms IOMS event
   → "Maintenance Complete" → BAPI call to PM module
   → "Material Usage" → Goods Issue to MM module
   → "Project Milestone" → Progress update to PS module

8. FINANCIAL RECORD:
   SAP processes transaction
   → PM/MM/PS modules update
   → FI/CO module posts financial record
   → SAP remains source of financial truth

KEY ARCHITECTURAL PRINCIPLES:
------------------------------
✅ One-Way Sync: IOMS → SAP (ERP is consumer, not source)
✅ Constitutional Validation: All events pass TMG Shield rules
✅ Immutable Records: Append-only ledger, cryptographic chain
✅ Real-Time Visibility: Executive dashboards updated immediately
✅ Human Verification: QR, GPS, photos required for all events
✅ Vertical Isolation: TMG Shield isolated from other verticals
```

---

## Diagram 3: TMG Shield Vertical Architecture
### For Technical Implementation Teams

**Purpose**: Show TMG Shield vertical structure within RealityOS platform

```
┌─────────────────────────────────────────────────────────────────┐
│                    RealityOS Platform Core                       │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Constitutional Core                                        │  │
│ │ • 6 Immutable Principles                                   │  │
│ │ • Cryptographic Primitives (HMAC-SHA256)                  │  │
│ │ • Event Ledger (append-only, chained)                     │  │
│ │ • Capture Gateway (QR, GPS, photo validation)             │  │
│ └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Vertical Registry                                          │  │
│ │ • Plugin Management                                        │  │
│ │ • Constitutional Compliance Checking                      │  │
│ │ • Rule Class Loading                                       │  │
│ │ • Event Type Routing                                       │  │
│ └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  Almona Vertical (v1.0.0)      │  │  TMG Shield Vertical (v0.1.0) │
│  (Fabrication Domain)           │  │  (Operations Domain)          │
│                                 │  │                               │
│  ┌───────────────────────────┐ │  │  ┌───────────────────────────┐│
│  │ AlmonaCalibrationRule     │ │  │  │ TMGAssetRule             ││
│  │ • Calibration events      │ │  │  │ • Asset verification     ││
│  │ • K-factor validation     │ │  │  │ • QR code required       ││
│  └───────────────────────────┘ │  │  │ • GPS location required  ││
│                                 │  │  └───────────────────────────┘│
│  ┌───────────────────────────┐ │  │                               │
│  │ AlmonaAnomalyRule         │ │  │  ┌───────────────────────────┐│
│  │ • Anomaly detection      │ │  │  │ TMGMaintenanceRule       ││
│  │ • Drift monitoring        │ │  │  │ • Maintenance compliance ││
│  └───────────────────────────┘ │  │  │ • Scheduled vs actual    ││
│                                 │  │  │ • Photos required       ││
│  Event Types:                   │  │  └───────────────────────────┘│
│  • CALIBRATION                  │  │                               │
│  • ANOMALY                      │  │  ┌───────────────────────────┐│
│                                 │  │  │ TMGAuditRule             ││
│  Vertical ID:                   │  │  │ • Audit trail generation ││
│  "almona_vertical"              │  │  │ • Complete event history  ││
│                                 │  │  │ • Exportable reports      ││
│  Signing Key:                   │  │  └───────────────────────────┘│
│  Per-vertical (isolated)        │  │                               │
│                                 │  │  Event Types:                │
│                                 │  │  • VERIFICATION              │
│                                 │  │  • INSPECTION                │
│                                 │  │  • FAULT                     │
│                                 │  │  • OFF                       │
│                                 │  │                               │
│                                 │  │  Vertical ID:                 │
│                                 │  │  "tmg_shield"                │
│                                 │  │                               │
│                                 │  │  Signing Key:                │
│                                 │  │  Per-vertical (isolated)     │
└─────────────────────────────────┘  └───────────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Event Ledger          │
                    │  (Shared, Partitioned) │
                    │  • Almona events       │
                    │  • TMG Shield events   │
                    │  • Vertical isolation  │
                    └───────────────────────┘

KEY PRINCIPLES:
---------------
✅ Vertical Agnosticism: Each vertical isolated
✅ Per-Vertical Secrets: Separate signing keys
✅ No Cross-Vertical Access: Data isolation enforced
✅ Constitutional Compliance: All verticals pass checks
✅ Multi-Vertical Platform: Unlimited verticals possible
```

---

## Diagram 4: Proof Chain & Verification Flow
### For Audit and Compliance Teams

**Purpose**: Show how human verification creates provable audit trails

```
HUMAN ACTION (Physical World)
    │
    │ Maintenance technician arrives at asset location
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 1: CAPTURE (Mobile App)                             │
│                                                          │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│ │ QR Scan    │  │ GPS Capture│  │ Photo      │        │
│ │ (Mandatory)│  │ (Mandatory)│  │ (Required) │        │
│ └────────────┘  └────────────┘  └────────────┘        │
│                                                          │
│ Proof Elements Collected:                              │
│ • QR Code Data: "ASSET-12345"                           │
│ • GPS: 31.2000°N, 29.9167°E (±5m accuracy)             │
│ • Photos: 2 images (before/after)                        │
│ • Timestamp: 2025-02-20T14:30:00Z (server-synced)      │
│ • Contractor ID: "CONTRACTOR-789"                       │
└─────────────────────────────────────────────────────────┘
    │
    │ Proof elements sent to IOMS Backend
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 2: VALIDATION (TMG Shield Vertical)                 │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Constitutional Validation                          │  │
│ │ • Principle 1: Human verification present? ✅     │  │
│ │ • Principle 2: Append-only (new event)? ✅        │  │
│ │ • Principle 3: Chain integrity? ✅                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ TMG Shield Rule Validation                         │  │
│ │ • TMGAssetRule: Asset exists? ✅                   │  │
│ │ • TMGMaintenanceRule: Maintenance valid? ✅        │  │
│ │ • Proof requirements met? ✅                       │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Validation Result: ✅ PASS                              │
└─────────────────────────────────────────────────────────┘
    │
    │ Event validated, ready for ledger
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 3: CRYPTOGRAPHIC HASHING                            │
│                                                          │
│ Event Data:                                              │
│ • Event Type: VERIFICATION                               │
│ • Asset ID: ASSET-12345                                 │
│ • Maintenance Type: Preventive                           │
│ • Proof Elements: [QR, GPS, Photos, Timestamp]          │
│ • Previous Event Hash: "abc123..."                      │
│                                                          │
│ Hash Computation:                                         │
│ event_hash = HMAC-SHA256(                                │
│   event_data + prev_hash + vertical_secret              │
│ )                                                        │
│                                                          │
│ Result: "def456..." (cryptographic signature)            │
└─────────────────────────────────────────────────────────┘
    │
    │ Event hash computed, ready for ledger
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 4: IMMUTABLE LEDGER ENTRY                           │
│                                                          │
│ Event Record:                                            │
│ {                                                        │
│   "event_id": "EVT-789012",                            │
│   "vertical_id": "tmg_shield",                          │
│   "event_type": "VERIFICATION",                         │
│   "asset_id": "ASSET-12345",                            │
│   "prev_hash": "abc123...",                             │
│   "event_hash": "def456...",                            │
│   "proof_hash": "ghi789...",                            │
│   "timestamp": "2025-02-20T14:30:00Z",                  │
│   "created_at": "2025-02-20T14:30:01Z",                 │
│   "payload": { ... }                                    │
│ }                                                        │
│                                                          │
│ Database Constraint:                                     │
│ • PRIMARY KEY (event_id)                                │
│ • UNIQUE (event_hash)                                    │
│ • FOREIGN KEY (prev_hash) REFERENCES events(event_hash)  │
│ • CHECK (created_at >= timestamp)                       │
│                                                          │
│ Result: Immutable, cryptographically chained record     │
└─────────────────────────────────────────────────────────┘
    │
    │ Event stored, chain updated
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 5: PROOF CHAIN VERIFICATION                         │
│                                                          │
│ Chain Integrity Check:                                   │
│ • Event 1: prev_hash = NULL, event_hash = "abc123..."    │
│ • Event 2: prev_hash = "abc123...", event_hash = "def456..."│
│ • Event 3: prev_hash = "def456...", event_hash = "ghi789..."│
│                                                          │
│ Verification:                                            │
│ • Each event links to previous ✅                       │
│ • Hash chain unbroken ✅                                │
│ • No gaps or modifications ✅                           │
│                                                          │
│ Result: Complete, provable audit trail                   │
└─────────────────────────────────────────────────────────┘
    │
    │ Chain verified, audit trail complete
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ STEP 6: AUDIT EXPORT                                     │
│                                                          │
│ Export Formats:                                          │
│ • PDF: Human-readable audit report                       │
│ • JSON: Machine-readable event data                     │
│ • CSV: Spreadsheet-compatible format                     │
│                                                          │
│ Audit Report Contents:                                   │
│ • Complete event history                                 │
│ • Proof chain verification                               │
│ • Cryptographic signatures                               │
│ • Human verification records                             │
│ • Compliance status                                      │
│                                                          │
│ Result: Government-ready audit documentation             │
└─────────────────────────────────────────────────────────┘

KEY GUARANTEES:
---------------
✅ Human Verification: QR, GPS, photos prove human presence
✅ Cryptographic Chain: Events linked via prev_hash
✅ Immutable Records: Append-only, cannot be modified
✅ Provable Truth: Cryptographic proof, not he-said-she-said
✅ Audit-Ready: Complete documentation exportable
```

---

## Diagram 5: SAP Integration Data Flow
### For SAP Integration Teams

**Purpose**: Show detailed SAP integration patterns and data transformation

```
┌─────────────────────────────────────────────────────────────────┐
│ IOMS Event Ledger (PostgreSQL)                                   │
│                                                                 │
│ New Verified Event:                                             │
│ {                                                                │
│   "event_type": "VERIFICATION",                                 │
│   "asset_id": "ASSET-12345",                                    │
│   "maintenance_type": "Preventive",                             │
│   "completed_at": "2025-02-20T14:30:00Z",                        │
│   "contractor_id": "CONTRACTOR-789",                            │
│   "proof": { "qr": "...", "gps": "...", "photos": [...] }      │
│ }                                                                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Middleware Gateway (SAP PI/PO or Custom)                          │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Event Polling (Scheduled or Real-time)                      │ │
│ │ • Polls IOMS for new verified events                        │ │
│ │ • Filters by sync status (not yet synced)                   │ │
│ │ • Batches events for efficiency                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Data Transformation                                         │ │
│ │                                                             │ │
│ │ IOMS Event Structure:                                      │ │
│ │ {                                                           │ │
│ │   event_type: "VERIFICATION"                               │ │
│ │   asset_id: "ASSET-12345"                                  │ │
│ │   maintenance_type: "Preventive"                            │ │
│ │   completed_at: "2025-02-20T14:30:00Z"                     │ │
│ │ }                                                           │ │
│ │                                                             │ │
│ │         ↓ Transformation Logic ↓                           │ │
│ │                                                             │ │
│ │ SAP BAPI Structure:                                        │ │
│ │ {                                                           │ │
│ │   BAPI: "BAPI_ALM_ORDER_OPERATION_COMPLETE"                │ │
│ │   ORDERID: "PM-ORDER-12345" (mapped from asset_id)         │ │
│ │   OPERATION: "0010" (maintenance operation)                │ │
│ │   CONFIRMATION_DATE: "2025-02-20"                          │ │
│ │   CONFIRMATION_TIME: "14:30:00"                           │ │
│ │   CONFIRMED_BY: "CONTRACTOR-789"                           │ │
│ │ }                                                           │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ API Call Orchestration                                      │ │
│ │                                                             │ │
│ │ Protocol Selection:                                         │ │
│ │ • BAPI (for PM work orders)                                 │ │
│ │ • IDoc (for bulk material movements)                        │ │
│ │ • RFC (for real-time confirmations)                         │ │
│ │ • OData (for read operations)                               │ │
│ │                                                             │ │
│ │ Error Handling:                                             │ │
│ │ • Retry logic (3 attempts)                                  │ │
│ │ • Dead letter queue                                       │ │
│ │ • Error logging and alerting                                 │ │
│ └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        (Secure, Authenticated, One-Way Communication)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ SAP S/4HANA (Financial System of Record)                         │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Plant Maintenance (PM) Module                               │ │
│ │                                                             │ │
│ │ BAPI Call: BAPI_ALM_ORDER_OPERATION_COMPLETE              │ │
│ │ • Work Order: PM-ORDER-12345                               │ │
│ │ • Operation: 0010 (Maintenance Complete)                   │ │
│ │ • Confirmation Date/Time: 2025-02-20 14:30:00              │ │
│ │ • Confirmed By: CONTRACTOR-789                            │ │
│ │                                                             │ │
│ │ Result:                                                    │ │
│ │ • Work order status: COMPLETED                             │ │
│ │ • Actual completion time recorded                          │ │
│ │ • Cost center updated                                      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Material Management (MM) Module                           │ │
│ │                                                             │ │
│ │ Goods Issue (if material used):                            │ │
│ │ • Material: SPARE-PART-ABC                                 │ │
│ │ • Quantity: 2 units                                        │ │
│ │ • Cost Center: MAINTENANCE-CC                              │ │
│ │                                                             │ │
│ │ Result:                                                    │ │
│ │ • Inventory reduced                                        │ │
│ │ • Cost allocated                                           │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Finance (FI/CO) Module                                     │ │
│ │                                                             │ │
│ │ Financial Postings:                                        │ │
│ │ • Maintenance Cost: $500                                   │ │
│ │ • Material Cost: $200                                      │ │
│ │ • Total: $700                                              │ │
│ │                                                             │ │
│ │ Result:                                                    │ │
│ │ • Financial record created                                 │ │
│ │ • Cost center updated                                      │ │
│ │ • General ledger posted                                    │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

INTEGRATION PATTERNS:
---------------------
✅ One-Way Sync: IOMS → SAP (ERP is consumer)
✅ Verified Data: Only verified events enter SAP
✅ Transformation: IOMS events → SAP structures
✅ Error Handling: Retry, dead letter queue, logging
✅ Audit Trail: All sync operations logged
```

---

## Usage Instructions

### For Executive Presentations

**Use**: Diagram 1 (High-Level Conceptual Architecture)
- Slide 3 of Executive Deck
- Shows roles and relationships
- Non-technical audience

### For Technical Reviews

**Use**: Diagram 2 (Detailed Integration & Data Flow)
- Technical appendices
- Integration planning
- Architecture reviews

### For Implementation Teams

**Use**: Diagram 3 (TMG Shield Vertical Architecture)
- Phase 6 implementation
- Vertical plugin development
- Constitutional compliance

### For Audit Teams

**Use**: Diagram 4 (Proof Chain & Verification Flow)
- Compliance reviews
- Audit documentation
- Governance validation

### For SAP Integration Teams

**Use**: Diagram 5 (SAP Integration Data Flow)
- Integration planning
- BAPI/RFC/IDoc design
- Error handling strategy

---

## Visual Recreation

These diagrams can be recreated in:
- **PowerPoint**: For executive presentations
- **Visio**: For technical documentation
- **Miro/Lucidchart**: For collaborative design
- **Draw.io**: For open-source diagramming

**Recommendation**: Use Diagram 1 for executive deck, Diagram 2 for technical documentation.

---

**Document Status**: Complete - Ready for Visual Recreation  
**Next Action**: Recreate diagrams in preferred tool, integrate into documents

