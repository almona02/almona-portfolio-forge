# RealityOS Constitution
**Version: 1.0 | Status: IMMUTABLE | Effective: 2025-02-20**

> "The Core is Sacred. It verifies reality; it does not interpret it."

---

## PREAMBLE

This document is the architectural constitution of RealityOS. It defines the immutable principles that govern all core development, vertical integrations, and platform evolution. These principles are not guidelines—they are the foundation upon which all RealityOS systems are built.

**Authority:** This constitution supersedes all other architectural decisions, feature requests, and business requirements. Any code, design, or request that violates these principles must be rejected, regardless of business value or client pressure.

**Scope:** This constitution applies to:
- The RealityOS Core Engine (`realityos_core/`)
- All vertical plugins and integrations
- All database schemas and constraints
- All API contracts and interfaces
- All deployment and operational procedures

---

## CORE IMMUTABLE PRINCIPLES (CANNOT BE CHANGED)

### Principle 1: Human-Verified Before System-Trusted
> "If a human didn't verify it, it doesn't exist as truth."

**REQUIREMENT:** Every event recorded in RealityOS must have explicit human verification. This verification consists of:
- **QR Code Scan**: Proof of human presence at the physical location
- **Photo Capture** (optional but recommended): Visual evidence of the physical reality (maximum 2 photos per event)
- **GPS Coordinates**: Geographic proof of location (with geofence validation)
- **Timestamp**: Temporal proof of when verification occurred
- **Verified By**: Identity of the human who performed the verification

**EXCEPTION:** None. Even sensor data, IoT readings, or automated systems require human confirmation before being recorded as truth.

**ENFORCEMENT:**
- Database constraint: Events without `verified_by` field are rejected at INSERT time
- Application validation: `RealityCaptureGateway` validates all four components before accepting events
- Audit trail: All verification failures are logged as security anomalies

**Rationale:** Machines can malfunction, sensors can drift, systems can be compromised. Only human verification provides the irreducible proof that something actually happened in physical reality.

**Violation Consequence:** Event rejected at database level, logged as security anomaly, transaction rolled back.

---

### Principle 2: Append-Only Reality
> "Truth can be corrected, but never deleted."

**REQUIREMENT:** The RealityOS event ledger is append-only. Once an event is recorded, it cannot be deleted or modified.

**ENFORCEMENT:**
- Database-level: `DELETE` and `UPDATE` permissions are permanently revoked on all event tables
- Application-level: No code path exists that can modify or delete events
- Schema-level: Event tables have no `updated_at` fields (only `created_at`)

**CORRECTION PATTERN:**
When an event is discovered to be incorrect:
1. A new event is created with `correction_of: <original_event_hash>`
2. The new event contains the corrected information
3. The original event remains in the chain, marked as `superseded_by: <new_event_hash>`
4. Chain integrity is maintained through hash references
5. Confidence scores may be adjusted, but original event is never modified

**Example:**
```
Event A (hash: abc123): "Asset ON at 10:00"
Event B (hash: def456): "CORRECTION: Asset was actually OFF at 10:00, correction_of: abc123"
```

**Rationale:** Deletion or modification of events destroys audit trail integrity. Corrections via new events preserve the complete history while allowing truth to evolve.

**Violation Consequence:** Database constraint violation, transaction rollback, security alert, immediate code review rejection.

---

### Principle 3: Cryptographic Chain of Custody
> "Every piece of truth knows its parent."

**REQUIREMENT:** Every event in RealityOS is cryptographically chained to its predecessor via SHA-256 hash linkage.

**IMPLEMENTATION:**
- Each event contains a `prev_hash` field referencing the previous event's hash
- Each event's hash is computed as: `SHA-256(prev_hash + event_type + payload + proof + timestamp + nonce)`
- The first event in any chain has `prev_hash = NULL` (genesis event)
- Chain position is tracked via `chain_position` (auto-incrementing integer)

**VERIFICATION:**
- Daily automated job (`ChainVerifier`) walks the entire event chain
- Verifies each event's hash matches the computed hash
- Detects any tampering, corruption, or missing links
- Alerts security team immediately on chain break

