"""
Future Intelligence API Endpoints

Provides access to Industry Watchdog intelligence:
- Latest trends
- Market alerts
- Morning brief
- Article search
"""

from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from services.industry_watchdog import IndustryWatchdog

router = APIRouter(prefix="/ydt/future-intelligence", tags=["Future Intelligence"])


class TrendResponse(BaseModel):
    trends: List[dict]
    count: int
    timestamp: str


class AlertResponse(BaseModel):
    alerts: List[dict]
    count: int
    timestamp: str


class MorningBriefResponse(BaseModel):
    date: str
    lastUpdated: str
    summary: str
    articles: List[dict]
    alerts: List[dict]
    trends: List[dict]
    priceUpdates: List[dict]
    totalArticles: int
    criticalAlerts: int


class ArticleSearchResponse(BaseModel):
    articles: List[dict]
    count: int
    keyword: str


# Initialize watchdog (singleton pattern)
_watchdog: Optional[IndustryWatchdog] = None


def get_watchdog() -> IndustryWatchdog:
    """Get or create IndustryWatchdog instance"""
    global _watchdog
    if _watchdog is None:
        _watchdog = IndustryWatchdog()
    return _watchdog


@router.get("/trends", response_model=TrendResponse)
async def get_latest_trends(
    topic: Optional[str] = Query(None, description="Filter by topic"),
    timeframe: Optional[str] = Query(
        "last_30_days", description="Timeframe: 7, 30, or 90 days"
    ),
    relevance_threshold: Optional[float] = Query(
        0.5, description="Minimum relevance (0-1)"
    ),
    categories: Optional[str] = Query(None, description="Comma-separated categories"),
    limit: Optional[int] = Query(20, description="Max results"),
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID"),
):
    """
    Get latest industry trends

    Returns articles and insights relevant to Egyptian workshops
    """
    try:
        watchdog = get_watchdog()

        # Parse timeframe
        days_map = {"last_7_days": 7, "last_30_days": 30, "last_90_days": 90}
        days = days_map.get(timeframe, 30)

        # Get trends
        articles = watchdog.get_latest_trends(topic=topic, days=days)

        # Filter by relevance threshold
        relevance_map = {"high": 1.0, "medium": 0.6, "low": 0.3}
        filtered = [
            article
            for article in articles
            if (relevance_map.get(article.relevance.value, 0) >= relevance_threshold)
        ]

        # Filter by categories if provided
        if categories:
            category_list = [c.strip().lower() for c in categories.split(",")]
            filtered = [
                article
                for article in filtered
                if any(
                    cat in [c.lower() for c in article.categories]
                    for cat in category_list
                )
            ]

        # Limit results
        filtered = filtered[:limit]

        # Convert to dict
        trends = [
            {
                "title": article.title,
                "url": article.url,
                "source": article.source,
                "published_at": article.published_at.isoformat(),
                "maalem_summary": article.maalem_summary,
                "actionable_advice": article.actionable_advice,
                "relevance": article.relevance.value,
                "keywords": article.keywords,
                "categories": article.categories,
            }
            for article in filtered
        ]

        return TrendResponse(
            trends=trends, count=len(trends), timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trends: {str(e)}")


@router.get("/alerts", response_model=AlertResponse)
async def get_active_alerts(
    severity: Optional[str] = Query(
        None, description="Filter by severity: critical, high, medium, low"
    ),
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID"),
):
    """
    Get active market alerts

    Returns proactive alerts for workshop owners
    """
    try:
        watchdog = get_watchdog()
        alerts = watchdog.get_active_alerts()

        # Filter by severity if provided
        if severity:
            alerts = [a for a in alerts if a.severity == severity]

        # Convert to dict
        alert_dicts = [
            {
                "id": f"alert_{i}",
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "title": alert.title,
                "message_arabic": alert.message_arabic,
                "message_english": alert.message_english,
                "actionable": alert.actionable,
                "created_at": alert.created_at.isoformat(),
                "expires_at": (
                    alert.expires_at.isoformat() if alert.expires_at else None
                ),
            }
            for i, alert in enumerate(alerts)
        ]

        return AlertResponse(
            alerts=alert_dicts,
            count=len(alert_dicts),
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts: {str(e)}")


@router.get("/morning-brief", response_model=MorningBriefResponse)
async def get_morning_brief(
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID")
):
    """
    Get morning brief for workshop owner

    Returns daily summary of:
    - Latest news
    - Price updates
    - Technology news
    - Critical alerts
    """
    try:
        watchdog = get_watchdog()
        brief = watchdog.get_morning_brief()

        return MorningBriefResponse(**brief)

    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching morning brief: {e}", exc_info=True)

        # Fallback response to avoid 500 and blocking the UI
        now = datetime.now().isoformat()
        return MorningBriefResponse(
            date=now,
            lastUpdated=now,
            summary=(
                "عذراً يا ريس، فيه مشكلة بسيطة في جلب الأخبار. " "جرب تاني كمان شوية."
            ),
            articles=[],
            alerts=[],
            trends=[],
            priceUpdates=[],
            totalArticles=0,
            criticalAlerts=0,
        )


@router.get("/search", response_model=ArticleSearchResponse)
async def search_articles(
    keyword: str = Query(..., description="Search keyword"),
    limit: int = Query(10, description="Maximum number of results"),
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID"),
):
    """
    Search articles by keyword

    Returns relevant articles matching the keyword
    """
    try:
        watchdog = get_watchdog()

        # Get all articles and filter by keyword
        all_articles = watchdog.get_latest_trends(days=90)

        keyword_lower = keyword.lower()
        matching = [
            article
            for article in all_articles
            if keyword_lower in article.title.lower()
            or keyword_lower in article.content.lower()
            or any(keyword_lower in kw.lower() for kw in article.keywords)
        ]

        # Limit results
        matching = matching[:limit]

        # Convert to dict
        articles = [
            {
                "id": f"article_{i}",
                "title": article.title,
                "url": article.url,
                "source": article.source,
                "published_at": article.published_at.isoformat(),
                "maalem_summary": article.maalem_summary,
                "actionable_advice": article.actionable_advice,
                "relevance": article.relevance.value,
                "keywords": article.keywords,
                "categories": article.categories,
            }
            for i, article in enumerate(matching)
        ]

        return ArticleSearchResponse(
            articles=articles, count=len(articles), keyword=keyword
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching articles: {str(e)}"
        )


@router.post("/trigger-scan")
async def trigger_manual_scan(
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID")
):
    """
    Manually trigger industry scan

    Useful for testing or on-demand scanning
    """
    try:
        from tasks.industry_watchdog_tasks import daily_industry_scan

        # Trigger async scan
        task = daily_industry_scan.delay()

        return {
            "status": "triggered",
            "task_id": task.id,
            "message": "Industry scan started in background",
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering scan: {str(e)}")


class FeedbackRequest(BaseModel):
    item_id: str
    feedback: str  # "useful" or "not_useful"
    workshop_id: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID"),
):
    """
    Submit feedback on intelligence items
    """
    try:
        # Just log for now
        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"Feedback received: {request.feedback} for {request.item_id} (Workshop: {workshop_id or request.workshop_id})"
        )

        return {"status": "success", "message": "Feedback received"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error submitting feedback: {str(e)}"
        )
