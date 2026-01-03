"""
RealityOS Core - Immutable Truth Engine
=======================================

This is the sacred core of RealityOS. It provides:
- Event ledger (append-only, cryptographically chained)
- Reality capture gateway (QR, photo, GPS, timestamp validation)
- Cryptographic primitives (HMAC-SHA256 signatures)
- Vertical plugin registry (domain-agnostic rule system)

The core is immutable. All domain logic lives in vertical plugins.

Constitution: See REALITYOS_CONSTITUTION.md
Version: 1.0.0
"""

__version__ = "1.0.0"
__author__ = "RealityOS Core Team"

# Core exports
from realityos_core.cryptography.hmac_signatures import RealitySignature
from realityos_core.event_ledger import EventLedger, EventLedgerError, ChainIntegrityError
from realityos_core.chain_verifier import ChainVerifier
from realityos_core.models.event_models import (
    CoreEventType,
    GPSPoint,
    RealityProof,
    BaseEvent,
    EventRecord,
    EventHasher,
)

# Vertical Plugin System
from realityos_core.base_rule import BaseRealityRule, RuleValidationResult
from realityos_core.vertical_registry import (
    VerticalRegistry,
    VerticalManifest,
    VerticalPlugin,
)

__all__ = [
    # Cryptography
    "RealitySignature",
    # Event Ledger
    "EventLedger",
    "EventLedgerError",
    "ChainIntegrityError",
    # Chain Verification
    "ChainVerifier",
    # Models
    "CoreEventType",
    "GPSPoint",
    "RealityProof",
    "BaseEvent",
    "EventRecord",
    "EventHasher",
    # Vertical Plugin System
    "BaseRealityRule",
    "RuleValidationResult",
    "VerticalRegistry",
    "VerticalManifest",
    "VerticalPlugin",
]

