"""
Chain Verifier for RealityOS
Daily automated verification of cryptographic chain integrity.
"""

import logging
from datetime import datetime
from typing import Optional

from realityos_core.event_ledger import EventLedger, ChainIntegrityError

logger = logging.getLogger(__name__)


class ChainVerifier:
    """
    Verifies cryptographic chain integrity on a schedule.

    Runs daily to ensure no tampering or corruption has occurred.
    """

    def __init__(self, event_ledger: EventLedger):
        self.ledger = event_ledger
        self.last_verification: Optional[datetime] = None
        self.last_result: Optional[bool] = None

    def verify_full_chain(self) -> bool:
        """
        Verify integrity of the entire event chain.

        Returns:
            True if chain is valid

        Raises:
            ChainIntegrityError: If chain is broken
        """
        logger.info("Starting full chain verification...")

        try:
            start_time = datetime.utcnow()

            # Use the ledger's internal verification
            result = self.ledger._verify_chain_integrity()

            elapsed = (datetime.utcnow() - start_time).total_seconds()

            self.last_verification = datetime.utcnow()
            self.last_result = result

            if result:
                logger.info(f"✅ Chain verification passed in {elapsed:.2f}s")
            else:
                logger.error(f"❌ Chain verification failed in {elapsed:.2f}s")

            return result

        except ChainIntegrityError as e:
            self.last_result = False
            logger.critical(f"🚨 CHAIN INTEGRITY BREACH: {e}")

            # TODO: Trigger security alerts
            # TODO: Freeze write operations

            raise

    def verify_recent_chain(self, hours: int = 24) -> bool:
        """
        Verify only recent events (for performance).

        Args:
            hours: Number of hours to look back

        Returns:
            True if recent chain is valid
        """
        logger.info(f"Verifying recent chain (last {hours} hours)...")

        # This is simplified - in practice, you'd need timestamp-based querying
        # For now, we'll verify the whole chain but limit checks
        # TODO: Implement timestamp-based filtering using cutoff

        return self.verify_full_chain()

    def start_daily_verification(self):
        """
        Start scheduled daily verification.

        Note: This requires the 'schedule' library to be installed.
        For production, use a proper task scheduler (Celery, cron, etc.)
        """
        try:
            import schedule  # type: ignore
            import time
        except ImportError:
            logger.warning(
                "Schedule library not installed. " "Install with: pip install schedule"
            )
            return

        logger.info("Starting daily chain verification scheduler...")

        # Schedule daily verification at 2:00 AM
        schedule.every().day.at("02:00").do(self.verify_full_chain)

        # Also verify every 6 hours for extra safety
        schedule.every(6).hours.do(lambda: self.verify_recent_chain(hours=6))

        # Run immediately on startup
        self.verify_full_chain()

        # Keep scheduler running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
