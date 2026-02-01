"""
Slow Query Detector

Detects slow queries using pg_stat_statements extension.
Tracks query performance over time and identifies optimization opportunities.

@since Phase 1: Precision Upgrade Plan (January 2026)
"""

import re
from typing import List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal


@dataclass
class SlowQuery:
    """Slow query information"""

    query: str
    normalized_query: str
    calls: int
    total_time_ms: float
    mean_time_ms: float
    min_time_ms: float
    max_time_ms: float
    stddev_time_ms: float
    rows: int
    shared_blks_hit: int
    shared_blks_read: int
    temp_blks_read: int
    temp_blks_written: int
    blk_read_time_ms: float
    blk_write_time_ms: float
    queryid: Optional[int] = None
    dbid: Optional[int] = None
    userid: Optional[int] = None


@dataclass
class SlowQueryReport:
    """Slow query report"""

    queries: List[SlowQuery]
    total_queries: int
    slow_queries_count: int
    threshold_ms: float
    generated_at: datetime
    recommendations: List[str] = field(default_factory=list)


class SlowQueryDetector:
    """Detects slow queries using pg_stat_statements"""

    def __init__(
        self, session: Optional[AsyncSession] = None, threshold_ms: float = 1000.0
    ):
        self.session = session
        self.threshold_ms = threshold_ms

    async def ensure_pg_stat_statements(self) -> bool:
        """
        Ensure pg_stat_statements extension is enabled

        Returns:
            True if enabled, False otherwise
        """
        session = self.session or AsyncSessionLocal()

        try:
            # Check if extension exists
            result = await session.execute(
                text(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                    )
                """
                )
            )
            exists = result.scalar()

            if not exists:
                # Try to create extension (requires superuser)
                try:
                    await session.execute(
                        text("CREATE EXTENSION IF NOT EXISTS pg_stat_statements")
                    )
                    await session.commit()
                    return True
                except Exception:
                    # Extension creation failed (likely not superuser)
                    return False

            return True

        except Exception:
            return False
        finally:
            if not self.session:
                await session.close()

    async def get_slow_queries(
        self, limit: int = 50, min_calls: int = 10, threshold_ms: Optional[float] = None
    ) -> List[SlowQuery]:
        """
        Get slow queries from pg_stat_statements

        Args:
            limit: Maximum number of queries to return
            min_calls: Minimum number of calls to include query
            threshold_ms: Threshold in milliseconds (overrides instance threshold)

        Returns:
            List of SlowQuery objects
        """
        threshold = threshold_ms or self.threshold_ms
        session = self.session or AsyncSessionLocal()

        try:
            # Ensure extension is enabled
            enabled = await self.ensure_pg_stat_statements()
            if not enabled:
                return []

            # Query pg_stat_statements
            result = await session.execute(
                text(
                    """
                    SELECT 
                        queryid,
                        dbid,
                        userid,
                        query,
                        calls,
                        total_exec_time as total_time_ms,
                        mean_exec_time as mean_time_ms,
                        min_exec_time as min_time_ms,
                        max_exec_time as max_time_ms,
                        stddev_exec_time as stddev_time_ms,
                        rows,
                        shared_blks_hit,
                        shared_blks_read,
                        temp_blks_read,
                        temp_blks_written,
                        blk_read_time,
                        blk_write_time
                    FROM pg_stat_statements
                    WHERE mean_exec_time >= :threshold
                        AND calls >= :min_calls
                    ORDER BY mean_exec_time DESC
                    LIMIT :limit
                """
                ),
                {"threshold": threshold, "min_calls": min_calls, "limit": limit},
            )

            slow_queries = []
            for row in result:
                slow_query = SlowQuery(
                    queryid=row[0],
                    dbid=row[1],
                    userid=row[2],
                    query=row[3],
                    normalized_query=self._normalize_query(row[3]),
                    calls=row[4],
                    total_time_ms=row[5],
                    mean_time_ms=row[6],
                    min_time_ms=row[7],
                    max_time_ms=row[8],
                    stddev_time_ms=row[9],
                    rows=row[10],
                    shared_blks_hit=row[11],
                    shared_blks_read=row[12],
                    temp_blks_read=row[13],
                    temp_blks_written=row[14],
                    blk_read_time_ms=row[15] if row[15] else 0,
                    blk_write_time_ms=row[16] if row[16] else 0,
                )
                slow_queries.append(slow_query)

            return slow_queries

        except Exception:
            # pg_stat_statements might not be available
            return []
        finally:
            if not self.session:
                await session.close()

    def _normalize_query(self, query: str) -> str:
        """
        Normalize query for grouping (simplified)

        In production, use proper query normalization
        """
        # Remove whitespace
        normalized = " ".join(query.split())

        # Remove comments
        normalized = re.sub(r"--.*", "", normalized)
        normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.DOTALL)

        # Normalize whitespace again
        normalized = " ".join(normalized.split())

        return normalized

    async def generate_report(
        self, limit: int = 50, min_calls: int = 10
    ) -> SlowQueryReport:
        """
        Generate slow query report

        Args:
            limit: Maximum number of queries to include
            min_calls: Minimum number of calls to include query

        Returns:
            SlowQueryReport
        """
        slow_queries = await self.get_slow_queries(limit=limit, min_calls=min_calls)

        report = SlowQueryReport(
            queries=slow_queries,
            total_queries=len(slow_queries),
            slow_queries_count=len(
                [q for q in slow_queries if q.mean_time_ms >= self.threshold_ms]
            ),
            threshold_ms=self.threshold_ms,
            generated_at=datetime.utcnow(),
        )

        # Generate recommendations
        self._generate_recommendations(report)

        return report

    def _generate_recommendations(self, report: SlowQueryReport):
        """Generate optimization recommendations"""
        if not report.queries:
            return

        # Check for frequently called slow queries
        frequent_slow = [
            q for q in report.queries if q.calls > 100 and q.mean_time_ms > 500
        ]
        if frequent_slow:
            report.recommendations.append(
                f"{len(frequent_slow)} frequently called slow queries detected - high priority optimization"
            )

        # Check for queries with high cache miss rate
        high_cache_miss = [
            q for q in report.queries if q.shared_blks_read > q.shared_blks_hit * 0.1
        ]
        if high_cache_miss:
            report.recommendations.append(
                f"{len(high_cache_miss)} queries with high cache miss rate - consider increasing shared_buffers or optimizing queries"
            )

        # Check for queries with high I/O time
        high_io = [
            q
            for q in report.queries
            if (q.blk_read_time_ms + q.blk_write_time_ms) > q.mean_time_ms * 0.5
        ]
        if high_io:
            report.recommendations.append(
                f"{len(high_io)} queries with high I/O time - consider adding indexes or optimizing disk access"
            )

        # Check for queries with high variance
        high_variance = [
            q for q in report.queries if q.stddev_time_ms > q.mean_time_ms * 0.5
        ]
        if high_variance:
            report.recommendations.append(
                f"{len(high_variance)} queries with high execution time variance - may indicate parameter sensitivity"
            )

    async def reset_statistics(self):
        """
        Reset pg_stat_statements statistics

        Requires superuser privileges
        """
        session = self.session or AsyncSessionLocal()

        try:
            await session.execute(text("SELECT pg_stat_statements_reset()"))
            await session.commit()
        except Exception as e:
            raise Exception(f"Failed to reset statistics: {str(e)}")
        finally:
            if not self.session:
                await session.close()

    async def get_query_statistics(self, queryid: int) -> Optional[SlowQuery]:
        """
        Get statistics for a specific query

        Args:
            queryid: Query ID from pg_stat_statements

        Returns:
            SlowQuery or None if not found
        """
        session = self.session or AsyncSessionLocal()

        try:
            result = await session.execute(
                text(
                    """
                    SELECT 
                        queryid,
                        dbid,
                        userid,
                        query,
                        calls,
                        total_exec_time,
                        mean_exec_time,
                        min_exec_time,
                        max_exec_time,
                        stddev_exec_time,
                        rows,
                        shared_blks_hit,
                        shared_blks_read,
                        temp_blks_read,
                        temp_blks_written,
                        blk_read_time,
                        blk_write_time
                    FROM pg_stat_statements
                    WHERE queryid = :queryid
                """
                ),
                {"queryid": queryid},
            )

            row = result.fetchone()
            if not row:
                return None

            return SlowQuery(
                queryid=row[0],
                dbid=row[1],
                userid=row[2],
                query=row[3],
                normalized_query=self._normalize_query(row[3]),
                calls=row[4],
                total_time_ms=row[5],
                mean_time_ms=row[6],
                min_time_ms=row[7],
                max_time_ms=row[8],
                stddev_time_ms=row[9],
                rows=row[10],
                shared_blks_hit=row[11],
                shared_blks_read=row[12],
                temp_blks_read=row[13],
                temp_blks_written=row[14],
                blk_read_time_ms=row[15] if row[15] else 0,
                blk_write_time_ms=row[16] if row[16] else 0,
            )

        except Exception:
            return None
        finally:
            if not self.session:
                await session.close()