**ENFORCEMENT:**
- Database constraint: `prev_hash` must reference a valid existing event hash (or be NULL for genesis)
- Application validation: Hash computation is mandatory before event insertion
- Chain verification: Automated daily checks with alerting

**Rationale:** Cryptographic chaining provides tamper-proof integrity. Any modification to any event in the chain breaks the hash, making tampering immediately detectable.

**Violation Consequence:** Chain broken → immediate freeze of all write operations, security lockdown, forensic investigation initiated.

---

### Principle 4: ERP is Consumer, Not Source
> "ERP records financial truth; we record operational truth."

**RULE:** RealityOS is the source of operational truth. ERP systems consume verified events from RealityOS; they never feed unverified data back into RealityOS.

**DIRECTION:** One-way sync only: `RealityOS → ERP`

**IMPLEMENTATION:**
- `ErpBridge` pattern: RealityOS events are transformed into ERP-compatible formats
- ERP adapters: SAP, Odoo, Oracle adapters receive verified events as read-only feeds
- ERP audit log: All dispatches to ERP are logged with idempotency keys
- No reverse sync: ERP data never enters RealityOS event ledger

**BOUNDARY:**
- ERP systems may provide reference data (customer IDs, product codes) for event enrichment
- ERP systems may provide configuration data (pricing, tax rates) for calculations
- ERP systems may NOT provide operational events (maintenance completed, asset status) that bypass verification

**EXCEPTION:** None. This is a hard architectural boundary.

**Rationale:** ERP systems are designed for financial accounting, not operational verification. Mixing verified operational truth with unverified ERP data corrupts the entire system.

**Violation Consequence:** Code review rejection, architecture violation alert, immediate rejection of pull request.

---

### Principle 5: Vertical Agnosticism
> "The core verifies; verticals interpret."

**RULE:** The RealityOS Core Engine knows nothing about specific domains (fabrication, construction, maintenance, assets). It only knows about generic concepts: events, proof, rules, and chains.

**PATTERN:** All domain-specific logic must live in vertical plugins. The Core imports and validates verticals; verticals never import from Core.

**IMPLEMENTATION:**
- Core provides: Event ledger, cryptographic verification, chain integrity, proof validation
- Verticals provide: Domain rules, event type definitions, business logic, UI components
- Plugin contract: Every vertical must extend `BaseRealityRule`, provide manifest, export required interfaces
- Core validates: Plugin compatibility, core version requirements, inheritance compliance

**VERTICAL CONTRACT:**
```python
class VerticalContract:
    """What every vertical MUST provide."""
    
    REQUIRED_EXPORTS = [
        'EVENT_TYPES',      # List of event types this vertical uses
        'RULES',           # List of Rule classes (must extend BaseRealityRule)
        'VALIDATORS',      # Functions to validate event payloads
        'MANIFEST',        # Metadata about the vertical (version, dependencies)
    ]
    
    REQUIRED_INTERFACES = [
        'Rule',           # Must extend BaseRealityRule
        'Validator',      # Must extend BaseValidator
        'DashboardWidget' # Optional: UI components
    ]
```

**ENFORCEMENT:**
- Import direction: Core → Vertical (never reverse)
- Dependency check: Verticals declare core version requirements
- Registration: VerticalRegistry validates all plugins before loading
- Isolation: Verticals run in separate containers/processes where possible

**Rationale:** Core agnosticism enables platform scalability. New verticals can be added without modifying core code. Core remains stable while verticals evolve.

**Violation Consequence:** Plugin load failure, vertical rejected at registration, code review rejection.

---

### Principle 6: No Admin Correction Flags
> "There is no 'admin corrected' state. There is only new truth or lower confidence truth."

**BAN:** The following are explicitly forbidden:
- `admin_override` fields in any event table
- `corrected_by_admin` flags or states
- `bypass_verification` options or modes
- `manual_correction` workflows that modify existing events
- Any mechanism that allows administrators to "fix" events after recording

**ALTERNATIVE:** When correction is needed:
1. Create a new event with `correction_of: <original_event_hash>`
2. The new event may have higher confidence (more proof) or lower confidence (acknowledging uncertainty)
3. Original event remains in chain, marked as `superseded_by: <new_event_hash>`
4. Confidence scores are metadata, not truth modifiers

