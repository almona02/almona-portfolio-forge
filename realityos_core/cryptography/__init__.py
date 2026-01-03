"""
RealityOS Cryptographic Primitives
===================================

Cryptographic functions for RealityOS event signing and verification.
All functions use HMAC-SHA256 for deterministic, secure signatures.

This module is extracted from Almona's Calibration Safety Net,
generalized for use across all RealityOS verticals.
"""

from realityos_core.cryptography.hmac_signatures import RealitySignature

__all__ = [
    "RealitySignature",
]


