"""
Database Query Profiler

Profiles database queries using PostgreSQL EXPLAIN ANALYZE.
Provides detailed query execution plans and performance metrics.

@since Phase 1: Precision Upgrade Plan (January 2026)
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import json
import re
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal


@dataclass
class QueryPlanNode:
    """Individual node in query execution plan"""

    node_type: str
    startup_cost: float
    total_cost: float
    rows: int
    actual_startup_time: Optional[float] = None
    actual_total_time: Optional[float] = None
    actual_rows: Optional[int] = None
    width: Optional[int] = None
    plans: List["QueryPlanNode"] = field(default_factory=list)
    filter: Optional[str] = None
    index_name: Optional[str] = None
    scan_type: Optional[str] = None


@dataclass
class QueryProfileResult:
    """Query profiling result"""

    query: str
    execution_time_ms: float
    planning_time_ms: Optional[float] = None
    total_time_ms: Optional[float] = None
    rows_returned: Optional[int] = None
    plan: Optional[Dict[str, Any]] = None
    plan_json: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    indexes_used: List[str] = field(default_factory=list)
    indexes_suggested: List[str] = field(default_factory=list)
    has_seq_scan: bool = False
    has_index_scan: bool = False
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None


class QueryProfiler:
    """Database query profiler using EXPLAIN ANALYZE"""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def profile_query(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
        format: str = "JSON",
    ) -> QueryProfileResult:
        """
        Profile a query using EXPLAIN ANALYZE

        Args:
            query: SQL query to profile
            params: Query parameters (for parameterized queries)
            format: Output format ("JSON", "TEXT", or "YAML")

        Returns:
            QueryProfileResult with profiling information
        """
        session = self.session or AsyncSessionLocal()

        try:
            # Build EXPLAIN ANALYZE query
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT {format}) {query}"

            # Execute EXPLAIN ANALYZE
            result = await session.execute(text(explain_query), params or {})

            if format == "JSON":
                row = result.fetchone()
                if row:
                    plan_json = (
                        row[0] if isinstance(row[0], str) else json.dumps(row[0])
                    )
                    plan_data = json.loads(plan_json)
                    if isinstance(plan_data, list):
                        return self._parse_json_plan(query, plan_data)

            # Fallback to TEXT format parsing
            rows = result.fetchall()
            plan_text = "\n".join(str(row[0]) for row in rows)

            return self._parse_text_plan(query, plan_text)

        except Exception as e:
            return QueryProfileResult(
                query=query,
                execution_time_ms=0,
                warnings=[f"Error profiling query: {str(e)}"],
            )
        finally:
            if not self.session:
                await session.close()

    def _parse_json_plan(
        self, query: str, plan_data: List[Dict[str, Any]]
    ) -> QueryProfileResult:
        """Parse JSON format EXPLAIN ANALYZE output"""
        first_item = plan_data[0] if plan_data else {}
        plan = first_item.get("Plan", {})
        timing = first_item.get("Planning Time", 0)
        execution_time = first_item.get("Execution Time", 0)

        result = QueryProfileResult(
            query=query,
            execution_time_ms=execution_time,
            planning_time_ms=timing,
            total_time_ms=timing + execution_time,
            plan=plan,
            plan_json=json.dumps(plan_data, indent=2),
        )

        # Extract metrics from plan
        self._analyze_plan(plan, result)

        return result

    def _parse_text_plan(self, query: str, plan_text: str) -> QueryProfileResult:
        """Parse TEXT format EXPLAIN ANALYZE output"""
        result = QueryProfileResult(query=query, execution_time_ms=0)

        # Extract execution time
        exec_time_match = re.search(r"Execution Time: ([\d.]+) ms", plan_text)
        if exec_time_match:
            result.execution_time_ms = float(exec_time_match.group(1))

        # Extract planning time
        plan_time_match = re.search(r"Planning Time: ([\d.]+) ms", plan_text)
        if plan_time_match:
            result.planning_time_ms = float(plan_time_match.group(1))
            result.total_time_ms = result.planning_time_ms + result.execution_time_ms

        # Extract rows
        rows_match = re.search(r"\(actual rows=(\d+)\)", plan_text)
        if rows_match:
            result.rows_returned = int(rows_match.group(1))

        # Detect sequential scans
        if "Seq Scan" in plan_text:
            result.has_seq_scan = True
            result.warnings.append("Sequential scan detected - consider adding index")

        # Detect index scans
        if "Index Scan" in plan_text or "Index Only Scan" in plan_text:
            result.has_index_scan = True

            # Extract index names
            index_matches = re.findall(r"Index Scan.*?on (\w+)", plan_text)
            result.indexes_used.extend(index_matches)

        # Analyze for recommendations
        self._analyze_text_plan(plan_text, result)

        return result

    def _analyze_plan(self, plan: Dict[str, Any], result: QueryProfileResult):
        """Analyze query plan for optimization opportunities"""
        node_type = plan.get("Node Type", "")

        # Check for sequential scans
        if "Seq Scan" in node_type:
            result.has_seq_scan = True
            table_name = plan.get("Relation Name", "unknown")
            result.warnings.append(
                f"Sequential scan on {table_name} - consider adding index"
            )

        # Check for index scans
        if "Index Scan" in node_type or "Index Only Scan" in node_type:
            result.has_index_scan = True
            index_name = plan.get("Index Name")
            if index_name:
                result.indexes_used.append(index_name)

        # Extract cost information
        if "Total Cost" in plan:
            result.estimated_cost = plan["Total Cost"]
        if "Actual Total Time" in plan:
            result.actual_cost = plan["Actual Total Time"]

        # Analyze child plans
        if "Plans" in plan:
            for child_plan in plan["Plans"]:
                self._analyze_plan(child_plan, result)

        # Generate recommendations
        self._generate_recommendations(plan, result)

    def _analyze_text_plan(self, plan_text: str, result: QueryProfileResult):
        """Analyze text format plan for optimization opportunities"""
        # Check for expensive operations
        if "Nested Loop" in plan_text and result.execution_time_ms > 100:
            result.warnings.append("Nested loop detected - consider join optimization")

        if "Hash Join" in plan_text and result.execution_time_ms > 200:
            result.warnings.append(
                "Hash join detected - verify join conditions have indexes"
            )

    def _generate_recommendations(
        self, plan: Dict[str, Any], result: QueryProfileResult
    ):
        """Generate optimization recommendations"""
        # Check for high cost operations
        if result.estimated_cost and result.estimated_cost > 10000:
            result.recommendations.append(
                "High estimated cost - consider query optimization or indexing"
            )

        # Check for sequential scans
        if result.has_seq_scan and not result.has_index_scan:
            result.recommendations.append(
                "Only sequential scans found - " "add indexes for better performance"
            )

        # Check execution time
        if result.execution_time_ms > 1000:
            result.recommendations.append(
                f"Slow query ({result.execution_time_ms:.2f}ms) - "
                f"consider optimization"
            )

        # Check for missing indexes
        if result.has_seq_scan:
            # Suggest indexes based on WHERE clauses (simplified)
            result.indexes_suggested.append(
                "Consider adding indexes on columns used in WHERE clauses"
            )

    async def profile_parameterized_query(
        self, query_template: str, param_sets: List[Dict[str, Any]]
    ) -> List[QueryProfileResult]:
        """
        Profile a query with multiple parameter sets

        Useful for understanding query performance across different inputs
        """
        results = []

        for params in param_sets:
            # Replace parameters in query
            # (simplified - use proper parameterization in production)
            query = query_template
            for key, value in params.items():
                query = query.replace(f":{key}", str(value))

            result = await self.profile_query(query, params)
            results.append(result)

        return results

    async def compare_queries(
        self, queries: List[str], params: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, QueryProfileResult]:
        """
        Compare multiple queries

        Useful for comparing different query approaches
        """
        results = {}

        for i, query in enumerate(queries):
            query_params = params[i] if params and i < len(params) else None
            result = await self.profile_query(query, query_params)
            results[f"query_{i+1}"] = result

        return results


async def profile_query(
    query: str, params: Optional[Dict[str, Any]] = None
) -> QueryProfileResult:
    """
    Convenience function to profile a single query

    Args:
        query: SQL query to profile
        params: Query parameters

    Returns:
        QueryProfileResult
    """
    profiler = QueryProfiler()
    return await profiler.profile_query(query, params)