**ENFORCEMENT:**
- Code review: All PRs scanned for forbidden patterns
- Schema validation: Database schema must not contain override fields
- Runtime checks: Application validates no override mechanisms exist

**Rationale:** Admin corrections destroy audit trail integrity and create legal liability. New events preserve chain while allowing truth to evolve.

**Violation Consequence:** Code review rejection, schema validation failure, immediate PR rejection.

---

## OPERATION MODE ENFORCEMENT

RealityOS operates in three distinct modes, each with different safety levels:

### Mode Definitions

| Mode | Description | Use Case |
|------|-------------|----------|
| **SANDBOX** | Development, testing, experimentation | Local development, feature testing |
| **PRODUCTION** | Live operations with standard safety checks | Normal business operations |
| **CERTIFIED** | Maximum safety for government/enterprise contracts | Government contracts, enterprise compliance |

### Mode-Specific Rules

| Capability | SANDBOX | PRODUCTION | CERTIFIED |
|------------|---------|-----------|-----------|
| Allow Manual Overrides | ✅ Yes | ⚠️ Limited | ❌ **No** |
| Require Verified Tuning | ❌ No | ⚠️ Recommended | ✅ **Mandatory** |
| Confidence Floor | ⚠️ Warning only | ✅ 0.85 enforced | ✅ 0.85 enforced |
| Baseline Required | ❌ No | ⚠️ Recommended | ✅ **Mandatory** |
| Experimental Features | ✅ Allowed | ❌ Blocked | ❌ Blocked |
| Beta Features | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| Determinism Required | ❌ No | ✅ Yes | ✅ Yes |
| Fail-Loud on Errors | ❌ No | ✅ Yes | ✅ **Yes (Hard Stop)** |

### Certified Mode Behavior

In CERTIFIED mode, the system enforces maximum safety:

- **Baseline is Mandatory**: System will not operate without certified baseline. Operations fail loudly if baseline missing.
- **Drift Detection Fails Loudly**: Raises `DriftDetectedError`, cancels all downstream jobs, logs critical anomaly.
- **No Manual Overrides**: All safety checks are hard stops. No bypass mechanisms exist.
- **Complete Audit Trail**: Every operation logged with full execution context, cryptographic signatures, and immutable records.

**Mode Resolution:**
- Mode is resolved once per request at entry point
- Mode is immutable throughout transaction (cannot change mid-request)
- Mode is passed explicitly through all critical paths (never read from environment deep in code)
- Backend is authoritative (frontend receives mode from API, never resolves client-side)

---

## VIOLATION CONSEQUENCES

Any code, design, or request violating these principles will be rejected at multiple enforcement layers:

### Layer 1: Code Review (Automated Checks)
- **Pre-commit hooks**: Validate code against constitution before commit
- **CI/CD pipeline**: Schema compliance checks, architecture tests
- **Static analysis**: Pattern detection for forbidden constructs
- **Consequence**: PR cannot be merged until violations resolved

### Layer 2: Database Constraints (DDL Enforcement)
- **Append-only tables**: `REVOKE UPDATE, DELETE` on all event tables
- **Foreign key constraints**: Prevent orphaned events, broken chains
- **Check constraints**: Enforce event type validity, confidence floors
- **Consequence**: Database rejects violating operations at transaction level

### Layer 3: Production Deployment (CI/CD Validation)
- **Constitution hash verification**: Deployment blocked if constitution modified without proper process
- **Core version compatibility**: Verticals must declare compatible core version
- **Vertical manifest validation**: All plugins validated before deployment
- **Consequence**: Deployment fails, rollback triggered, security alert

### Severity Levels

| Severity | Violation Type | Consequence | Response Time |
|----------|---------------|-------------|---------------|
| **CRITICAL** | Principles 1-3 (Human verification, Append-only, Chain integrity) | Immediate rejection, security alert, transaction rollback | < 1 minute |
| **HIGH** | Principles 4-5 (ERP boundary, Vertical agnosticism) | Code review rejection, architecture violation | < 1 hour |
| **MEDIUM** | Principle 6 (Admin corrections) | Code review rejection, schema validation failure | < 4 hours |

