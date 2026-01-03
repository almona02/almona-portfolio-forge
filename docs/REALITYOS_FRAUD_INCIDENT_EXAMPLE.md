# RealityOS Fraud Incident Log Example

**Purpose:** Demonstrate fraud detection and logging patterns for Phase 3 implementation.

**Incident Type:** QR Replay Attack  
**Severity:** HIGH  
**Date:** 2025-02-20T14:32:15Z  
**Status:** DETECTED & BLOCKED

---

## Incident Summary

**What Happened:**
- Attacker attempted to reuse a QR code that was already marked as USED
- QR `qr_asset_123_v1_20250220_103000` was scanned at 10:30:00Z and used for event `event_hash_abc123`
- Same QR was attempted again at 14:32:15Z for different entity `asset_456`

**Detection Method:**
- QR Validator Step 3: Single-use enforcement
- Database query: `SELECT status FROM qr_lifecycle WHERE qr_id = 'qr_asset_123_v1_20250220_103000'`
- Result: `status = 'USED'` → BLOCKED

**Outcome:**
- Event creation BLOCKED (constitutional violation)
- Security anomaly logged
- No data corruption (transaction rolled back)

---

## Security Anomaly Log Entry

```json
{
  "anomaly_id": "anom_20250220_143215_001",
  "anomaly_type": "QR_REPLAY_ATTEMPT",
  "severity": "HIGH",
  "detected_at": "2025-02-20T14:32:15.234Z",
  "detected_by": "qr_validator",
  "status": "BLOCKED",
  
  "incident_details": {
    "qr_id": "qr_asset_123_v1_20250220_103000",
    "entity_id": "asset_456",
    "vertical_id": "maintenance_vertical",
    "verified_by": "user_tech_789",
    "attempted_at": "2025-02-20T14:32:15.234Z",
    
    "qr_lifecycle_state": {
      "status": "USED",
      "original_entity_id": "asset_123",
      "original_vertical_id": "maintenance_vertical",
      "used_at": "2025-02-20T10:30:00.123Z",
      "used_by": "user_tech_456",
      "original_event_hash": "event_hash_abc123"
    },
    
    "validation_errors": [
      {
        "validator": "qr_validator",
        "step": 3,
        "field": "qr_lifecycle.status",
        "message": "QR already used (status=USED, used_at=2025-02-20T10:30:00.123Z)",
        "severity": "BLOCK",
        "constitutional_violation": true
      },
      {
        "validator": "qr_validator",
        "step": 4,
        "field": "entity_id",
        "message": "QR entity_id mismatch (QR=asset_123, Event=asset_456)",
        "severity": "BLOCK",
        "constitutional_violation": true
      }
    ],
    
    "fraud_indicators": [
      "QR_REPLAY",
      "ENTITY_MISMATCH",
      "TIME_GAP_SUSPICIOUS"  // 4 hours between uses
    ],
    
    "evidence": {
      "qr_data": "{\"v\":1,\"entity_id\":\"asset_123\",\"vertical_id\":\"maintenance_vertical\",\"qr_id\":\"qr_asset_123_v1_20250220_103000\",\"created_at\":\"2025-02-20T10:30:00Z\",\"valid_from\":\"2025-02-20T10:30:00Z\",\"valid_to\":\"2025-02-21T10:30:00Z\",\"signature\":\"abc123...\"}",
      "attempted_event_type": "VERIFICATION",
      "attempted_payload": {
        "maintenance_type": "routine_inspection",
        "notes": "Standard check"
      }
    },
    
    "transaction_state": {
      "transaction_id": "txn_20250220_143215_001",
      "rolled_back": true,
      "rollback_reason": "QR validation failed (constitutional violation)"
    }
  },
  
  "response_actions": [
    {
      "action": "BLOCK_EVENT_CREATION",
      "timestamp": "2025-02-20T14:32:15.235Z",
      "result": "SUCCESS"
    },
    {
      "action": "LOG_SECURITY_ANOMALY",
      "timestamp": "2025-02-20T14:32:15.236Z",
      "result": "SUCCESS",
      "anomaly_id": "anom_20250220_143215_001"
    },
    {
      "action": "ROLLBACK_TRANSACTION",
      "timestamp": "2025-02-20T14:32:15.237Z",
      "result": "SUCCESS"
    }
  ],
  
  "audit_trail": {
    "logged_by": "realityos_core",
    "log_level": "SECURITY",
    "deduplication_key": "qr_replay_qr_asset_123_v1_20250220_103000_20250220_143215",
    "retention_period_days": 2555  // 7 years for compliance
  },
  
  "related_events": [
    {
      "event_hash": "event_hash_abc123",
      "relationship": "ORIGINAL_QR_USE",
      "timestamp": "2025-02-20T10:30:00.123Z"
    }
  ]
}
```

---

## Auditor Chain Walk (Post-Incident)

**Query Pattern:**
```sql
-- 1. Find original QR use
SELECT * FROM reality_events 
WHERE event_hash = 'event_hash_abc123';

-- 2. Verify QR lifecycle state
SELECT * FROM qr_lifecycle 
WHERE qr_id = 'qr_asset_123_v1_20250220_103000';

-- 3. Find security anomaly
SELECT * FROM security_anomalies 
WHERE anomaly_id = 'anom_20250220_143215_001';

-- 4. Verify no event was created for replay attempt
SELECT COUNT(*) FROM reality_events 
WHERE proof->>'qr_data' LIKE '%qr_asset_123_v1_20250220_103000%'
  AND recorded_at >= '2025-02-20T14:32:00Z'
  AND recorded_at <= '2025-02-20T14:33:00Z';
-- Expected: 0 (replay was blocked)
```

**Auditor Findings:**
- ✅ QR replay detected and blocked
- ✅ No event created (constitutional protection worked)
- ✅ Security anomaly logged (audit trail intact)
- ✅ Original event preserved (chain integrity maintained)
- ✅ Transaction rolled back (no partial state)

---

## Key Patterns Demonstrated

1. **Fraud Detection:** QR replay attempt detected at validation layer
2. **Constitutional Enforcement:** BLOCK severity prevents event creation
3. **Transaction Safety:** Atomic rollback prevents partial state
4. **Audit Trail:** Security anomaly logged separately from operational events
5. **Evidence Preservation:** All validation details captured for forensics
6. **Chain Integrity:** Original event remains unmodified

---

## Implementation Notes

**For Anomaly Logger:**
- Use idempotent deduplication key: `{fraud_type}_{qr_id}_{timestamp}`
- 5-minute deduplication window (same incident logged once)
- Separate table: `security_anomalies` (NOT `reality_events`)
- Retention: 7 years (compliance requirement)

**For QR Validator:**
- Step 3 must check `qr_lifecycle.status` in same transaction
- Step 4 must verify `entity_id` match (prevents cross-entity reuse)
- Both failures = BLOCK severity (constitutional)

**For Capture Gateway:**
- QR failure → immediate BLOCK (no further validation)
- Log security anomaly before rollback
- Preserve all evidence for audit

