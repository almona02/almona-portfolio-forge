"""
Retry Manager for Dual-Write Operations

Implements retry logic with exponential backoff and idempotency checking.

Constitutional Compliance:
- Principle 2: Append-Only Reality (idempotent writes prevent duplicates)
"""

import logging
import random
import time
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict

logger = logging.getLogger(__name__)


class DualWriteRetryManager:
    """
    Implements retry logic with exponential backoff.

    Important: Retries must be idempotent (same event won't be duplicated).
    """

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 0.1,  # 100ms
        max_delay: float = 5.0,  # 5 seconds
        jitter: bool = True,
    ):
        """
        Initialize retry manager.

        Args:
            max_retries: Maximum number of retry attempts
            initial_delay: Initial delay in seconds
            max_delay: Maximum delay in seconds
            jitter: Whether to add random jitter to delays
        """
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.jitter = jitter

        # In-memory idempotency tracking (for testing)
        # In production, use database or distributed cache
        self._success_cache: Dict[str, datetime] = {}
        self._cache_ttl = timedelta(hours=24)  # 24 hour TTL

    def execute_with_retry(
        self,
        operation: Callable[[], bool],
        operation_id: str,
        is_idempotent: bool = True,
    ) -> bool:
        """
        Execute operation with retry logic.

        Args:
            operation: Function to execute (returns bool for success)
            operation_id: Unique ID for idempotency checking
            is_idempotent: Whether operation can be safely retried

        Returns:
            True if operation succeeded (or already succeeded)
            False if all retries failed
        """
        # Check if already succeeded (idempotency)
        if is_idempotent and self._already_succeeded(operation_id):
            logger.info(f"Operation {operation_id} already succeeded, skipping retry")
            return True

        delay = self.initial_delay

        for attempt in range(self.max_retries + 1):  # +1 for initial attempt
            try:
                success = operation()

                if success:
                    # Record success for idempotency
                    if is_idempotent:
                        self._record_success(operation_id)
                    logger.info(
                        f"Operation {operation_id} succeeded on attempt "
                        f"{attempt + 1}"
                    )
                    return True

                # Operation returned False (non-exception failure)
                logger.warning(
                    f"Operation {operation_id} failed (non-exception), "
                    f"attempt {attempt + 1}/{self.max_retries + 1}"
                )

            except Exception as e:
                logger.warning(
                    f"Operation {operation_id} failed with exception on "
                    f"attempt {attempt + 1}/{self.max_retries + 1}: {str(e)}"
                )

            # If this was the last attempt, fail
            if attempt == self.max_retries:
                total_attempts = self.max_retries + 1
                logger.error(
                    f"All {total_attempts} attempts failed for operation: "
                    f"{operation_id}"
                )
                return False

            # Exponential backoff with jitter
            delay = min(delay * 2, self.max_delay)
            if self.jitter:
                delay = delay * (0.5 + random.random())  # 0.5x to 1.5x

            logger.debug(f"Retrying operation {operation_id} after {delay:.2f}s")
            time.sleep(delay)

        return False

    def _already_succeeded(self, operation_id: str) -> bool:
        """
        Check if operation already succeeded (idempotency).

        Args:
            operation_id: Unique operation identifier

        Returns:
            True if operation already succeeded
        """
        if operation_id in self._success_cache:
            success_time = self._success_cache[operation_id]
            # Check if cache entry is still valid
            if datetime.now(timezone.utc) - success_time < self._cache_ttl:
                return True
            else:
                # Expired, remove from cache
                del self._success_cache[operation_id]

        return False

    def _record_success(self, operation_id: str):
        """
        Record operation success for idempotency.

        Args:
            operation_id: Unique operation identifier
        """
        self._success_cache[operation_id] = datetime.now(timezone.utc)

    def clear_cache(self):
        """Clear idempotency cache (for testing)."""
        self._success_cache.clear()
        logger.info("Idempotency cache cleared")
