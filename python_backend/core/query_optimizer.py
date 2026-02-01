"""
Query Optimizer

Provides query optimization recommendations based on profiling results.
Analyzes queries and suggests index optimizations, query rewrites, and
caching strategies.

@since Phase 1: Precision Upgrade Plan (January 2026)
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.query_profiler import QueryProfileResult


@dataclass
class IndexRecommendation:
    """Index recommendation"""

    table_name: str
    columns: List[str]
    index_type: str  # 'btree', 'gin', 'gist', 'hash'
    reason: str
    estimated_improvement: str
    create_statement: str


@dataclass
class QueryOptimization:
    """Query optimization recommendation"""

    original_query: str
    optimized_query: Optional[str] = None
    optimization_type: str = ""  # 'index', 'rewrite', 'cache', 'join'
    reason: str = ""
    estimated_improvement: str = ""
    changes: List[str] = field(default_factory=list)


@dataclass
class OptimizationReport:
    """Query optimization report"""

    query: str
    profile_result: QueryProfileResult
    optimizations: List[QueryOptimization] = field(default_factory=list)
    index_recommendations: List[IndexRecommendation] = field(default_factory=list)
    caching_recommendations: List[str] = field(default_factory=list)
    overall_recommendation: str = ""


class QueryOptimizer:
    """Analyzes queries and provides optimization recommendations"""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def optimize_query(
        self, query: str, profile_result: Optional[QueryProfileResult] = None
    ) -> OptimizationReport:
        """
        Analyze query and provide optimization recommendations

        Args:
            query: SQL query to optimize
            profile_result: Optional query profile result
                (will profile if not provided)

        Returns:
            OptimizationReport with recommendations
        """
        # Profile query if not provided
        if not profile_result:
            from core.query_profiler import QueryProfiler

            profiler = QueryProfiler(self.session)
            profile_result = await profiler.profile_query(query)

        report = OptimizationReport(query=query, profile_result=profile_result)

        # Analyze query for optimizations
        await self._analyze_query(query, profile_result, report)

        # Generate index recommendations
        await self._suggest_indexes(query, profile_result, report)

        # Generate caching recommendations
        self._suggest_caching(query, profile_result, report)

        # Generate overall recommendation
        self._generate_overall_recommendation(report)

        return report

    async def _analyze_query(
        self,
        query: str,
        profile_result: QueryProfileResult,
        report: OptimizationReport,
    ):
        """Analyze query for optimization opportunities"""
        query_lower = query.lower()

        # Check for sequential scans
        if profile_result.has_seq_scan and not profile_result.has_index_scan:
            optimization = QueryOptimization(
                original_query=query,
                optimization_type="index",
                reason=(
                    "Query uses sequential scans - "
                    "add indexes for better performance"
                ),
                estimated_improvement="50-90% improvement expected",
                changes=[
                    "Add indexes on WHERE clause columns",
                    "Add indexes on JOIN columns",
                ],
            )
            report.optimizations.append(optimization)

        # Check for N+1 query patterns (simplified detection)
        if query_lower.count("select") > 1 and "join" not in query_lower:
            optimization = QueryOptimization(
                original_query=query,
                optimization_type="rewrite",
                reason=(
                    "Multiple SELECT statements detected - " "consider using JOINs"
                ),
                estimated_improvement="60-80% improvement expected",
                changes=["Rewrite multiple queries as single query with JOINs"],
            )
            report.optimizations.append(optimization)

        # Check for SELECT *
        if "select *" in query_lower:
            optimization = QueryOptimization(
                original_query=query,
                optimization_type="rewrite",
                reason="SELECT * retrieves unnecessary columns",
                estimated_improvement="10-30% improvement expected",
                changes=["Replace SELECT * with specific columns"],
            )
            report.optimizations.append(optimization)

        # Check for slow execution time
        if profile_result.execution_time_ms > 1000:
            optimization = QueryOptimization(
                original_query=query,
                optimization_type="general",
                reason=(
                    f"Slow query execution "
                    f"({profile_result.execution_time_ms:.2f}ms)"
                ),
                estimated_improvement=("Review query plan and consider optimization"),
                changes=[
                    "Profile query with EXPLAIN ANALYZE",
                    "Review indexes",
                    "Consider query rewrite",
                ],
            )
            report.optimizations.append(optimization)

    async def _suggest_indexes(
        self,
        query: str,
        profile_result: QueryProfileResult,
        report: OptimizationReport,
    ):
        """Suggest indexes based on query analysis"""
        # Extract table and column information from query (simplified)
        # In production, use proper SQL parsing

        query_lower = query.lower()

        # Look for WHERE clauses
        if "where" in query_lower:
            # Extract table names and columns (simplified)
            tables = self._extract_tables(query)

            for table in tables:
                # Suggest index on WHERE clause columns (simplified)
                # In production, parse WHERE clauses properly
                if table and profile_result.has_seq_scan:
                    recommendation = IndexRecommendation(
                        table_name=table,
                        columns=["column_name"],  # Extracted from WHERE
                        index_type="btree",
                        reason="Sequential scan detected on WHERE clause",
                        estimated_improvement="50-90% query time reduction",
                        create_statement=(
                            f"CREATE INDEX idx_{table}_columns "
                            f"ON {table} (column_name)"
                        ),
                    )
                    report.index_recommendations.append(recommendation)

        # Check for JOIN conditions
        if "join" in query_lower and profile_result.execution_time_ms > 100:
            tables = self._extract_tables(query)
            for table in tables:
                recommendation = IndexRecommendation(
                    table_name=table,
                    columns=["join_column"],  # Extracted from JOIN
                    index_type="btree",
                    reason="JOIN performance can be improved with indexes",
                    estimated_improvement="30-70% JOIN time reduction",
                    create_statement=(
                        f"CREATE INDEX idx_{table}_join " f"ON {table} (join_column)"
                    ),
                )
                report.index_recommendations.append(recommendation)

    def _extract_tables(self, query: str) -> List[str]:
        """Extract table names from query (simplified)"""
        # Simplified table extraction
        # In production, use proper SQL parsing library
        import re

        tables = []

        # Look for FROM clauses
        from_matches = re.findall(r"from\s+(\w+)", query, re.IGNORECASE)
        tables.extend(from_matches)

        # Look for JOIN clauses
        join_matches = re.findall(r"join\s+(\w+)", query, re.IGNORECASE)
        tables.extend(join_matches)

        # Remove duplicates
        return list(set(tables))

    def _suggest_caching(
        self,
        query: str,
        profile_result: QueryProfileResult,
        report: OptimizationReport,
    ):
        """Suggest caching strategies"""
        query_lower = query.lower()

        # Check if query is a good candidate for caching
        is_read_only = (
            "select" in query_lower
            and "insert" not in query_lower
            and "update" not in query_lower
            and "delete" not in query_lower
        )

        if is_read_only:
            # Check for frequent execution
            if profile_result.execution_time_ms > 50:
                report.caching_recommendations.append(
                    "Query is read-only and takes >50ms - " "consider caching results"
                )

            # Check for complex queries
            if (
                "join" in query_lower
                or "group by" in query_lower
                or "order by" in query_lower
            ):
                report.caching_recommendations.append(
                    "Complex query detected - consider caching "
                    "with TTL (e.g., 5-15 minutes)"
                )

    def _generate_overall_recommendation(self, report: OptimizationReport):
        """Generate overall optimization recommendation"""
        recommendations = []

        if report.index_recommendations:
            recommendations.append(
                f"Add {len(report.index_recommendations)} indexes "
                f"for better performance"
            )

        if report.optimizations:
            recommendations.append(
                f"Consider {len(report.optimizations)} query optimizations"
            )

        if report.caching_recommendations:
            recommendations.append(
                f"Consider caching for "
                f"{len(report.caching_recommendations)} scenarios"
            )

        if recommendations:
            report.overall_recommendation = " | ".join(recommendations)
        else:
            report.overall_recommendation = "Query appears to be well-optimized"

    async def check_existing_indexes(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Check existing indexes on a table

        Args:
            table_name: Table name

        Returns:
            List of index information
        """
        session = self.session or AsyncSessionLocal()

        try:
            result = await session.execute(
                text(
                    """
                    SELECT
                        indexname,
                        indexdef
                    FROM pg_indexes
                    WHERE tablename = :table_name
                    ORDER BY indexname
                """
                ),
                {"table_name": table_name},
            )

            indexes = []
            for row in result:
                indexes.append({"name": row[0], "definition": row[1]})

            return indexes

        except Exception:
            return []
        finally:
            if not self.session:
                await session.close()
