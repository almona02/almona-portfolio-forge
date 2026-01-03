"""
Fraud Pattern Detection
Detects fraud patterns without blocking (evidence collection only).
"""

from typing import Optional, Dict, Any, List
from datetime import datetime


class FraudPatternDetector:
    """
    Detects fraud patterns without blocking (evidence collection only).

    These patterns are logged as security anomalies but do not block
    event creation (unless they also trigger constitutional violations).
    """

    @staticmethod
    def detect_qr_replay(
        qr_id: str, recent_uses: List[datetime]
    ) -> Optional[Dict[str, Any]]:
        """
        Detect QR replay attempts.

        Args:
            qr_id: QR identifier
            recent_uses: List of previous use timestamps

        Returns:
            Fraud pattern dict if detected, None otherwise
        """
        if len(recent_uses) > 0:
            return {
                "pattern": "QR_REPLAY_ATTEMPT",
                "qr_id": qr_id,
                "previous_use": recent_uses[0].isoformat(),
                "current_time": datetime.utcnow().isoformat(),
                "recommendation": "Flag for manual review",
            }
        return None

    @staticmethod
    def detect_human_impossible_interval(
        verified_by: str,
        previous_timestamp: Optional[datetime],
        current_timestamp: datetime,
        entity_changed: bool,
    ) -> Optional[Dict[str, Any]]:
        """
        Detect scripted submissions (human-impossible intervals).

        Args:
            verified_by: Human identifier
            previous_timestamp: Previous event timestamp for this verifier
            current_timestamp: Current event timestamp
            entity_changed: Whether entity_id changed between events

        Returns:
            Fraud pattern dict if detected, None otherwise
        """
        if not previous_timestamp:
            return None

        interval = (current_timestamp - previous_timestamp).total_seconds()

        if interval < 10 and entity_changed:
            return {
                "pattern": "HUMAN_IMPOSSIBLE_INTERVAL",
                "verified_by": verified_by,
                "interval_seconds": interval,
                "entity_changed": entity_changed,
                "recommendation": ("Possible device compromise or scripted submission"),
            }
        return None

    @staticmethod
    def detect_photo_reuse(
        photo_hash: str, previous_uses: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Detect photo reuse (same hash used multiple times).

        Args:
            photo_hash: SHA-256 hash of photo
            previous_uses: List of previous uses with timestamps
                and entity_ids

        Returns:
            Fraud pattern dict if detected, None otherwise
        """
        if len(previous_uses) > 0:
            return {
                "pattern": "PHOTO_REUSE",
                "photo_hash": photo_hash,
                "previous_uses": previous_uses,
                "recommendation": (
                    "Flag for manual review - possible photo manipulation"
                ),
            }
        return None

    @staticmethod
    def detect_gps_anomaly(
        current_location: Dict[str, float],
        previous_location: Optional[Dict[str, float]],
        time_interval_seconds: float,
    ) -> Optional[Dict[str, Any]]:
        """
        Detect GPS anomalies (impossible travel).

        Args:
            current_location: Current GPS coordinates {lat, lon}
            previous_location: Previous GPS coordinates
            time_interval_seconds: Time between locations

        Returns:
            Fraud pattern dict if detected, None otherwise
        """
        if not previous_location:
            return None

        # Implementation will compute distance and check if travel
        # is physically impossible. This is a placeholder - actual
        # implementation requires geodetic distance calculation
        return None
