from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, case
from ..models.api_v2_models import (
    AnalyticsEvent, BusinessMetric, PerformanceMetric,
    UserAnalytics, RevenueAnalytics, OrderAnalytics
)
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    async def get_business_kpis(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get key business performance indicators"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()

            # Revenue metrics
            revenue_query = self.db.query(
                func.sum(RevenueAnalytics.amount).label('total_revenue'),
                func.avg(RevenueAnalytics.amount).label('avg_revenue'),
                func.count(RevenueAnalytics.id).label('revenue_transactions')
            ).filter(
                and_(
                    RevenueAnalytics.created_at >= start_date,
                    RevenueAnalytics.created_at <= end_date
                )
            )

            revenue_result = revenue_query.first()

            # Order metrics
            order_query = self.db.query(
                func.count(OrderAnalytics.id).label('total_orders'),
                func.sum(OrderAnalytics.quantity).label('total_quantity'),
                func.avg(OrderAnalytics.total_amount).label('avg_order_value')
            ).filter(
                and_(
                    OrderAnalytics.created_at >= start_date,
                    OrderAnalytics.created_at <= end_date
                )
            )

            order_result = order_query.first()

            # Customer metrics
            customer_query = self.db.query(
                func.count(func.distinct(UserAnalytics.user_id)).label('unique_customers'),
                func.count(UserAnalytics.id).label('total_sessions')
            ).filter(
                and_(
                    UserAnalytics.created_at >= start_date,
                    UserAnalytics.created_at <= end_date
                )
            )

            customer_result = customer_query.first()

            # Performance metrics
            performance_query = self.db.query(
                func.avg(PerformanceMetric.response_time).label('avg_response_time'),
                func.min(PerformanceMetric.response_time).label('min_response_time'),
                func.max(PerformanceMetric.response_time).label('max_response_time'),
                func.count(PerformanceMetric.id).label('total_requests')
            ).filter(
                and_(
                    PerformanceMetric.created_at >= start_date,
                    PerformanceMetric.created_at <= end_date
                )
            )

            performance_result = performance_query.first()

            return {
                "revenue": {
                    "total": float(revenue_result.total_revenue or 0),
                    "average": float(revenue_result.avg_revenue or 0),
                    "transactions": revenue_result.revenue_transactions or 0
                },
                "orders": {
                    "total": order_result.total_orders or 0,
                    "quantity": order_result.total_quantity or 0,
                    "average_value": float(order_result.avg_order_value or 0)
                },
                "customers": {
                    "unique": customer_result.unique_customers or 0,
                    "sessions": customer_result.total_sessions or 0
                },
                "performance": {
                    "avg_response_time": float(performance_result.avg_response_time or 0),
                    "min_response_time": float(performance_result.min_response_time or 0),
                    "max_response_time": float(performance_result.max_response_time or 0),
                    "total_requests": performance_result.total_requests or 0
                },
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error getting business KPIs: {str(e)}")
            raise

    async def get_revenue_analytics(
        self,
        period: str = "monthly",
        limit: int = 12
    ) -> List[Dict[str, Any]]:
        """Get revenue analytics over time"""
        try:
            if period == "monthly":
                date_format = "%Y-%m"
                group_by = func.date_trunc('month', RevenueAnalytics.created_at)
            elif period == "weekly":
                date_format = "%Y-%U"
                group_by = func.date_trunc('week', RevenueAnalytics.created_at)
            else:  # daily
                date_format = "%Y-%m-%d"
                group_by = func.date_trunc('day', RevenueAnalytics.created_at)

            results = self.db.query(
                func.to_char(group_by, date_format).label('period'),
                func.sum(RevenueAnalytics.amount).label('total_revenue'),
                func.count(RevenueAnalytics.id).label('transaction_count'),
                func.avg(RevenueAnalytics.amount).label('avg_transaction')
            ).group_by(group_by).order_by(desc(group_by)).limit(limit).all()

            return [{
                "period": result.period,
                "total_revenue": float(result.total_revenue or 0),
                "transaction_count": result.transaction_count or 0,
                "avg_transaction": float(result.avg_transaction or 0)
            } for result in results]

        except Exception as e:
            logger.error(f"Error getting revenue analytics: {str(e)}")
            raise

    async def get_user_engagement_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user engagement metrics"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()

            # Session analytics
            session_query = self.db.query(
                func.count(UserAnalytics.id).label('total_sessions'),
                func.count(func.distinct(UserAnalytics.user_id)).label('unique_users'),
                func.avg(UserAnalytics.session_duration).label('avg_session_duration'),
                func.sum(UserAnalytics.page_views).label('total_page_views')
            ).filter(
                and_(
                    UserAnalytics.created_at >= start_date,
                    UserAnalytics.created_at <= end_date
                )
            )

            session_result = session_query.first()

            # Event analytics
            event_query = self.db.query(
                AnalyticsEvent.event_type,
                func.count(AnalyticsEvent.id).label('count')
            ).filter(
                and_(
                    AnalyticsEvent.created_at >= start_date,
                    AnalyticsEvent.created_at <= end_date
                )
            ).group_by(AnalyticsEvent.event_type).all()

            events = {event.event_type: event.count for event in event_query}

            return {
                "sessions": {
                    "total": session_result.total_sessions or 0,
                    "unique_users": session_result.unique_users or 0,
                    "avg_duration": float(session_result.avg_session_duration or 0),
                    "total_page_views": session_result.total_page_views or 0
                },
                "events": events,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error getting user engagement metrics: {str(e)}")
            raise

    async def get_performance_metrics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=7)
            if not end_date:
                end_date = datetime.now()

            metrics_query = self.db.query(
                func.avg(PerformanceMetric.response_time).label('avg_response_time'),
                func.min(PerformanceMetric.response_time).label('min_response_time'),
                func.max(PerformanceMetric.response_time).label('max_response_time'),
                func.count(PerformanceMetric.id).label('total_requests'),
                func.sum(
                    case((PerformanceMetric.status_code >= 400, 1), else_=0)
                ).label('error_count'),
                func.avg(PerformanceMetric.memory_usage).label('avg_memory_usage'),
                func.avg(PerformanceMetric.cpu_usage).label('avg_cpu_usage')
            ).filter(
                and_(
                    PerformanceMetric.created_at >= start_date,
                    PerformanceMetric.created_at <= end_date
                )
            )

            result = metrics_query.first()

            return {
                "response_time": {
                    "average": float(result.avg_response_time or 0),
                    "min": float(result.min_response_time or 0),
                    "max": float(result.max_response_time or 0)
                },
                "requests": {
                    "total": result.total_requests or 0,
                    "errors": result.error_count or 0,
                    "success_rate": (
                        (result.total_requests - result.error_count) /
                        result.total_requests * 100
                    ) if result.total_requests else 0
                },
                "system": {
                    "avg_memory_usage": float(result.avg_memory_usage or 0),
                    "avg_cpu_usage": float(result.avg_cpu_usage or 0)
                },
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            raise

    async def track_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        event_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track an analytics event"""
        try:
            event = AnalyticsEvent(
                event_type=event_type,
                user_id=user_id,
                event_data=event_data or {},
                created_at=datetime.now()
            )
            self.db.add(event)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error tracking event: {str(e)}")
            self.db.rollback()
            return False

    async def update_business_metrics(self, metrics_data: Dict[str, Any]) -> bool:
        """Update business metrics"""
        try:
            metrics = BusinessMetric(**metrics_data, created_at=datetime.now())
            self.db.add(metrics)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error updating business metrics: {str(e)}")
            self.db.rollback()
            return False
