"""
RealityOS Event Ledger
Append-only, cryptographically-chained event storage (Principles 2 & 3).
"""

import json
from datetime import datetime
from typing import Optional, List
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from realityos_core.models.event_models import (
    BaseEvent,
    EventRecord,
    EventHasher,
    CoreEventType,
)


class EventLedgerError(Exception):
    """Base exception for EventLedger errors."""

    pass


class ChainIntegrityError(EventLedgerError):
    """Raised when chain integrity is compromised."""

    pass


class EventLedger:
    """
    Append-only event ledger with cryptographic chaining.

    Implements:
    - Principle 2: Append-only (no updates/deletes)
    - Principle 3: Cryptographic chain of custody
    """

    def __init__(self, database_url: str):
        """
        Initialize EventLedger with database connection.

        Args:
            database_url: PostgreSQL connection URL
        """
        self.engine = create_engine(database_url, pool_pre_ping=True)
        self.Session = sessionmaker(bind=self.engine)

        # Cache for performance
        self._last_hash = None
        self._last_position = None

        # Verify connection and chain integrity on startup
        self._verify_chain_integrity()

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

    def _get_last_event_info(self) -> tuple[Optional[str], int]:
        """
        Get hash and position of last event in chain.

        Returns:
            Tuple of (last_hash, last_position)
            Returns (None, 0) for empty chain (only genesis)
        """
        with self._get_session() as session:
            result = session.execute(
                text(
                    """
                SELECT event_hash, chain_position
                FROM reality_events
                WHERE prev_hash IS NOT NULL
                ORDER BY chain_position DESC
                LIMIT 1
            """
                )
            )

            row = result.fetchone()
            if row:
                return row[0], row[1]

            # Only genesis exists
            genesis_result = session.execute(
                text(
                    """
                SELECT event_hash, chain_position
                FROM reality_events
                WHERE prev_hash IS NULL
                LIMIT 1
            """
                )
            )

            genesis = genesis_result.fetchone()
            if genesis:
                # Genesis is at position 1, chain starts after
                return genesis[0], 1
            else:
                # Empty database (should not happen)
                return None, 0

    def record_event(self, event: BaseEvent) -> EventRecord:
        """
        Record an event in the ledger (append-only).

        Args:
            event: Event to record

        Returns:
            EventRecord with system fields populated

        Raises:
            ChainIntegrityError: If chain integrity check fails
            IntegrityError: If database constraints violated
        """
        # Get previous event info
        prev_hash, last_position = self._get_last_event_info()

        # Compute event hash
        event_hash = None
        nonce = 0
        max_attempts = 10  # Prevent infinite loop on hash collision

        for attempt in range(max_attempts):
            event_hash = EventHasher.compute_event_hash(
                prev_hash=prev_hash, event_data=event, nonce=nonce
            )

            # Check for hash collision (extremely unlikely)
            if not self._hash_exists(event_hash):
                break

            nonce += 1
            if attempt == max_attempts - 1:
                raise EventLedgerError(
                    f"Hash collision after {max_attempts} attempts. "
                    "This should never happen with SHA-256."
                )

        # Build database record
        chain_position = last_position + 1

        # For genesis (prev_hash is None), we reference the genesis event
        if prev_hash is None:
            # This should only happen if database is empty (no genesis)
            # We should create genesis first
            raise ChainIntegrityError(
                "Cannot record event: genesis event missing. "
                "Run migration 041_realityos_event_ledger.sql first."
            )

        # Insert into database
        with self._get_session() as session:
            # Build SQL with parameter binding (safe from injection)
            # NOTE: PRIMARY KEY is (event_hash, recorded_at) for
            # partitioned table
            recorded_at = datetime.utcnow()
            created_at = datetime.utcnow()

            insert_sql = text(
                """
                INSERT INTO reality_events (
                    event_hash,
                    prev_hash,
                    event_type,
                    entity_id,
                    vertical_id,
                    proof,
                    payload,
                    recorded_at,
                    created_at
                ) VALUES (
                    :event_hash,
                    :prev_hash,
                    :event_type,
                    :entity_id,
                    :vertical_id,
                    :proof_json,
                    :payload_json,
                    :recorded_at,
                    :created_at
                )
            """
            )

            params = {
                "event_hash": event_hash,
                "prev_hash": prev_hash,
                "event_type": event.event_type.value,
                "entity_id": event.entity_id,
                "vertical_id": event.vertical_id,
                "proof_json": json.dumps(event.proof.dict()),
                "payload_json": json.dumps(event.payload),
                "recorded_at": recorded_at,
                "created_at": created_at,
            }

            try:
                session.execute(insert_sql, params)

                # Update cache
                self._last_hash = event_hash
                self._last_position = chain_position

                # Return event record
                return EventRecord(
                    event_hash=event_hash,
                    prev_hash=prev_hash,
                    chain_position=chain_position,
                    event_type=event.event_type,
                    entity_id=event.entity_id,
                    vertical_id=event.vertical_id,
                    proof=event.proof,
                    payload=event.payload,
                    recorded_at=params["recorded_at"],
                    created_at=params["created_at"],
                )

            except IntegrityError as e:
                # Check if it's a chain integrity violation
                if "prev_hash" in str(e).lower():
                    raise ChainIntegrityError(f"Chain integrity violation: {e}")
                raise EventLedgerError(f"Database integrity error: {e}")

    def _hash_exists(self, event_hash: str) -> bool:
        """Check if hash already exists in database."""
        with self._get_session() as session:
            result = session.execute(
                text("SELECT 1 FROM reality_events WHERE event_hash = :hash"),
                {"hash": event_hash},
            )
            return result.fetchone() is not None

    def _verify_chain_integrity(self) -> bool:
        """
        Verify integrity of the entire event chain.

        Returns:
            True if chain is valid

        Raises:
            ChainIntegrityError: If chain is broken
        """
        with self._get_session() as session:
            # Get all events in chain order
            result = session.execute(
                text(
                    """
                SELECT event_hash, prev_hash, chain_position,
                       event_type, entity_id, vertical_id, proof, payload
                FROM reality_events
                ORDER BY chain_position
            """
                )
            )

            events = result.fetchall()

            if not events:
                # Empty database is OK (fresh install)
                return True

            # Verify genesis event
            first_event = events[0]
            if first_event.prev_hash is not None:
                raise ChainIntegrityError(
                    f"First event (position {first_event.chain_position}) "
                    "should have prev_hash = NULL (genesis)"
                )

            # Verify chain
            previous_hash = first_event.event_hash

            for i in range(1, len(events)):
                current_event = events[i]

                # Check prev_hash matches previous event's hash
                if current_event.prev_hash != previous_hash:
                    raise ChainIntegrityError(
                        f"Chain broken at position "
                        f"{current_event.chain_position}. "
                        f"Expected prev_hash={previous_hash}, "
                        f"got {current_event.prev_hash}"
                    )

                # TODO: Recompute hash to verify it wasn't tampered with
                # (This requires recreating the event model from DB row)

                previous_hash = current_event.event_hash

            return True

    def get_chain(
        self,
        entity_id: Optional[str] = None,
        vertical_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[EventRecord]:
        """
        Get events from the chain, optionally filtered.

        Args:
            entity_id: Filter by entity ID
            vertical_id: Filter by vertical ID
            limit: Maximum number of events to return

        Returns:
            List of EventRecord objects
        """
        with self._get_session() as session:
            # Build query dynamically
            query = """
                SELECT event_hash, prev_hash, chain_position,
                       event_type, entity_id, vertical_id,
                       proof, payload, recorded_at, created_at
                FROM reality_events
                WHERE 1=1
            """

            params = {}

            if entity_id:
                query += " AND entity_id = :entity_id"
                params["entity_id"] = entity_id

            if vertical_id:
                query += " AND vertical_id = :vertical_id"
                params["vertical_id"] = vertical_id

            query += " ORDER BY chain_position DESC LIMIT :limit"
            params["limit"] = limit

            result = session.execute(text(query), params)
            rows = result.fetchall()

            # Convert to EventRecord objects
            events = []
            for row in rows:
                # Parse proof JSON
                proof_dict = json.loads(row.proof)
                # Handle timestamp conversion
                if isinstance(proof_dict.get("timestamp"), str):
                    proof_dict["timestamp"] = datetime.fromisoformat(
                        proof_dict["timestamp"].replace("Z", "+00:00")
                    )

                # Create EventRecord
                event = EventRecord(
                    event_hash=row.event_hash,
                    prev_hash=row.prev_hash,
                    chain_position=row.chain_position,
                    event_type=CoreEventType(row.event_type),
                    entity_id=row.entity_id,
                    vertical_id=row.vertical_id,
                    proof=proof_dict,  # Pydantic will validate
                    payload=json.loads(row.payload),
                    recorded_at=row.recorded_at,
                    created_at=row.created_at,
                )
                events.append(event)

            return events

    def get_event(self, event_hash: str) -> Optional[EventRecord]:
        """Get a specific event by hash."""
        with self._get_session() as session:
            result = session.execute(
                text(
                    """
                    SELECT event_hash, prev_hash, chain_position,
                           event_type, entity_id, vertical_id,
                           proof, payload, recorded_at, created_at
                    FROM reality_events
                    WHERE event_hash = :hash
                """
                ),
                {"hash": event_hash},
            )

            row = result.fetchone()
            if not row:
                return None

            # Parse and return as EventRecord
            proof_dict = json.loads(row.proof)
            if isinstance(proof_dict.get("timestamp"), str):
                proof_dict["timestamp"] = datetime.fromisoformat(
                    proof_dict["timestamp"].replace("Z", "+00:00")
                )

            return EventRecord(
                event_hash=row.event_hash,
                prev_hash=row.prev_hash,
                chain_position=row.chain_position,
                event_type=CoreEventType(row.event_type),
                entity_id=row.entity_id,
                vertical_id=row.vertical_id,
                proof=proof_dict,
                payload=json.loads(row.payload),
                recorded_at=row.recorded_at,
                created_at=row.created_at,
            )
