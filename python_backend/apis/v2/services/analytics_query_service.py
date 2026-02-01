from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.analytics_query_logs_repository import (
    AnalyticsQueryLogsRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    AnalyticsQueryRequest,
    AnalyticsQueryResponse,
    QueryMetadata,
    QueryPerformance,
)


def utcnow() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


class AnalyticsQueryService:
    """Service layer for analytics queries."""

    def __init__(self, supabase: Client):
        self._logs_repo = AnalyticsQueryLogsRepository(supabase)
        self._db = supabase

    def _execute_query(
        self, request: AnalyticsQueryRequest, user_id: UUID
    ) -> tuple[List[Dict[str, Any]], int]:
        """Execute analytics query and return results."""
        query_type = request.type
        filters = request.filters or {}
        date_range = request.date_range or {}
        limit = request.limit or 50
        offset = request.offset or 0

        data: List[Dict[str, Any]] = []
        total_count = 0

        # Extract date filters from filters dict or date_range dict
        start_date = filters.get("start_date") or date_range.get("start")
        end_date = filters.get("end_date") or date_range.get("end")

        try:
            if query_type.value == "revenue":
                # Query payments table
                query = self._db.table("payments").select(
                    "*", count="exact"
                ).eq("status", "completed")

                # Apply date filters if provided
                if start_date:
                    query = query.gte("completed_at", start_date)
                if end_date:
                    query = query.lte("completed_at", end_date)

                # Apply other filters
                if filters.get("currency"):
                    query = query.eq("currency", filters["currency"])

                # Get total count
                count_resp = query.execute()
                total_count = count_resp.count or 0

                # Apply pagination and get data
                query = query.order("completed_at", desc=True).range(
                    offset, offset + limit - 1
                )
                resp = query.execute()
                data = resp.data or []

            elif query_type.value == "project_volume":
                # Query fabricator_projects table
                query = self._db.table("fabricator_projects").select(
                    "*", count="exact"
                )

                # Apply date filters if provided
                if start_date:
                    query = query.gte("created_at", start_date)
                if end_date:
                    query = query.lte("created_at", end_date)

                # Apply status filter
                if filters.get("status"):
                    query = query.eq("status", filters["status"])

                # Get total count
                count_resp = query.execute()
                total_count = count_resp.count or 0

                # Apply pagination and get data
                query = query.order("created_at", desc=True).range(
                    offset, offset + limit - 1
                )
                resp = query.execute()
                data = resp.data or []

            elif query_type.value == "customer":
                # Query customer/profiles data (aggregate from projects)
                # For now, return project-based customer data
                query = self._db.table("fabricator_projects").select(
                    "client_name, id", count="exact"
                )

                # Apply date filters if provided
                if start_date:
                    query = query.gte("created_at", start_date)
                if end_date:
                    query = query.lte("created_at", end_date)

                # Get aggregated customer data
                resp = query.execute()
                projects = resp.data or []

                # Aggregate by customer
                customer_map: Dict[str, Dict[str, Any]] = {}
                for project in projects:
                    customer_name = project.get("client_name") or "Unknown"
                    if customer_name not in customer_map:
                        customer_map[customer_name] = {
                            "customer_name": customer_name,
                            "project_count": 0,
                        }
                    customer_map[customer_name]["project_count"] += 1

                data = list(customer_map.values())
                total_count = len(data)

                # Apply pagination
                data = data[offset:offset + limit]

            else:
                # For waste, production_time, custom: return empty for now
                # These require additional table structures
                data = []
                total_count = 0

        except Exception as e:
            # Log error but return empty result
            raise SupabaseError(
                message=f"Failed to execute {query_type.value} query",
                operation="execute_query",
                original_error=e
            )

        return data, total_count

    def execute_query(
        self,
        request: AnalyticsQueryRequest,
        user_id: UUID,
    ) -> AnalyticsQueryResponse:
        """Execute analytics query with logging."""
        start_time = datetime.now(timezone.utc)
        cache_hit = False
        error_message: Optional[str] = None

        try:
            # Execute query
            data, total_count = self._execute_query(request, user_id)

            # Calculate metadata
            limit = request.limit or 50
            offset = request.offset or 0
            page = (offset // limit) + 1 if limit > 0 else 1
            has_more = (offset + len(data)) < total_count

            metadata = QueryMetadata(
                total=total_count,
                filtered=total_count,  # Would be different if filters applied
                page=page,
                page_size=limit,
                has_more=has_more,
            )

            # Calculate performance
            end_time = datetime.now(timezone.utc)
            execution_time_ms = int(
                (end_time - start_time).total_seconds() * 1000
            )

            performance = QueryPerformance(
                query_time_ms=execution_time_ms,
                cache_hit=cache_hit,
                data_freshness=utcnow(),
            )

            response = AnalyticsQueryResponse(
                data=data,
                metadata=metadata,
                performance=performance,
            )

            # Log query (service role required for insert)
            try:
                log_data: Dict[str, Any] = {
                    "user_id": str(user_id),
                    "query_type": request.type.value,
                    "query_params": request.dict(),
                    "execution_time_ms": execution_time_ms,
                    "result_count": len(data),
                    "cache_hit": cache_hit,
                    "error_message": error_message,
                    "created_at": utcnow().isoformat(),
                }
                self._logs_repo.insert_log(log_data)
            except Exception:
                # Logging failure is non-fatal
                pass

            return response

        except Exception as e:
            error_message = str(e)
            execution_time_ms = int(
                (datetime.now(timezone.utc) - start_time).total_seconds()
                * 1000
            )

            # Log error
            try:
                log_data: Dict[str, Any] = {
                    "user_id": str(user_id),
                    "query_type": request.type.value,
                    "query_params": request.dict(),
                    "execution_time_ms": execution_time_ms,
                    "result_count": 0,
                    "cache_hit": False,
                    "error_message": error_message,
                    "created_at": utcnow().isoformat(),
                }
                self._logs_repo.insert_log(log_data)
            except Exception:
                pass

            raise SupabaseError(
                message=f"Failed to execute analytics query: {error_message}",
                operation="execute_query",
                original_error=e
            )

    def get_query_log(
        self, log_id: UUID, user_id: UUID
    ) -> Optional[AnalyticsQueryResponse]:
        """Get query result by log ID (reconstruct from log)."""
        try:
            log = self._logs_repo.get_log_by_id(log_id, user_id)
            if not log:
                return None

            # Reconstruct query response from log
            # Note: This is a simplified reconstruction
            # Full implementation would store result data separately
            # query_params = log.get("query_params", {})
            result_count = log.get("result_count", 0)

            metadata = QueryMetadata(
                total=result_count,
                filtered=result_count,
                page=1,
                page_size=result_count,
                has_more=False,
            )

            performance = QueryPerformance(
                query_time_ms=log.get("execution_time_ms", 0),
                cache_hit=log.get("cache_hit", False),
                data_freshness=datetime.fromisoformat(
                    log.get("created_at", utcnow().isoformat()).replace(
                        "Z", "+00:00"
                    )
                ),
            )

            return AnalyticsQueryResponse(
                data=[],  # Would reconstruct from stored result
                metadata=metadata,
                performance=performance,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve query log",
                operation="get_query_log",
                original_error=e
            )

    def export_query_results(
        self, log_id: UUID, user_id: UUID, format: str = "csv"
    ) -> bytes:
        """Export query results in specified format."""
        try:
            log = self._logs_repo.get_log_by_id(log_id, user_id)
            if not log:
                raise ValueError("Query log not found")

            # Extract query parameters from log
            query_params = log.get("query_params", {})
            if not query_params:
                raise ValueError("Query parameters not found in log")

            # Reconstruct AnalyticsQueryRequest from stored parameters
            from models.api_v2_models import AnalyticsQueryRequest, QueryType

            query_type = QueryType(query_params.get("type", "revenue"))
            filters = query_params.get("filters")
            group_by = query_params.get("group_by")
            date_range = query_params.get("date_range")
            limit = query_params.get("limit", 1000)  # Increase limit for export
            offset = query_params.get("offset", 0)

            request = AnalyticsQueryRequest(
                type=query_type,
                filters=filters,
                group_by=group_by,
                date_range=date_range,
                limit=limit,
                offset=offset,
            )

            # Re-execute query to get fresh results
            data, _ = self._execute_query(request, user_id)

            # Convert to requested format
            if format == "csv":
                from apis.v2.utils.csv_generator import generate_csv_from_data
                return generate_csv_from_data(data)
            elif format == "excel":
                from apis.v2.utils.excel_generator import generate_excel_from_data
                return generate_excel_from_data(data)
            elif format == "pdf":
                from apis.v2.utils.pdf_generator import generate_pdf_from_data
                return generate_pdf_from_data(data)
            else:
                raise ValueError(f"Unsupported export format: {format}")

        except ValueError:
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to export query results",
                operation="export_query_results",
                original_error=e
            )
