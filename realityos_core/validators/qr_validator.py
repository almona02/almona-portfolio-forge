"""
QR Validator - 5-Step Validation Process
Constitutional enforcement for QR code validation.
"""

import json
import hashlib
import hmac
from typing import Optional, Tuple
from datetime import datetime, timezone
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from realityos_core.models.qr_models import SignedQRData, QRValidationResult
from realityos_core.capture_gateway.exceptions import QRValidationError
from realityos_core.cryptography.qr_canonical import (
    QRCanonicalFormat,
    QR_CANONICAL_FIELDS,
    QR_CANONICAL_SEPARATOR,
)


class QRValidator:
    """
    QR Validator with 5-step validation process.
    
    Steps:
    0. Structural sanity (required fields, version, size limits)
    1. Cryptographic signature (HMAC-SHA256, canonical format)
    2. Temporal validity (valid_from/valid_to, max window)
    3. Single-use enforcement (check qr_lifecycle table)
    4. Entity binding (QR entity_id matches event entity_id)
    5. Revocation check (superseded QRs, re-baseline events)
    """
    
    # Configuration constants
    MAX_QR_SIZE_BYTES = 2048  # Maximum QR JSON size
    MAX_VALIDITY_WINDOW_DAYS = 7  # Constitutional maximum
    
    def __init__(self, database_url: str, vertical_secrets: dict[str, str]):
        """
        Initialize QR Validator.
        
        Args:
            database_url: PostgreSQL connection URL
            vertical_secrets: Mapping of vertical_id → secret_key
        """
        self.database_url = database_url
        self.vertical_secrets = vertical_secrets
        self.engine = create_engine(database_url, pool_pre_ping=True)
        self.Session = sessionmaker(bind=self.engine)
        self.canonical_format = QRCanonicalFormat(
            fields=QR_CANONICAL_FIELDS,
            separator=QR_CANONICAL_SEPARATOR
        )
    
    @contextmanager
    def _get_session(self):
        """Context manager for database sessions."""
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def validate(
        self,
        qr_data: str,
        expected_entity_id: str,
        expected_vertical_id: str
    ) -> Tuple[Optional[QRValidationResult], Optional[QRValidationError]]:
        """
        Validate QR code using 5-step process.
        
        Args:
            qr_data: Signed QR JSON string
            expected_entity_id: Expected entity ID from event context
            expected_vertical_id: Expected vertical ID from event context
            
        Returns:
            Tuple of (QRValidationResult if valid, QRValidationError if invalid)
        """
        validation_steps = {}
        errors = {}
        
        # Step 0: Structural sanity
        try:
            parsed_qr = self._step0_structural_sanity(qr_data)
            validation_steps['step0_structural'] = True
        except QRValidationError as e:
            validation_steps['step0_structural'] = False
            errors['step0'] = str(e)
            return None, e
        
        # Step 1: Cryptographic signature
        try:
            self._step1_cryptographic_signature(parsed_qr)
            validation_steps['step1_signature'] = True
        except QRValidationError as e:
            validation_steps['step1_signature'] = False
            errors['step1'] = str(e)
            return None, e
        
        # Step 2: Temporal validity
        try:
            self._step2_temporal_validity(parsed_qr)
            validation_steps['step2_temporal'] = True
        except QRValidationError as e:
            validation_steps['step2_temporal'] = False
            errors['step2'] = str(e)
            return None, e
        
        # Step 3: Single-use enforcement
        try:
            self._step3_single_use_enforcement(parsed_qr)
            validation_steps['step3_single_use'] = True
        except QRValidationError as e:
            validation_steps['step3_single_use'] = False
            errors['step3'] = str(e)
            return None, e
        
        # Step 4: Entity binding
        try:
            self._step4_entity_binding(
                parsed_qr, expected_entity_id, expected_vertical_id
            )
            validation_steps['step4_entity_binding'] = True
        except QRValidationError as e:
            validation_steps['step4_entity_binding'] = False
            errors['step4'] = str(e)
            return None, e
        
        # Step 5: Revocation check
        try:
            self._step5_revocation_check(parsed_qr)
            validation_steps['step5_revocation'] = True
        except QRValidationError as e:
            validation_steps['step5_revocation'] = False
            errors['step5'] = str(e)
            return None, e
        
        # All steps passed - compute QR hash
        qr_hash = self._compute_qr_hash(parsed_qr)
        
        # Create validation result
        result = QRValidationResult(
            is_valid=True,
            qr_data=parsed_qr,
            qr_hash=qr_hash,
            validation_steps=validation_steps,
            errors=None
        )
        
        return result, None
    
    def _step0_structural_sanity(self, qr_data: str) -> SignedQRData:
        """
        Step 0: Structural sanity check.
        
        Validates:
        - JSON is valid and parseable
        - Size limits (max 2048 bytes)
        - Required fields present
        - Field types correct
        - Version is valid (>= 1)
        """
        # Check size limit
        if len(qr_data.encode('utf-8')) > self.MAX_QR_SIZE_BYTES:
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR data exceeds maximum size",
                evidence={
                    "size_bytes": len(qr_data.encode('utf-8')),
                    "max_bytes": self.MAX_QR_SIZE_BYTES
                }
            )
        
        # Parse JSON
        try:
            qr_dict = json.loads(qr_data)
        except json.JSONDecodeError as e:
            raise QRValidationError(
                principle="Human-Verified",
                violation="Invalid JSON format",
                evidence={"json_error": str(e)}
            )
        
        # Validate structure using canonical format
        is_valid, error_msg = self.canonical_format.validate_structure(qr_dict)
        if not is_valid:
            raise QRValidationError(
                principle="Human-Verified",
                violation=f"QR structure validation failed: {error_msg}",
                evidence={"qr_dict": qr_dict}
            )
        
        # Validate version
        if qr_dict.get('v', 0) < 1:
            raise QRValidationError(
                principle="Human-Verified",
                violation="Invalid QR version (must be >= 1)",
                evidence={"version": qr_dict.get('v')}
            )
        
        # Parse into Pydantic model (validates types and constraints)
        try:
            parsed_qr = SignedQRData(**qr_dict)
        except Exception as e:
            raise QRValidationError(
                principle="Human-Verified",
                violation=f"QR data validation failed: {str(e)}",
                evidence={"qr_dict": qr_dict}
            )
        
        return parsed_qr
    
    def _step1_cryptographic_signature(
        self, parsed_qr: SignedQRData
    ) -> None:
        """
        Step 1: Cryptographic signature verification.
        
        Validates:
        - HMAC-SHA256 signature using canonical serialization
        - Per-vertical secret key
        - Signature format (64-char hex)
        """
        # Get secret key for this vertical
        vertical_id = parsed_qr.vertical_id
        if vertical_id not in self.vertical_secrets:
            raise QRValidationError(
                principle="Vertical Agnosticism",
                violation=f"Secret key not found for vertical: {vertical_id}",
                evidence={"vertical_id": vertical_id}
            )
        
        secret_key = self.vertical_secrets[vertical_id]
        
        # Create canonical serialization (without signature)
        qr_dict = parsed_qr.dict(exclude={'signature'})
        canonical_string = self.canonical_format.serialize(qr_dict)
        
        # Compute expected signature
        expected_signature = hmac.new(
            secret_key.encode('utf-8'),
            canonical_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_signature, parsed_qr.signature):
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR signature verification failed",
                evidence={
                    "vertical_id": vertical_id,
                    "qr_id": parsed_qr.qr_id
                }
            )
    
    def _step2_temporal_validity(self, parsed_qr: SignedQRData) -> None:
        """
        Step 2: Temporal validity check.
        
        Validates:
        - valid_from <= current_time <= valid_to
        - Validity window <= 7 days (constitutional maximum)
        - No future-dated valid_from
        """
        now = datetime.now(timezone.utc)
        
        # Check validity window
        window_seconds = (
            parsed_qr.valid_to - parsed_qr.valid_from
        ).total_seconds()
        max_window_seconds = self.MAX_VALIDITY_WINDOW_DAYS * 24 * 60 * 60
        
        if window_seconds > max_window_seconds:
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR validity window exceeds 7 days",
                evidence={
                    "window_days": window_seconds / (24 * 60 * 60),
                    "max_days": self.MAX_VALIDITY_WINDOW_DAYS
                }
            )
        
        # Check current time is within validity window
        if now < parsed_qr.valid_from:
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR not yet valid (valid_from in future)",
                evidence={
                    "valid_from": parsed_qr.valid_from.isoformat(),
                    "current_time": now.isoformat()
                }
            )
        
        if now > parsed_qr.valid_to:
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR expired (valid_to in past)",
                evidence={
                    "valid_to": parsed_qr.valid_to.isoformat(),
                    "current_time": now.isoformat()
                }
            )
    
    def _step3_single_use_enforcement(
        self, parsed_qr: SignedQRData
    ) -> None:
        """
        Step 3: Single-use enforcement.
        
        Validates:
        - QR exists in qr_lifecycle table
        - QR status is UNUSED
        - QR is within validity window (double-check)
        - QR entity_id and vertical_id match database
        """
        with self._get_session() as session:
            # Use database function for atomic check
            result = session.execute(
                text("""
                    SELECT is_valid, reason, current_status, valid_from, valid_to
                    FROM check_qr_validity(:qr_id, :entity_id, :vertical_id)
                """),
                {
                    "qr_id": parsed_qr.qr_id,
                    "entity_id": parsed_qr.entity_id,
                    "vertical_id": parsed_qr.vertical_id
                }
            )
            
            row = result.fetchone()
            
            if not row:
                raise QRValidationError(
                    principle="Human-Verified",
                    violation="QR not found in lifecycle table",
                    evidence={"qr_id": parsed_qr.qr_id}
                )
            
            is_valid, reason, current_status, db_valid_from, db_valid_to = row
            
            if not is_valid:
                raise QRValidationError(
                    principle="Human-Verified",
                    violation=f"QR single-use check failed: {reason}",
                    evidence={
                        "qr_id": parsed_qr.qr_id,
                        "current_status": str(current_status),
                        "reason": reason
                    }
                )
    
    def _step4_entity_binding(
        self,
        parsed_qr: SignedQRData,
        expected_entity_id: str,
        expected_vertical_id: str
    ) -> None:
        """
        Step 4: Entity binding check.
        
        Validates:
        - QR entity_id matches expected_entity_id
        - QR vertical_id matches expected_vertical_id
        """
        if parsed_qr.entity_id != expected_entity_id:
            raise QRValidationError(
                principle="Human-Verified",
                violation="QR entity_id does not match expected entity",
                evidence={
                    "qr_entity_id": parsed_qr.entity_id,
                    "expected_entity_id": expected_entity_id
                }
            )
        
        if parsed_qr.vertical_id != expected_vertical_id:
            raise QRValidationError(
                principle="Vertical Agnosticism",
                violation="QR vertical_id does not match expected vertical",
                evidence={
                    "qr_vertical_id": parsed_qr.vertical_id,
                    "expected_vertical_id": expected_vertical_id
                }
            )
    
    def _step5_revocation_check(self, parsed_qr: SignedQRData) -> None:
        """
        Step 5: Revocation check.
        
        Validates:
        - QR is not revoked (status != REVOKED)
        - QR has not been superseded by a re-baseline event
        """
        with self._get_session() as session:
            result = session.execute(
                text("""
                    SELECT status, revoked_at, revoked_by
                    FROM qr_lifecycle
                    WHERE qr_id = :qr_id
                """),
                {"qr_id": parsed_qr.qr_id}
            )
            
            row = result.fetchone()
            
            if row:
                status, revoked_at, revoked_by = row
                
                if status == 'REVOKED':
                    raise QRValidationError(
                        principle="Human-Verified",
                        violation="QR has been revoked",
                        evidence={
                            "qr_id": parsed_qr.qr_id,
                            "revoked_at": revoked_at.isoformat() if revoked_at else None,
                            "revoked_by": revoked_by
                        }
                    )
    
    def _compute_qr_hash(self, parsed_qr: SignedQRData) -> str:
        """
        Compute SHA-256 hash of canonical QR serialization.
        
        Used for linking QR to events and audit trails.
        """
        qr_dict = parsed_qr.dict(exclude={'signature'})
        canonical_string = self.canonical_format.serialize(qr_dict)
        
        return hashlib.sha256(
            canonical_string.encode('utf-8')
        ).hexdigest()
