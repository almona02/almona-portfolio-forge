"""
Reality Capture Gateway - Skeleton with Frozen Method Signatures
Phase 3: Enforces Principle 1 (Human-Verified Before System-Trusted)

FROZEN INTERFACES - Do not modify signatures without constitutional amendment.
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from realityos_core.models.event_models import RealityProof, GPSPoint
from realityos_core.event_ledger import EventLedger
from realityos_core.models.qr_models import QRValidationResult
from realityos_core.capture_gateway.types import (
    ValidationSeverity,
    ValidationError,
    CaptureValidationResult,
)
from realityos_core.capture_gateway.exceptions import ConstitutionalViolationError
from realityos_core.capture_gateway.confidence_scorer import ConfidenceScorer
from realityos_core.capture_gateway.auditor_formatter import AuditorOutputFormatter
from realityos_core.capture_gateway.fraud_detector import FraudPatternDetector
from realityos_core.capture_gateway.evidence import ValidationEvidence
from realityos_core.cryptography.qr_canonical import (
    QRCanonicalFormat,
    QR_CANONICAL_FIELDS,
    QR_CANONICAL_SEPARATOR,
)

# Validators imported with TYPE_CHECKING to avoid circular imports
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from realityos_core.validators.qr_validator import QRValidator
    from realityos_core.validators.photo_validator import PhotoValidator
    from realityos_core.validators.gps_validator import GPSValidator
    from realityos_core.validators.timestamp_validator import TimestampValidator
    from realityos_core.validators.correlation_validator import CorrelationValidator


@dataclass
class CaptureData:
    """Raw capture data from mobile app."""

    qr_data: str  # Signed QR JSON string
    photos: List[bytes]  # Max 2 photos
    gps_latitude: float
    gps_longitude: float
    gps_accuracy_meters: Optional[float]
    timestamp: datetime  # Device timestamp
    verified_by: str  # Human identifier
    entity_id: str  # Expected entity (from event context)
    vertical_id: str  # Expected vertical (from event context)


class RealityCaptureGateway:
    """
    Gateway that validates reality capture before events enter the ledger.

    Enforces Principle 1: Human-Verified Before System-Trusted.

    Failure Hierarchy:
    - QR Failure → BLOCK (Constitutional)
    - Photo/GPS/Time/Correlation Failure → DEGRADE CONFIDENCE
    """

    # Configuration Constants (FROZEN)
    MAX_PHOTOS = 2
    GPS_TOLERANCE_METERS = 100  # Outdoor tolerance
    TIME_TOLERANCE_MINUTES = 15  # Clock skew tolerance
    HUMAN_IMPOSSIBLE_INTERVAL_SECONDS = 10  # Script detection threshold

    def __init__(
        self,
        database_url: str,
        # REQUIRED: Per-vertical signing keys
        vertical_secrets: Dict[str, str],
        event_ledger: Optional[EventLedger] = None,
        qr_validator: Optional["QRValidator"] = None,
        photo_validator: Optional["PhotoValidator"] = None,
        gps_validator: Optional["GPSValidator"] = None,
        timestamp_validator: Optional["TimestampValidator"] = None,
        correlation_validator: Optional["CorrelationValidator"] = None,
        enable_fraud_detection: bool = True,
    ):
        """
        Initialize Capture Gateway with constitutional guardrails.

        Args:
            database_url: PostgreSQL connection URL
            vertical_secrets: REQUIRED - mapping of
                vertical_id → secret_key
            event_ledger: EventLedger instance (created if None)
            qr_validator: QRValidator instance (created if None)
            photo_validator: PhotoValidator instance (created if None)
            gps_validator: GPSValidator instance (created if None)
            timestamp_validator: TimestampValidator instance
                (created if None)
            correlation_validator: CorrelationValidator instance
                (created if None)
            enable_fraud_detection: Enable non-blocking fraud
                pattern detection

        Raises:
            ConstitutionalViolationError: If vertical_secrets is empty
        """
        # Constitutional requirement: per-vertical signing keys
        if not vertical_secrets:
            raise ConstitutionalViolationError(
                principle="Vertical Agnosticism",
                violation="Missing per-vertical signing keys",
                evidence={"error": "vertical_secrets dictionary is empty"},
            )

        self.database_url = database_url
        self.vertical_secrets = vertical_secrets
        self.enable_fraud_detection = enable_fraud_detection

        # Initialize canonical format (FROZEN)
        self.canonical_format = QRCanonicalFormat(
            fields=QR_CANONICAL_FIELDS, separator=QR_CANONICAL_SEPARATOR
        )

        # Initialize validators (create if None)
        from realityos_core.validators.qr_validator import QRValidator
        from realityos_core.validators.photo_validator import PhotoValidator
        from realityos_core.validators.gps_validator import GPSValidator
        from realityos_core.validators.timestamp_validator import TimestampValidator
        from realityos_core.validators.correlation_validator import CorrelationValidator

        self.qr_validator = qr_validator or QRValidator(
            database_url=database_url, vertical_secrets=vertical_secrets
        )
        self.photo_validator = photo_validator or PhotoValidator(
            database_url=database_url
        )
        self.gps_validator = gps_validator or GPSValidator(database_url=database_url)
        self.timestamp_validator = timestamp_validator or TimestampValidator(
            database_url=database_url
        )
        self.correlation_validator = correlation_validator or CorrelationValidator(
            database_url=database_url
        )

        # Initialize EventLedger if not provided
        self.event_ledger = event_ledger or EventLedger(database_url=database_url)

        # Initialize fraud detector
        self.fraud_detector = FraudPatternDetector() if enable_fraud_detection else None

    def validate_capture(self, capture_data: CaptureData) -> CaptureValidationResult:
        """
        Validate a reality capture.

        This is the main entry point. Validates all components and returns
        a structured result with confidence scoring.

        Args:
            capture_data: Raw capture data from mobile app

        Returns:
            CaptureValidationResult with validation outcome

        Raises:
            QRValidationError: If QR validation fails (constitutional)
            (Other exceptions may be raised by validators)
        """
        errors = []
        warnings = []

        # Step 1: QR Validation (BLOCK if fails - constitutional)
        qr_result, qr_error = self.qr_validator.validate(
            qr_data=capture_data.qr_data,
            expected_entity_id=capture_data.entity_id,
            expected_vertical_id=capture_data.vertical_id,
        )

        if qr_error:
            # QR failure is constitutional violation - BLOCK
            # Convert QRValidationError to ValidationError
            # with BLOCK severity
            block_error = ValidationError(
                validator="qr_validator",
                field="qr_data",
                message=str(qr_error),
                severity=ValidationSeverity.BLOCK,
                evidence=(qr_error.evidence if hasattr(qr_error, "evidence") else {}),
            )
            errors.append(block_error)
            confidence = ConfidenceScorer.compute(errors)
            return CaptureValidationResult(
                overall_passed=False,
                confidence=confidence,
                errors=errors,
                warnings=warnings,
                proof=None,
                proof_hash=None,
            )

        # QR validation passed - continue with other validators
        if not qr_result:
            # This shouldn't happen, but handle gracefully
            block_error = ValidationError(
                validator="qr_validator",
                field="qr_data",
                message="QR validation returned no result",
                severity=ValidationSeverity.BLOCK,
                evidence={},
            )
            errors.append(block_error)
            confidence = ConfidenceScorer.compute(errors)
            return CaptureValidationResult(
                overall_passed=False,
                confidence=confidence,
                errors=errors,
                warnings=warnings,
                proof=None,
                proof_hash=None,
            )

        # Step 2: Photo Validation (DEGRADE if fails)
        photo_hashes, photo_errors = self.photo_validator.validate(capture_data.photos)
        errors.extend(
            [e for e in photo_errors if e.severity == ValidationSeverity.DEGRADE]
        )
        warnings.extend(
            [e for e in photo_errors if e.severity == ValidationSeverity.WARNING]
        )

        # Step 3: GPS Validation (DEGRADE if fails)
        gps_point, gps_error = self.gps_validator.validate(
            latitude=capture_data.gps_latitude,
            longitude=capture_data.gps_longitude,
            accuracy_meters=capture_data.gps_accuracy_meters,
        )
        if gps_error and gps_error.severity == ValidationSeverity.DEGRADE:
            errors.append(gps_error)

        # Step 4: Timestamp Validation (DEGRADE/WARNING if fails)
        timestamp, time_errors = self.timestamp_validator.validate(
            timestamp=capture_data.timestamp,
            verified_by=capture_data.verified_by,
            entity_id=capture_data.entity_id,
        )

        # Handle None timestamp (shouldn't happen, but handle gracefully)
        if timestamp is None:
            timestamp = capture_data.timestamp

        errors.extend(
            [e for e in time_errors if e.severity == ValidationSeverity.DEGRADE]
        )
        warnings.extend(
            [e for e in time_errors if e.severity == ValidationSeverity.WARNING]
        )

        # Step 5: Correlation Validation (DEGRADE if fails)
        correlation_errors = self.correlation_validator.validate(
            qr_result=qr_result,
            gps_point=gps_point,
            timestamp=timestamp,
            photo_hashes=photo_hashes,
        )
        errors.extend(correlation_errors)  # All correlation errors are DEGRADE

        # Step 6: Compute Proof Hash (deterministic)
        proof_hash = self._compute_proof_hash(
            qr_hash=qr_result.qr_hash if qr_result else "",
            photo_hashes=photo_hashes,
            gps_point=gps_point,
            timestamp=timestamp,
            verified_by=capture_data.verified_by,
        )

        # Step 7: Compute Confidence Score
        confidence = ConfidenceScorer.compute(errors + warnings)

        # Step 8: Create RealityProof (if validation passed)
        proof = None
        if qr_result and qr_result.is_valid:
            proof = RealityProof(
                verified_by=capture_data.verified_by,
                timestamp=timestamp,
                qr_data=capture_data.qr_data,
                photo_hashes=photo_hashes if photo_hashes else None,
                location=gps_point,
            )

        return CaptureValidationResult(
            overall_passed=True,  # No BLOCK errors
            confidence=confidence,
            errors=errors,
            warnings=warnings,
            proof=proof,
            proof_hash=proof_hash,
        )

    def validate_and_record(
        self, capture_data: CaptureData, event_type: str, payload: Dict[str, Any]
    ) -> tuple[CaptureValidationResult, Optional[str]]:
        """
        Validate capture and record event in single transaction.

        This is the atomic operation: validation + QR marking +
        event recording. All or nothing.

        Args:
            capture_data: Raw capture data
            event_type: Event type (ON, OFF, FAULT, etc.)
            payload: Event payload (vertical-specific)

        Returns:
            Tuple of (validation_result, event_hash)
            - If validation fails: (result, None)
            - If validation passes: (result, event_hash)

        Raises:
            QRValidationError: If QR validation fails
            EventLedgerError: If event recording fails
        """
        # Implementation will:
        # 1. BEGIN transaction
        # 2. Validate capture (calls validate_capture)
        # 3. If validation passed:
        #    a. Mark QR as USED (atomic)
        #    b. Create RealityProof from validated data
        #    c. Create BaseEvent
        #    d. Record in EventLedger
        #    e. COMMIT
        # 4. If validation failed:
        #    a. ROLLBACK
        #    b. Log security anomaly (if QR failure)
        # 5. Return result
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _validate_qr(
        self, qr_data: str, expected_entity_id: str, expected_vertical_id: str
    ) -> tuple[Optional[QRValidationResult], Optional[ValidationError]]:
        """
        Validate QR code (5-step process).

        Returns:
            Tuple of (QRValidationResult if valid, ValidationError if invalid)
            If QR fails → ValidationError with severity=BLOCK
        """
        # Implementation will call QRValidator
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _validate_photos(
        self, photos: List[bytes]
    ) -> tuple[List[str], List[ValidationError]]:
        """
        Validate photos (max 2, SHA-256 + pHash, metadata stripping).

        Returns:
            Tuple of (photo_hashes, validation_errors)
            Errors have severity=DEGRADE (never BLOCK)
        """
        # Implementation will call PhotoValidator
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _validate_gps(
        self, latitude: float, longitude: float, accuracy_meters: Optional[float]
    ) -> tuple[Optional[GPSPoint], Optional[ValidationError]]:
        """
        Validate GPS coordinates.

        Returns:
            Tuple of (GPSPoint if valid, ValidationError if invalid)
            Errors have severity=DEGRADE (never BLOCK)
            Uses neutral language: GPS_ANOMALOUS, GPS_LOW_CONFIDENCE,
            LOCATION_UNVERIFIED
        """
        # Implementation will call GPSValidator
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _validate_timestamp(
        self, timestamp: datetime, verified_by: str, entity_id: str
    ) -> tuple[Optional[datetime], List[ValidationError]]:
        """
        Validate timestamp (no future, server-time sync,
        human-impossible detection).

        Returns:
            Tuple of (normalized_timestamp, validation_errors)
            Errors have severity=DEGRADE or WARNING (never BLOCK)
        """
        # Implementation will call TimestampValidator
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _validate_correlation(
        self,
        qr_result: Optional[QRValidationResult],
        gps_point: Optional[GPSPoint],
        timestamp: datetime,
        photo_hashes: List[str],
    ) -> List[ValidationError]:
        """
        Validate cross-validator correlations.

        Returns:
            List of ValidationError (all severity=DEGRADE)
        """
        # Implementation will call CorrelationValidator
        raise NotImplementedError("Interface only - implementation in Day 5-7")

    def _compute_proof_hash(
        self,
        qr_hash: str,
        photo_hashes: List[str],
        gps_point: Optional[GPSPoint],
        timestamp: datetime,
        verified_by: str,
    ) -> str:
        """
        Compute unified proof hash (SHA-256 of all validation results).

        Rules:
        - Sorted keys (alphabetical)
        - Normalized floats (GPS precision fixed to 6 decimals)
        - ISO-8601 timestamps only (UTC, Z suffix)
        - Consistent field order (deterministic)

        Returns:
            SHA-256 hash (64 hex characters)
        """
        import hashlib
        from datetime import timezone

        # Normalize timestamp to UTC ISO-8601 with Z suffix
        if timestamp.tzinfo is None:
            timestamp_utc = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp_utc = timestamp.astimezone(timezone.utc)
        timestamp_str = timestamp_utc.isoformat().replace("+00:00", "Z")

        # Build proof data dictionary
        proof_data = {
            "qr_hash": qr_hash,
            "photo_hashes": (
                sorted(photo_hashes) if photo_hashes else []
            ),  # Sort for determinism
            "timestamp": timestamp_str,
            "verified_by": verified_by,
        }

        # Add GPS if present (normalized to 6 decimal places)
        if gps_point:
            proof_data["gps_lat"] = round(gps_point.latitude, 6)
            proof_data["gps_lon"] = round(gps_point.longitude, 6)
            if gps_point.accuracy_meters is not None:
                proof_data["gps_accuracy"] = round(gps_point.accuracy_meters, 2)

        # Remove None values
        clean_data = {k: v for k, v in proof_data.items() if v is not None}

        # Sort keys alphabetically for deterministic serialization
        sorted_keys = sorted(clean_data.keys())

        # Create canonical string representation
        # Format: key:value|key:value|...
        canonical_parts = []
        for key in sorted_keys:
            value = clean_data[key]
            if isinstance(value, list):
                # For lists (photo_hashes), join with comma
                value_str = ",".join(sorted(value))
            else:
                value_str = str(value)
            canonical_parts.append(f"{key}:{value_str}")

        canonical_string = "|".join(canonical_parts)

        # Compute SHA-256 hash
        return hashlib.sha256(canonical_string.encode("utf-8")).hexdigest()

    def _degrade_confidence(
        self, base_confidence: float, errors: List[ValidationError]
    ) -> float:
        """
        Compute confidence score degraded by validation errors.

        Delegates to ConfidenceScorer for constitutional compliance.

        Returns:
            Confidence score (0.0 to 1.0)
        """
        return ConfidenceScorer.compute(errors)

    def _preserve_evidence(
        self,
        capture_data: CaptureData,
        qr_result: Optional[QRValidationResult],
        photo_hashes: List[str],
        gps_point: Optional[GPSPoint],
        timestamp: datetime,
    ) -> ValidationEvidence:
        """
        Preserve immutable evidence bundle for audit trail.

        Args:
            capture_data: Raw capture data
            qr_result: QR validation result
            photo_hashes: Validated photo hashes
            gps_point: Validated GPS point
            timestamp: Normalized timestamp

        Returns:
            Immutable ValidationEvidence object
        """
        from datetime import timezone

        # Get QR data
        qr_raw = capture_data.qr_data
        qr_parsed = qr_result.qr_data if qr_result else None
        qr_hash = qr_result.qr_hash if qr_result else ""

        # Normalize timestamp
        if timestamp.tzinfo is None:
            timestamp_normalized = timestamp.replace(tzinfo=timezone.utc)
        else:
            timestamp_normalized = timestamp.astimezone(timezone.utc)

        # GPS raw data
        gps_raw = {
            "latitude": capture_data.gps_latitude,
            "longitude": capture_data.gps_longitude,
        }
        if capture_data.gps_accuracy_meters is not None:
            gps_raw["accuracy_meters"] = capture_data.gps_accuracy_meters

        # Validator versions (hardcoded for now, can be dynamic later)
        validator_versions = {
            "qr_validator": "1.0.0",
            "photo_validator": "1.0.0",
            "gps_validator": "1.0.0",
            "timestamp_validator": "1.0.0",
            "correlation_validator": "1.0.0",
        }

        # Create immutable evidence
        evidence = ValidationEvidence(
            qr_raw=qr_raw,
            qr_parsed=qr_parsed,
            qr_hash=qr_hash,
            photo_hashes=tuple(photo_hashes),  # Frozen tuple
            gps_raw=gps_raw,
            gps_normalized=gps_point,
            timestamp_raw=capture_data.timestamp,
            timestamp_normalized=timestamp_normalized,
            verified_by=capture_data.verified_by,
            validation_moment=datetime.now(timezone.utc),
            validator_versions=validator_versions,
        )

        return evidence

    def _format_for_auditor(self, result: CaptureValidationResult) -> str:
        """
        Format validation result for auditor consumption.

        Delegates to AuditorOutputFormatter.

        Returns:
            Formatted audit log string
        """
        return AuditorOutputFormatter.format_validation_result(result)