---

## AMENDMENT PROCESS

This constitution is immutable by design. Changing these principles requires a rigorous process to prevent accidental degradation:

### Step 1: 30-Day Discussion Period
- Proposal published in `docs/constitution-amendments/[proposal-id].md`
- All core maintainers must review and comment
- Public comment period (if applicable to open-source components)
- Technical impact analysis required
- Security review required

### Step 2: 100% Consensus of Core Maintainers
- **Minimum 3 core maintainers required** for any amendment
- **Unanimous approval required** (no abstentions, no "soft no")
- Each maintainer must provide signed approval
- Founder/CTO approval is mandatory for any amendment

### Step 3: Cryptographic Signing of New Constitution
- New version cryptographically signed using HMAC-SHA256
- Hash of new constitution stored in immutable registry
- Previous version archived (never deleted, marked as superseded)
- Version history maintained in `docs/constitution-history/`

### Step 4: Migration Period
- **90-day grace period** for code migration
- Dual-run validation required (old and new rules run in parallel)
- Full test coverage required before old version deprecated
- Backward compatibility maintained during transition

### Amendment History

| Version | Date | Amendment | Signatories |
|---------|------|-----------|-------------|
| 1.0 | 2025-02-20 | Initial constitution | [To be signed] |

---

## CORE OWNERSHIP RULE

### Who Can Sign a New Core Version

The following roles have authority to sign new core versions:

1. **Founder/CTO** (Primary signatory, mandatory)
2. **Lead Architect** (Technical validation, mandatory)
3. **Security Lead** (Security validation, mandatory)

### Signing Requirements

- **Minimum Signatures Required:** 2 of 3 (Founder must be one of the two)
- **Signing Process:** Cryptographic signature using HMAC-SHA256
- **Signature Storage:** Stored in `realityos_core/.core_version_signatures`

### Emergency Protocol

If Founder is unavailable:
- **Emergency protocol**: Lead Architect + Security Lead (both required)
- **Time limit**: Founder must approve within 48 hours or version is revoked
- **Audit**: All emergency approvals logged and audited
- **Revocation**: Founder can revoke emergency approval if not satisfied

### Signing Implementation

```python
def sign_core_version(
    version: str,
    signers: List[str],
    secret_key: str
) -> str:
    """
    Generate cryptographic signature for core version.
    
    Args:
        version: Core version string (e.g., "1.0.0")
        signers: List of signatory identifiers
        secret_key: Secret key for signing
        
    Returns:
        Hexadecimal signature string
    """
    timestamp = datetime.utcnow().isoformat()
    content = f"{version}:{':'.join(sorted(signers))}:{timestamp}"
    
    return hmac.new(
        secret_key.encode('utf-8'),
        content.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
```

---

## THE LAW OF CONSERVATION OF TRUTH

> "Truth can neither be created nor destroyed in the RealityOS Core; it can only be transformed from physical reality into immutable digital records."

### Implications

1. **Events are Observations**: Events are recordings of physical reality, not interpretations or judgments
2. **Core Does Not Judge**: Core does not evaluate truth quality, only verifies that proof exists
3. **Verticals Interpret**: Domain-specific verticals interpret events and derive meaning; core only stores them
4. **Confidence is Metadata**: Confidence scores are metadata about proof quality, not modifiers of truth itself
5. **Corrections are New Truth**: Corrections create new events with new truth, they do not destroy old events

### Application

- Core verifies: "Did a human verify this event?" (yes/no)
- Core stores: "What proof exists?" (QR, photo, GPS, timestamp)
- Core chains: "How does this relate to previous events?" (hash chain)
- Verticals interpret: "What does this mean for maintenance/construction/fabrication?" (domain logic)

---

## FINAL PRINCIPLE: THE DICTIONARY, NOT THE ESSAY

> "We sell the dictionary. Let clients write their own sentences with it."

### Meaning

- **Core provides**: Event types, verification mechanisms, chain integrity, cryptographic primitives
- **Verticals provide**: Domain rules, business logic, industry-specific interpretations
- **Clients configure**: Rules, thresholds, workflows (within vertical boundaries)
- **Clients never modify**: Core code, event schema, cryptographic algorithms

