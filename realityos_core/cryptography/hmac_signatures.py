"""
RealityOS Cryptographic Signatures
==================================

Extracted from Calibration Safety Net (generic version)

This module provides HMAC-SHA256 signature generation and verification
for RealityOS events. It is the foundation of cryptographic chain integrity.

The signature algorithm is deterministic and order-dependent to ensure
that the same event data always produces the same signature.

Author: Extracted from python_backend/ai_services/calibration/calibration_safety_net.py
Date: 2025-02-20
Version: 1.0.0
"""

import hashlib
import hmac
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union


class RealitySignature:
    """
    Generate and verify HMAC-SHA256 signatures for RealityOS events.
    
    This class provides the cryptographic foundation for RealityOS event
    integrity. All events must be signed before being recorded in the
    immutable event ledger.
    
    The signature algorithm:
    1. Creates a canonical string representation of the event
    2. Orders all fields deterministically (sorted keys)
    3. Generates HMAC-SHA256 signature using secret key
    4. Returns hexadecimal signature string
    
    Example:
        >>> event_data = {
        ...     "event_type": "ASSET_ON",
        ...     "entity_id": "asset_123",
        ...     "payload": {"status": "operational"}
        ... }
        >>> signature = RealitySignature.sign_event(
        ...     event_data=event_data,
        ...     secret_key="your-secret-key"
        ... )
        >>> is_valid = RealitySignature.verify_event(
        ...     event_data=event_data,
        ...     provided_signature=signature,
        ...     secret_key="your-secret-key"
        ... )
        >>> assert is_valid == True
    """
    
    @staticmethod
    def sign_event(
        event_data: Dict[str, Any],
        secret_key: str,
        timestamp: Optional[datetime] = None
    ) -> str:
        """
        Generate HMAC-SHA256 signature for an event.
        
        The signature is computed from a canonical string representation
        that includes:
        - Timestamp (ISO format)
        - Event type
        - Entity ID
        - Sorted payload items (for consistency)
        
        Args:
            event_data: Event payload dictionary. Must contain:
                - event_type: str (e.g., "ASSET_ON", "MAINTENANCE_COMPLETE")
                - entity_id: str (identifier of the entity)
                - payload: dict (optional, domain-specific data)
            secret_key: Secret key for HMAC signing (must be kept secure)
            timestamp: Optional timestamp (defaults to current UTC time)
            
        Returns:
            Hexadecimal signature string (64 characters)
            
        Raises:
            ValueError: If required fields are missing
            TypeError: If event_data is not a dictionary
            
        Example:
            >>> event = {
            ...     "event_type": "ASSET_ON",
            ...     "entity_id": "pump_001",
            ...     "payload": {"location": "Building A", "status": "operational"}
            ... }
            >>> sig = RealitySignature.sign_event(event, "secret-key-123")
            >>> len(sig) == 64  # SHA-256 produces 64-char hex string
            True
        """
        if not isinstance(event_data, dict):
            raise TypeError("event_data must be a dictionary")
        
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Validate required fields
        if "event_type" not in event_data:
            raise ValueError("event_data must contain 'event_type' field")
        if "entity_id" not in event_data:
            raise ValueError("event_data must contain 'entity_id' field")
        
        # Create canonical string representation
        # IMPORTANT: Order matters for deterministic hashing
        components = [
            f"timestamp:{timestamp.isoformat()}",
            f"type:{event_data.get('event_type', 'unknown')}",
            f"entity:{event_data.get('entity_id', 'unknown')}",
        ]
        
        # Add sorted payload items for consistency
        # This ensures the same payload always produces the same signature
        payload = event_data.get('payload', {})
        if payload:
            if not isinstance(payload, dict):
                # If payload is not a dict, convert to JSON string
                payload_str = json.dumps(payload, sort_keys=True)
                components.append(f"payload:{payload_str}")
            else:
                # Sort keys for deterministic ordering
                for key in sorted(payload.keys()):
                    value = payload[key]
                    if value is not None:
                        # Convert value to string for consistent hashing
                        if isinstance(value, (dict, list)):
                            value_str = json.dumps(value, sort_keys=True)
                        else:
                            value_str = str(value)
                        components.append(f"{key}:{value_str}")
        
        # Join components with pipe separator
        content = "|".join(components)
        
        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            secret_key.encode('utf-8'),
            content.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    @staticmethod
    def verify_event(
        event_data: Dict[str, Any],
        provided_signature: str,
        secret_key: str,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Verify HMAC-SHA256 signature for an event.
        
        This method recomputes the signature and compares it with the
        provided signature using constant-time comparison to prevent
        timing attacks.
        
        Args:
            event_data: Original event payload (must match exactly)
            provided_signature: Signature to verify (64-char hex string)
            secret_key: Secret key used for signing (must match original)
            timestamp: Optional timestamp (must match original if provided)
            
        Returns:
            True if signature is valid, False otherwise
            
        Raises:
            ValueError: If signature format is invalid
            
        Example:
            >>> event = {"event_type": "ASSET_ON", "entity_id": "pump_001"}
            >>> sig = RealitySignature.sign_event(event, "secret-key")
            >>> RealitySignature.verify_event(event, sig, "secret-key")
            True
            >>> RealitySignature.verify_event(event, "wrong-sig", "secret-key")
            False
        """
        # Validate signature format (should be 64-char hex string)
        if not isinstance(provided_signature, str):
            return False
        
        if len(provided_signature) != 64:
            return False
        
        try:
            # Verify it's valid hexadecimal
            int(provided_signature, 16)
        except ValueError:
            return False
        
        # Recompute expected signature
        expected = RealitySignature.sign_event(
            event_data=event_data,
            secret_key=secret_key,
            timestamp=timestamp
        )
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected, provided_signature)
    
    @staticmethod
    def sign_baseline(
        baseline_data: Dict[str, Any],
        secret_key: str
    ) -> str:
        """
        Generate signature for a calibration baseline or similar baseline data.
        
        This is a specialized signing method for baseline data structures
        that require versioning and certification.
        
        Args:
            baseline_data: Baseline data dictionary containing:
                - profile_id or entity_id: str
                - version: str (baseline version)
                - value: Any (the baseline value, e.g., k_factor)
                - confidence: float (confidence score)
            secret_key: Secret key for signing
            
        Returns:
            Hexadecimal signature string
            
        Example:
            >>> baseline = {
            ...     "profile_id": "profile_123",
            ...     "version": "1.0.0",
            ...     "k_factor": 0.5,
            ...     "confidence": 0.95
            ... }
            >>> sig = RealitySignature.sign_baseline(baseline, "secret-key")
        """
        # Create canonical representation for baseline
        components = [
            f"profile_id:{baseline_data.get('profile_id') or baseline_data.get('entity_id', 'unknown')}",
            f"version:{baseline_data.get('version', '1.0.0')}",
            f"value:{baseline_data.get('value') or baseline_data.get('k_factor', 'unknown')}",
            f"confidence:{baseline_data.get('confidence', 0.0)}",
        ]
        
        content = "|".join(components)
        
        return hmac.new(
            secret_key.encode('utf-8'),
            content.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_baseline(
        baseline_data: Dict[str, Any],
        provided_signature: str,
        secret_key: str
    ) -> bool:
        """
        Verify signature for a calibration baseline.
        
        Args:
            baseline_data: Original baseline data
            provided_signature: Signature to verify
            secret_key: Secret key used for signing
            
        Returns:
            True if signature is valid
        """
        expected = RealitySignature.sign_baseline(
            baseline_data=baseline_data,
            secret_key=secret_key
        )
        
        return hmac.compare_digest(expected, provided_signature)


