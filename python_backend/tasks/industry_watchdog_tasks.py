"""
Celery Tasks for Industry Watchdog

Scheduled tasks that run daily to scan industry sources
"""

import logging
from celery import Task
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Import Celery app
try:
    from celery_app import celery_app
except ImportError:
    from core.celery_app import celery_app

# Import watchdog service
from services.industry_watchdog import IndustryWatchdog


@celery_app.task(bind=True, name='tasks.industry_watchdog.daily_scan')
def daily_industry_scan(self: Task) -> Dict[str, Any]:
    """
    Daily scheduled task to scan industry sources
    
    Runs every morning at 6 AM Cairo time
    """
    try:
        logger.info("🔍 Starting scheduled daily industry scan...")
        
        watchdog = IndustryWatchdog()
        
        # Run scan (this is async, but Celery task is sync)
        # We'll need to handle this properly
        import asyncio
        
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run async scan
        new_articles = loop.run_until_complete(watchdog.daily_scan())
        
        # Get morning brief
        brief = watchdog.get_morning_brief()
        
        result = {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "articles_found": len(new_articles),
            "alerts_generated": len(brief.get("alerts", [])),
            "brief": brief
        }
        
        logger.info(f"✅ Daily scan complete: {len(new_articles)} articles, {len(brief.get('alerts', []))} alerts")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in daily industry scan: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@celery_app.task(bind=True, name='tasks.industry_watchdog.get_morning_brief')
def get_morning_brief_task(self: Task) -> Dict[str, Any]:
    """
    Get morning brief for a workshop
    
    Can be called on-demand or scheduled
    """
    try:
        watchdog = IndustryWatchdog()
        brief = watchdog.get_morning_brief()
        
        return {
            "status": "success",
            "brief": brief,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting morning brief: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@celery_app.task(bind=True, name='tasks.industry_watchdog.get_latest_trends')
def get_latest_trends_task(self: Task, topic: str = None, days: int = 30) -> Dict[str, Any]:
    """
    Get latest trends for a topic
    
    Args:
        topic: Optional topic to filter by
        days: Number of days to look back
    """
    try:
        watchdog = IndustryWatchdog()
        trends = watchdog.get_latest_trends(topic=topic, days=days)
        
        return {
            "status": "success",
            "trends": [
                {
                    "title": t.title,
                    "url": t.url,
                    "source": t.source,
                    "maalem_summary": t.maalem_summary,
                    "actionable_advice": t.actionable_advice,
                    "published_at": t.published_at.isoformat(),
                    "relevance": t.relevance.value
                }
                for t in trends
            ],
            "count": len(trends),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting latest trends: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

