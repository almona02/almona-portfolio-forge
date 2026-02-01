from __future__ import annotations

from typing import Any, Dict, Optional
from datetime import datetime, timezone
from supabase import Client  # type: ignore


class AnalyticsMetricsRepository:
    """Persistence layer for analytics metrics cache."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Cache Operations (service role only)
    def get_cached_metric(
        self,
        metric_key: str,
        period_start: datetime,
        period_end: datetime,
    ) -> Optional[Dict[str, Any]]:
        """Get cached metric if not expired."""
        # RLS policy requires service role for cache access
        query = (
            self._db.table("analytics_metrics_cache")
            .select("*")
            .eq("metric_key", metric_key)
            .eq("period_start", period_start.isoformat())
            .eq("period_end", period_end.isoformat())
            .gt(
                "expires_at",
                datetime.now(timezone.utc).isoformat()
            )
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def set_cached_metric(
        self,
        metric_key: str,
        metric_type: str,
        period_start: datetime,
        period_end: datetime,
        metric_data: Dict[str, Any],
        expires_at: datetime,
    ) -> Dict[str, Any]:
        """Set cached metric (upsert)."""
        # RLS policy requires service role
        cache_data: Dict[str, Any] = {
            "metric_key": metric_key,
            "metric_type": metric_type,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "metric_data": metric_data,
            "expires_at": expires_at.isoformat(),
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert using unique constraint
        resp = (
            self._db.table("analytics_metrics_cache")
            .upsert(cache_data, on_conflict="metric_key,period_start,period_end")
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to cache analytics metric")
        return rows[0]

    def clear_expired_metrics(self) -> int:
        """Clear expired metrics (returns count deleted)."""
        # RLS policy requires service role
        now = datetime.now(timezone.utc).isoformat()
        (
            self._db.table("analytics_metrics_cache")
            .delete()
            .lt("expires_at", now)
            .execute()
        )
        # Note: Supabase delete doesn't return count directly
        return 0  # Would need count query separately