### Enforcement

Every client request must be evaluated against this question:

> "Does this belong in the Core (for all verticals) or in a Vertical (for this domain)?"

**Decision Matrix:**

| Request Type | Location | Process |
|-------------|----------|---------|
| New event type | Vertical | Add to vertical's EVENT_TYPES list |
| New verification method | Core | Requires constitution amendment |
| Custom business rule | Vertical | Add to vertical's RULES |
| Performance optimization | Core | Code review, no constitution change |
| New cryptographic algorithm | Core | Requires constitution amendment |
| Industry-specific logic | Vertical | Add to vertical plugin |

### Client Request Evaluation

**Accept:**
- ✅ New verticals (new domains)
- ✅ New rules within existing verticals
- ✅ Configuration changes (thresholds, parameters)
- ✅ UI customizations (within vertical boundaries)

**Reject:**
- ❌ Core modifications for single client
- ❌ Bypass mechanisms ("just for this client")
- ❌ Admin override requests
- ❌ Event deletion or modification requests

**Response Template:**
> "We understand your need for [feature]. This belongs in the [Core/Vertical] layer. For Core changes, we require [constitution amendment process]. For Vertical changes, we can [add to your vertical / create new vertical]. We sell the dictionary—let's configure it for your sentences."

---

## CONSTITUTION INTEGRITY

### Hash of This Document

**SHA-256 Hash:** `268efbf2bbbba0edd861fe2f885102e58c13a5ed505afa4635ef8547849e56d5`

**Calculation Method:**
```bash
sha256sum REALITYOS_CONSTITUTION.md
```

**Storage:**
- Hash stored in: `realityos_core/.constitution_hash`
- Hash verified: Before every deployment (CI/CD check)
- Hash updated: Only when constitution is properly amended

### Valid From

**Effective Date:** 2025-02-20

**Guardian:** [To be signed by Founder/CTO]

**Signature:**
```
[Founder Name]
[Date]
[HMAC-SHA256 Signature]
```

### Verification

- Constitution hash stored in `realityos_core/.constitution_hash`
- CI/CD verifies hash matches before any deployment
- Constitution changes trigger full system audit
- Any hash mismatch = deployment blocked + security alert

---

## APPENDIX: DEFINITIONS

### Event
A recorded observation of physical reality, consisting of:
- Event type (ON, OFF, FAULT, INSPECTION, VERIFICATION, etc.)
- Entity identifier (asset ID, project ID, etc.)
- Payload (domain-specific data)
- Proof (QR, photo, GPS, timestamp, verified_by)
- Cryptographic hash (linking to previous event)

### Proof
Evidence that a human verified the physical reality:
- QR code scan (human presence)
- Photo capture (visual evidence, max 2)
- GPS coordinates (location proof)
- Timestamp (temporal proof)
- Verified by (human identifier)

### Vertical
A domain-specific plugin that extends RealityOS Core:
- Provides domain rules (maintenance, construction, fabrication)
- Defines event types for its domain
- Implements business logic
- Extends BaseRealityRule interface

### Core
The immutable foundation of RealityOS:
- Event ledger (append-only storage)
- Cryptographic verification (HMAC-SHA256)
- Chain integrity (hash linking)
- Proof validation (QR, photo, GPS, timestamp)
- Vertical registry (plugin management)

### Chain
A sequence of events linked by cryptographic hashes:
- Each event references previous event's hash
- Chain position tracked via auto-incrementing integer
- Chain integrity verified daily
- Broken chain = security lockdown

---

## END OF CONSTITUTION

*This document is the architectural constitution of RealityOS. It defines the immutable principles that govern all development. Amendments require the rigorous process defined above. No exceptions.*

**Version:** 1.0  
**Status:** IMMUTABLE  
**Effective:** 2025-02-20  
**Next Review:** Never (constitution is immutable by design)

---

**Document Hash (SHA-256):** `268efbf2bbbba0edd861fe2f885102e58c13a5ed505afa4635ef8547849e56d5`  
**Guardian Signature:** `[TO_BE_SIGNED]`  
**Constitutional Authority:** Founder/CTO + Lead Architect + Security Lead

