"""
Atomic Dual-Write Transactions

Implements atomic writes across Almona and RealityOS databases using
two-phase commit pattern for cross-database transactions.

Constitutional Compliance:
- Principle 2: Append-Only Reality (atomic guarantees prevent partial writes)
"""

import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Generator, Optional, Tuple

logger = logging.getLogger(__name__)


class AtomicDualWriteTransaction:
    """
    Implements atomic writes across Almona and RealityOS databases.

    Pattern: Two-Phase Commit
        Phase 1: Prepare (both databases ready)
        Phase 2: Commit (both databases commit) or Rollback (both roll back)

    Note: True atomicity across different databases requires distributed
    transaction coordinator. This implementation provides best-effort
    atomicity with proper rollback handling.
    """

    def __init__(
        self,
        almona_connection: Any,  # Database connection for Almona
        realityos_connection: Any,  # Database connection for RealityOS
    ):
        """
        Initialize atomic transaction manager.

        Args:
            almona_connection: Database connection for Almona
            realityos_connection: Database connection for RealityOS
        """
        self.almona_conn = almona_connection
        self.realityos_conn = realityos_connection
        self.transaction_id: Optional[str] = None

    @contextmanager
    def transaction(
        self,
    ) -> Generator[Tuple[Any, Any], None, None]:
        """
        Atomic transaction context manager.

        Usage:
            with atomic_transaction.transaction() as (
                almona_cursor, realityos_cursor
            ):
                # Write to Almona using almona_cursor
                # Write to RealityOS using realityos_cursor
                # Both commit or both roll back

        Yields:
            Tuple of (almona_cursor, realityos_cursor)
        """
        self.transaction_id = f"tx_{datetime.now(timezone.utc).isoformat()}"
        logger.info(f"Starting atomic transaction: {self.transaction_id}")

        # Phase 1: Prepare (begin transactions)
        almona_cursor = self.almona_conn.cursor()
        realityos_cursor = self.realityos_conn.cursor()

        almona_committed = False
        realityos_committed = False

        try:
            # Begin transactions
            almona_cursor.execute("BEGIN TRANSACTION")
            realityos_cursor.execute("BEGIN TRANSACTION")

            # Phase 1.5: Execute operations
            yield (almona_cursor, realityos_cursor)

            # Phase 2: Commit (both succeed)
            almona_cursor.execute("COMMIT")
            almona_committed = True

            realityos_cursor.execute("COMMIT")
            realityos_committed = True

            logger.info(f"Atomic transaction committed: {self.transaction_id}")

        except Exception as e:
            # One failed - rollback both
            logger.error(
                f"Atomic transaction failed, rolling back: "
                f"{self.transaction_id} - {str(e)}"
            )

            # Rollback Almona if not committed
            if not almona_committed:
                try:
                    almona_cursor.execute("ROLLBACK")
                except Exception as rollback_error:
                    logger.error(f"Almona rollback failed: {rollback_error}")

            # Rollback RealityOS if not committed
            if not realityos_committed:
                try:
                    realityos_cursor.execute("ROLLBACK")
                except Exception as rollback_error:
                    logger.error(f"RealityOS rollback failed: {rollback_error}")

            # Re-raise original error
            raise

        finally:
            # Close cursors
            try:
                almona_cursor.close()
            except Exception:
                pass
            try:
                realityos_cursor.close()
            except Exception:
                pass

    def execute_atomic_dual_write(
        self,
        almona_operation: Callable[[Any], Dict[str, Any]],
        realityos_operation: Callable[[Any], Dict[str, Any]],
        validation_callback: Optional[
            Callable[[Dict[str, Any], Dict[str, Any]], Tuple[bool, str]]
        ] = None,
    ) -> bool:
        """
        Execute atomic dual-write with validation.

        Args:
            almona_operation: Function that takes cursor, returns result
                dict
            realityos_operation: Function that takes cursor, returns result
                dict
            validation_callback: Optional function to validate match
                Returns (is_valid: bool, reason: str)

        Returns:
            True if both operations succeeded and validated
            False if any operation failed (both rolled back)

        Raises:
            Exception: If validation fails or operation fails
        """
        with self.transaction() as (almona_cursor, realityos_cursor):
            # Execute Almona operation
            almona_result = almona_operation(almona_cursor)

            # Execute RealityOS operation
            realityos_result = realityos_operation(realityos_cursor)

            # Validate match (if callback provided)
            if validation_callback:
                is_valid, reason = validation_callback(almona_result, realityos_result)
                if not is_valid:
                    raise ValueError(f"Validation failed: {reason}")

            return True
