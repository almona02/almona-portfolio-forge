from __future__ import annotations

from typing import Optional, Dict
from datetime import datetime, timezone, timedelta

from supabase import Client  # type: ignore

from apis.v2.repositories.analytics_metrics_repository import (
    AnalyticsMetricsRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    AnalyticsMetricsRequest,
    AnalyticsMetricsResponse,
    ProjectVolumeMetrics,
    RevenueMetrics,
    MetricPeriod,
    CurrencyAmount,
)


def utcnow() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


class AnalyticsMetricsService:
    """Service layer for analytics metrics."""

    def __init__(self, supabase: Client):
        self._repo = AnalyticsMetricsRepository(supabase)
        self._db = supabase

    def _calculate_period_dates(
        self, period: MetricPeriod, start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> tuple[datetime, datetime]:
        """Calculate period start and end dates."""
        if start_date and end_date:
            return start_date, end_date

        end = end_date or utcnow()
        if period == MetricPeriod.daily:
            start = end - timedelta(days=1)
        elif period == MetricPeriod.weekly:
            start = end - timedelta(weeks=1)
        elif period == MetricPeriod.monthly:
            start = end - timedelta(days=30)
        elif period == MetricPeriod.quarterly:
            start = end - timedelta(days=90)
        elif period == MetricPeriod.yearly:
            start = end - timedelta(days=365)
        else:
            start = end - timedelta(days=30)

        return start, end

    def _get_cached_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> Optional[AnalyticsMetricsResponse]:
        """Get cached metrics if available."""
        try:
            cached = self._repo.get_cached_metric(
                metric_key="metrics_summary",
                period_start=period_start,
                period_end=period_end,
            )
            if cached:
                metric_data = cached.get("metric_data", {})
                # Reconstruct response from cached data
                return AnalyticsMetricsResponse(**metric_data)
        except Exception:
            # Cache miss or error, return None to calculate fresh
            pass
        return None

    def _calculate_project_volume_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> ProjectVolumeMetrics:
        """Calculate project volume metrics."""
        try:
            # Query projects table for current period
            start_iso = period_start.isoformat()
            end_iso = period_end.isoformat()

            # Count total projects in period
            total_resp = self._db.table("fabricator_projects").select(
                "id", count="exact"
            ).gte("created_at", start_iso).lte(
                "created_at", end_iso
            ).execute()

            total = total_resp.count or 0

            # Count active projects
            active_resp = self._db.table("fabricator_projects").select(
                "id", count="exact"
            ).gte("created_at", start_iso).lte(
                "created_at", end_iso
            ).eq("status", "active").execute()

            active = active_resp.count or 0

            # Count completed projects
            completed_resp = self._db.table(
                "fabricator_projects"
            ).select("id", count="exact").gte(
                "created_at", start_iso
            ).lte("created_at", end_iso).eq(
                "status", "completed"
            ).execute()

            completed = completed_resp.count or 0

            # Calculate growth rate (compare with previous period)
            period_duration = (period_end - period_start).total_seconds()
            prev_period_start = period_start - timedelta(
                seconds=period_duration
            )

            prev_total_resp = self._db.table(
                "fabricator_projects"
            ).select("id", count="exact").gte(
                "created_at", prev_period_start.isoformat()
            ).lt("created_at", start_iso).execute()

            prev_total = prev_total_resp.count or 0

            if prev_total > 0:
                growth_rate = ((total - prev_total) / prev_total) * 100.0
            else:
                growth_rate = 100.0 if total > 0 else 0.0

            return ProjectVolumeMetrics(
                total=total,
                active=active,
                completed=completed,
                growth_rate=round(growth_rate, 2),
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to calculate project volume metrics",
                operation="calculate_project_volume",
                original_error=e
            )

    def _calculate_revenue_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> RevenueMetrics:
        """Calculate revenue metrics."""
        try:
            # Query completed payments for current period
            start_iso = period_start.isoformat()
            end_iso = period_end.isoformat()

            payments_resp = self._db.table("payments").select(
                "amount, currency"
            ).eq("status", "completed").gte(
                "completed_at", start_iso
            ).lte("completed_at", end_iso).execute()

            payments = payments_resp.data or []

            # Aggregate revenue by currency (default to USD if no currency)
            revenue_by_currency: Dict[str, float] = {}
            for payment in payments:
                amount = float(payment.get("amount", 0) or 0)
                curr = payment.get("currency", "USD") or "USD"
                revenue_by_currency[curr] = (
                    revenue_by_currency.get(curr, 0.0) + amount
                )

            # Use most common currency or USD
            if revenue_by_currency:
                currency = max(
                    revenue_by_currency.keys(),
                    key=lambda k: revenue_by_currency[k]
                )
                total_revenue = revenue_by_currency[currency]
            else:
                currency = "USD"
                total_revenue = 0.0

            # Calculate average per project
            project_count_resp = self._db.table(
                "fabricator_projects"
            ).select("id", count="exact").gte(
                "created_at", start_iso
            ).lte("created_at", end_iso).execute()

            project_count = project_count_resp.count or 1
            avg_per_project = (
                total_revenue / project_count if project_count > 0 else 0.0
            )

            # Calculate growth rate (compare with previous period)
            period_duration = (period_end - period_start).total_seconds()
            prev_period_start = period_start - timedelta(
                seconds=period_duration
            )

            prev_payments_resp = self._db.table("payments").select(
                "amount, currency"
            ).eq("status", "completed").gte(
                "completed_at", prev_period_start.isoformat()
            ).lt("completed_at", start_iso).execute()

            prev_payments = prev_payments_resp.data or []
            prev_revenue = sum(
                float(p.get("amount", 0) or 0) for p in prev_payments
            )

            if prev_revenue > 0:
                growth_rate = (
                    (total_revenue - prev_revenue) / prev_revenue
                ) * 100.0
            else:
                growth_rate = 100.0 if total_revenue > 0 else 0.0

            return RevenueMetrics(
                total=CurrencyAmount(
                    value=round(total_revenue, 2),
                    currency=currency,
                ),
                average_per_project=CurrencyAmount(
                    value=round(avg_per_project, 2),
                    currency=currency,
                ),
                growth_rate=round(growth_rate, 2),
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to calculate revenue metrics",
                operation="calculate_revenue",
                original_error=e
            )

    def get_metrics(
        self,
        request: AnalyticsMetricsRequest,
    ) -> AnalyticsMetricsResponse:
        """Get analytics metrics (cached or calculated)."""
        try:
            period_start, period_end = self._calculate_period_dates(
                request.period,
                request.start_date,
                request.end_date,
            )

            # Try cache first if enabled
            if request.include_cache:
                cached = self._get_cached_metrics(period_start, period_end)
                if cached:
                    return cached

            # Calculate fresh metrics
            project_volume = self._calculate_project_volume_metrics(
                period_start, period_end
            )
            revenue = self._calculate_revenue_metrics(
                period_start, period_end
            )

            response = AnalyticsMetricsResponse(
                project_volume=project_volume,
                revenue=revenue,
                timestamp=utcnow(),
                period=request.period,
            )

            # Cache the result (service role required)
            if request.include_cache:
                try:
                    expires_at = utcnow() + timedelta(hours=1)  # 1 hour TTL
                    self._repo.set_cached_metric(
                        metric_key="metrics_summary",
                        metric_type="summary",
                        period_start=period_start,
                        period_end=period_end,
                        metric_data=response.dict(),
                        expires_at=expires_at,
                    )
                except Exception:
                    # Cache write failure is non-fatal
                    pass

            return response

        except SupabaseError:
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error getting analytics metrics",
                operation="get_metrics",
                original_error=e
            )
