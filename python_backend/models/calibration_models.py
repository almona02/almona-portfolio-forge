"""
SQLAlchemy models for Calibration Safety Net.
These models provide ORM access to calibration tables.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    DECIMAL,
    DateTime,
    Text,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, ENUM
from sqlalchemy.orm import relationship

from core.database import Base


class CalibrationStatus:
    """Calibration status enumeration."""

    LEARNING = "learning"
    CERTIFIED = "certified"
    FROZEN = "frozen"
    REQUIRES_REVIEW = "requires_review"


class CalibrationBaseline(Base):
    """SQLAlchemy model for calibration_baselines table."""

    __tablename__ = "calibration_baselines"

    # Primary key
    id = Column(
        PG_UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()"
    )

    # Identity
    profile_id = Column(String, nullable=False)
    joint_type = Column(String, nullable=False)
    workshop_id = Column(String, nullable=True)  # NULL = global baseline

    # Immutable calibration data
    baseline_version = Column(String, nullable=False)
    baseline_hash = Column(String, nullable=False, unique=True)
    k_factor = Column(DECIMAL(10, 4), nullable=False)
    confidence = Column(DECIMAL(3, 2), nullable=False)

    # Audit trail
    certified_at = Column(
        DateTime(timezone=True), nullable=False, server_default="NOW()"
    )
    certified_by = Column(String, nullable=False)

    # Metadata
    sample_size = Column(Integer, nullable=False, server_default="0")
    model_version = Column(String, nullable=False)
    reasoning = Column(JSONB, nullable=False, server_default="'[]'::jsonb")

    # Status
    status = Column(
        ENUM(CalibrationStatus, name="calibration_status", create_type=False),
        nullable=False,
        server_default="'learning'",
    )
    frozen_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Constraints
    __table_args__ = (
        CheckConstraint("k_factor >= 0 AND k_factor <= 10", name="k_factor_range"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="confidence_range"),
        CheckConstraint(
            "confidence >= 0.85 OR status != 'certified'",
            name="certified_confidence_check",
        ),
        CheckConstraint("sample_size >= 0", name="sample_size_non_negative"),
        UniqueConstraint(
            "profile_id",
            "joint_type",
            "workshop_id",
            "baseline_version",
            name="unique_certified_baseline",
        ),
        Index(
            "idx_baseline_lookup", "profile_id", "joint_type", "workshop_id", "status"
        ),
        Index(
            "idx_baseline_certified",
            "profile_id",
            "joint_type",
            "workshop_id",
            postgresql_where=status == CalibrationStatus.CERTIFIED,
        ),
        Index("idx_baseline_hash", "baseline_hash"),
    )


class CalibrationAnomaly(Base):
    """SQLAlchemy model for calibration_anomalies table."""

    __tablename__ = "calibration_anomalies"

    # Primary key
    id = Column(
        PG_UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()"
    )

    # Identity
    profile_id = Column(String, nullable=False)
    joint_type = Column(String, nullable=False)
    workshop_id = Column(String, nullable=True)  # NULL = global

    # Anomaly details
    anomaly_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)

    # Context details
    details = Column(JSONB, nullable=False, server_default="'{}'::jsonb")
    execution_context = Column(JSONB, nullable=False, server_default="'{}'::jsonb")

    # Resolution tracking
    resolved = Column(
        String, nullable=False, server_default="FALSE"
    )  # Boolean as string for compatibility
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "anomaly_type IN ("
            "'drift', 'low_confidence', 'freeze', 'certification_failure'"
            ")",
            name="valid_anomaly_type",
        ),
        CheckConstraint("severity IN ('WARNING', 'CRITICAL')", name="valid_severity"),
        Index(
            "idx_anomaly_detection",
            "profile_id",
            "joint_type",
            "severity",
            "created_at",
        ),
        Index(
            "idx_anomaly_unresolved",
            "profile_id",
            "joint_type",
            postgresql_where=resolved == "FALSE",
        ),
    )


class CalibrationStatusRegistry(Base):
    """SQLAlchemy model for calibration_status_registry table."""

    __tablename__ = "calibration_status_registry"

    # Primary key
    id = Column(
        PG_UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()"
    )

    # Identity
    profile_id = Column(String, nullable=False)
    joint_type = Column(String, nullable=False)
    workshop_id = Column(String, nullable=True)  # NULL = global

    # Current status
    status = Column(
        ENUM(CalibrationStatus, name="calibration_status", create_type=False),
        nullable=False,
        server_default="'learning'",
    )

    # Reference to current baseline
    current_baseline_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calibration_baselines.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Freeze information
    frozen_at = Column(DateTime(timezone=True), nullable=True)
    frozen_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default="NOW()")

    # Relationships
    current_baseline = relationship(
        "CalibrationBaseline", foreign_keys=[current_baseline_id]
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint(
            "profile_id", "joint_type", "workshop_id", name="unique_status_registry"
        ),
        Index("idx_status_registry_lookup", "profile_id", "joint_type", "workshop_id"),
        Index(
            "idx_status_registry_frozen",
            "profile_id",
            "joint_type",
            postgresql_where=status == CalibrationStatus.FROZEN,
        ),
    )
