"""
Industry Watchdog Service - The "Industry Watchtower"

A background agent that runs independently, scanning for:
- New technologies, price shifts, global trends, market intelligence,
  and social media insights (Facebook groups).

Then translates them into actionable advice for Egyptian workshops.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RelevanceLevel(Enum):
    """Relevance level for industry intelligence"""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    IRRELEVANT = "irrelevant"


@dataclass
class IndustryArticle:
    """Represents a piece of industry intelligence"""

    title: str
    url: str
    source: str
    published_at: datetime
    content: str
    relevance: RelevanceLevel
    maalem_summary: str
    actionable_advice: str
    keywords: List[str]
    categories: List[str]
    raw_data: Dict[str, Any]


@dataclass
class MarketAlert:
    """Proactive alert for workshop owners"""

    # "price_change", "new_technology", "trend_shift", "social_insight"
    alert_type: str
    severity: str  # "critical", "high", "medium", "low"
    title: str
    message_arabic: str
    message_english: str
    actionable: str
    created_at: datetime
    expires_at: Optional[datetime]


class IndustryWatchdog:
    """
    The Industry Watchtower - Never sleeps, constantly scanning

    Workflow: Scout → Filter → Egyptianize → Store → Alert
    """

    def __init__(self, enable_social_listener: bool = True):
        self.sources = [
            {
                "name": "Glass Magazine",
                "url": "https://www.glassmagazine.com/rss",
                "type": "rss",
                "keywords": [
                    "aluminum",
                    "upvc",
                    "glass",
                    "fenestration",
                    "thermal break",
                ],
            },
            {
                "name": "USGlass Metal & Glazing",
                "url": "https://www.usglassmag.com/feed",
                "type": "rss",
                "keywords": ["aluminum", "glazing", "windows", "doors", "facades"],
            },
            {
                "name": "Fenestration Review",
                "url": "https://fenestrationreview.com/feed",
                "type": "rss",
                "keywords": ["windows", "doors", "aluminum", "upvc", "technology"],
            },
            {
                "name": "LME Aluminum Prices",
                "url": "https://www.lme.com/en/metals/aluminium",
                "type": "scrape",
                "keywords": ["aluminum", "price", "lme", "commodity"],
            },
            {
                "name": "ArchDaily",
                "url": "https://www.archdaily.com/feed",
                "type": "rss",
                "keywords": [
                    "architecture",
                    "facades",
                    "windows",
                    "design",
                    "technology",
                ],
            },
        ]

        self.egyptian_keywords = [
            "cairo",
            "egypt",
            "middle east",
            "gulf",
            "dubai",
            "uae",
            "aluminum",
            "upvc",
            "thermal break",
            "fenestration",
            "price",
            "cost",
            "market",
            "trend",
            "technology",
            "innovation",
        ]

        self.stored_articles: List[IndustryArticle] = []
        self.active_alerts: List[MarketAlert] = []

        # Social Listener (Facebook Groups)
        self.enable_social_listener = enable_social_listener
        self.social_listener = None
        self.social_analyst = None

        if enable_social_listener:
            try:
                from agents.social_listener import FacebookGroupListener
                from agents.maalem_social_analyst import MaalemSocialAnalyst
                from core.config import settings

                # Initialize social listener (with or without API token)
                facebook_token = getattr(settings, "FACEBOOK_ACCESS_TOKEN", None)
                self.social_listener = FacebookGroupListener(
                    facebook_access_token=facebook_token
                )
                self.social_analyst = MaalemSocialAnalyst()
                logger.info("✅ Social Listener initialized")
            except ImportError as e:
                logger.warning(f"Social listener not available: {e}")
                self.enable_social_listener = False
            except Exception as e:
                logger.warning(f"Failed to initialize social listener: {e}")
                self.enable_social_listener = False

    async def daily_scan(self) -> List[IndustryArticle]:
        """
        Main scanning function - runs daily

        Returns:
            List of relevant articles found
        """
        logger.info("🔍 Starting daily industry scan...")

        new_articles = []

        # Scan RSS feeds and web sources
        for source in self.sources:
            try:
                logger.info(f"Scanning {source['name']}...")

                if source["type"] == "rss":
                    articles = await self._fetch_rss(source)
                elif source["type"] == "scrape":
                    articles = await self._scrape_url(source)
                else:
                    continue

                # Filter for relevance
                relevant = await self._filter_relevance(articles, source)

                # Process each relevant article
                for article_data in relevant:
                    article = await self._process_article(article_data, source)
                    if article:
                        new_articles.append(article)
                        self.stored_articles.append(article)

                logger.info(
                    f"Found {len(relevant)} relevant articles from {source['name']}"
                )

            except Exception as e:
                logger.error(f"Error scanning {source['name']}: {e}", exc_info=True)
                continue

        # Scan social media (Facebook groups) if enabled
        social_articles = []
        if self.enable_social_listener and self.social_listener:
            try:
                logger.info("📱 Scanning social media groups...")
                social_insights = await self.social_listener.monitor_groups(
                    hours_back=24
                )

                # Analyze social insights
                if social_insights and self.social_analyst:
                    analyses = await self.social_analyst.analyze_batch(
                        social_insights, use_llm=False
                    )

                    # Convert social analyses to IndustryArticle format
                    for insight, analysis in zip(social_insights, analyses):
                        if (
                            analysis.credibility_score >= 0.5
                        ):  # Only high-credibility insights
                            article = IndustryArticle(
                                title=f"[من الشارع] {insight.text[:80]}...",
                                url=insight.url or "",
                                source=f"Facebook: {insight.group}",
                                published_at=insight.timestamp,
                                content=insight.text,
                                relevance=(
                                    RelevanceLevel.HIGH
                                    if analysis.urgency == "high"
                                    else RelevanceLevel.MEDIUM
                                ),
                                maalem_summary=analysis.core_truth,
                                actionable_advice=analysis.maalem_advice,
                                keywords=self._extract_keywords_from_text(insight.text),
                                categories=[
                                    analysis.category,
                                    "social_media",
                                    "street_intelligence",
                                ],
                                raw_data={
                                    "type": "social_insight",
                                    "group": insight.group,
                                    "engagement": insight.engagement,
                                    "credibility": analysis.credibility_score,
                                    "urgency": analysis.urgency,
                                },
                            )
                            social_articles.append(article)
                            self.stored_articles.append(article)

                    logger.info(
                        f"📱 Found {len(social_articles)} high-credibility social insights"
                    )
            except Exception as e:
                logger.error(f"Error scanning social media: {e}", exc_info=True)

        # Combine all articles
        all_articles = new_articles + social_articles

        # Generate alerts from all articles
        alerts = await self._generate_alerts(all_articles)
        self.active_alerts.extend(alerts)

        logger.info(
            f"✅ Daily scan complete: {len(new_articles)} RSS articles, {len(social_articles)} social insights, {len(alerts)} alerts"
        )

        return all_articles

    async def _fetch_rss(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch articles from RSS feed"""
        try:
            import feedparser

            feed = feedparser.parse(source["url"])
            articles = []

            for entry in feed.entries[:20]:  # Last 20 articles
                articles.append(
                    {
                        "title": entry.get("title", ""),
                        "url": entry.get("link", ""),
                        "published": entry.get("published", ""),
                        "summary": entry.get("summary", ""),
                        "content": (
                            entry.get("content", [{}])[0].get("value", "")
                            if entry.get("content")
                            else ""
                        ),
                    }
                )

            return articles

        except Exception as e:
            logger.error(f"Error fetching RSS from {source['name']}: {e}")
            return []

    async def _scrape_url(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scrape content from a URL (for LME prices, etc.)"""
        try:
            import httpx

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(source["url"])
                response.raise_for_status()

                # For LME, we'd parse the price data
                # This is a simplified version
                return [
                    {
                        "title": "LME Aluminum Price Update",
                        "url": source["url"],
                        "published": datetime.now(timezone.utc).isoformat(),
                        "summary": "Latest aluminum prices from LME",
                        "content": response.text[:1000],  # First 1000 chars
                    }
                ]

        except Exception as e:
            # LME and some sites block scraping - this is expected
            # Log at debug level, not error
            logger.debug("Could not scrape %s: %s", source["name"], e)
            return []

    async def _filter_relevance(
        self, articles: List[Dict[str, Any]], source: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Filter articles for relevance to Egyptian workshops

        Uses keyword matching and simple relevance scoring
        """
        relevant = []

        for article in articles:
            # Combine title, summary, and content
            text = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()

            # Check for Egyptian/Middle East keywords
            egyptian_match = any(keyword in text for keyword in self.egyptian_keywords)

            # Check for source keywords
            source_match = any(
                keyword in text for keyword in source.get("keywords", [])
            )

            # Must match at least one
            if egyptian_match or source_match:
                relevant.append(article)

        return relevant

    def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract keywords from text for social insights"""
        keywords = []
        text_lower = text.lower()

        # Check for Egyptian keywords
        for keyword in self.egyptian_keywords:
            if keyword in text_lower:
                keywords.append(keyword)

        # Add common fabrication terms
        fabrication_terms = ["ألومنيوم", "UPVC", "خشب", "حديد", "زجاج", "شباك", "باب"]
        for term in fabrication_terms:
            if term in text:
                keywords.append(term)

        return keywords[:10]  # Limit to 10 keywords

    async def _process_article(
        self, article_data: Dict[str, Any], source: Dict[str, Any]
    ) -> Optional[IndustryArticle]:
        """
        Process article through Maalem Analyst to get Egyptian workshop perspective
        """
        try:
            from agents.maalem_analyst import MaalemAnalyst

            analyst = MaalemAnalyst()
            analysis = await analyst.analyze_impact(
                article_data.get("content", "") or article_data.get("summary", "")
            )

            if analysis["relevance"] == RelevanceLevel.IRRELEVANT:
                return None

            # Parse published date
            published_at = datetime.now(timezone.utc)
            if article_data.get("published"):
                try:
                    from dateutil import parser

                    parsed_date = parser.parse(article_data["published"])
                    # Ensure timezone-aware
                    if parsed_date.tzinfo is None:
                        published_at = parsed_date.replace(tzinfo=timezone.utc)
                    else:
                        published_at = parsed_date.astimezone(timezone.utc)
                except (ImportError, Exception):
                    pass

            return IndustryArticle(
                title=article_data.get("title", "Untitled"),
                url=article_data.get("url", ""),
                source=source["name"],
                published_at=published_at,
                content=article_data.get("content", "")
                or article_data.get("summary", ""),
                relevance=analysis["relevance"],
                maalem_summary=analysis["maalem_summary"],
                actionable_advice=analysis["actionable_advice"],
                keywords=analysis.get("keywords", []),
                categories=analysis.get("categories", []),
                raw_data=article_data,
            )

        except Exception as e:
            logger.error(f"Error processing article: {e}", exc_info=True)
            return None

    async def _generate_alerts(
        self, articles: List[IndustryArticle]
    ) -> List[MarketAlert]:
        """
        Generate proactive alerts from articles

        Creates alerts for:
        - Price changes
        - New technologies
        - Material shortages
        - Regulation changes
        """
        alerts = []
        now = datetime.now(timezone.utc)

        for article in articles:
            # Price alerts
            if any(
                kw in article.title.lower() or kw in article.content.lower()
                for kw in [
                    "price",
                    "سعر",
                    "cost",
                    "increase",
                    "decrease",
                    "زيادة",
                    "انخفاض",
                ]
            ):
                alert = MarketAlert(
                    alert_type="price_change",
                    severity=(
                        "high" if article.relevance == RelevanceLevel.HIGH else "medium"
                    ),
                    title=f"Price Update: {article.title[:60]}",
                    message_arabic=article.maalem_summary,
                    message_english=article.actionable_advice,
                    actionable=article.actionable_advice,
                    created_at=now,
                    expires_at=now + timedelta(days=3),
                )
                alerts.append(alert)

            # Social insights (from Facebook groups)
            if "social_media" in article.categories:
                alert = MarketAlert(
                    alert_type="social_insight",
                    severity=(
                        "high" if article.relevance == RelevanceLevel.HIGH else "medium"
                    ),
                    title=f"من الشارع: {article.title[:60]}",
                    message_arabic=article.maalem_summary,
                    message_english=article.actionable_advice,
                    actionable=article.actionable_advice,
                    created_at=now,
                    expires_at=now + timedelta(days=1),
                )
                alerts.append(alert)

            # Technology alerts
            if any(
                kw in article.title.lower() or kw in article.content.lower()
                for kw in [
                    "new",
                    "technology",
                    "innovation",
                    "launch",
                    "جديد",
                    "تكنولوجيا",
                ]
            ):
                if article.relevance == RelevanceLevel.HIGH:
                    alert = MarketAlert(
                        alert_type="new_technology",
                        severity="medium",
                        title=f"New Technology: {article.title[:60]}",
                        message_arabic=article.maalem_summary,
                        message_english=article.actionable_advice,
                        actionable=article.actionable_advice,
                        created_at=now,
                        expires_at=now + timedelta(days=7),
                    )
                    alerts.append(alert)

        return alerts

    def get_latest_trends(
        self, topic: Optional[str] = None, days: int = 30
    ) -> List[IndustryArticle]:
        """
        Get latest trends filtered by topic and timeframe

        Args:
            topic: Optional topic to filter by
            days: Number of days to look back

        Returns:
            List of relevant articles
        """
        # Calculate date range
        date_range_start = datetime.now(timezone.utc) - timedelta(days=days)

        filtered = [
            article
            for article in self.stored_articles
            if article.published_at >= date_range_start
        ]

        if topic:
            topic_lower = topic.lower()
            filtered = [
                article
                for article in filtered
                if topic_lower in article.title.lower()
                or topic_lower in article.content.lower()
                or any(topic_lower in kw.lower() for kw in article.keywords)
            ]

        # Sort by relevance and date
        filtered.sort(
            key=lambda x: (
                (
                    3
                    if x.relevance == RelevanceLevel.HIGH
                    else 2 if x.relevance == RelevanceLevel.MEDIUM else 1
                ),
                x.published_at,
            ),
            reverse=True,
        )

        return filtered

    def get_active_alerts(self) -> List[MarketAlert]:
        """
        Get currently active alerts (not expired)

        Returns:
            List of active MarketAlert objects
        """
        now = datetime.now(timezone.utc)

        active = [
            alert
            for alert in self.active_alerts
            if alert.expires_at is None or alert.expires_at > now
        ]

        # Sort by severity
        # Priority mapping
        # Priority mapping
        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        active.sort(key=lambda x: severity_order.get(x.severity, 0), reverse=True)

        return active

    def get_morning_brief(self) -> Dict[str, Any]:
        """
        Generate morning brief for workshop owner

        Returns:
            Dictionary with summary, alerts, price updates, tech news
        """
        now = datetime.now(timezone.utc)

        # Get latest articles
        latest_articles = self.get_latest_trends(days=1)

        # Get active alerts
        alerts = self.get_active_alerts()

        # Categorize articles
        price_updates = [
            article
            for article in latest_articles
            if any(
                kw in article.title.lower() or kw in article.content.lower()
                for kw in ["price", "سعر", "cost", "زيادة", "انخفاض"]
            )
        ]

        # No specialized tech news logic implemented yet
        # tech_news_articles = []

        # Social insights
        social_insights = [
            article
            for article in latest_articles
            if "social_media" in article.categories
        ]

        # Generate summary
        summary = f"صباح الخير يا ريس! {len(latest_articles)} خبر جديد اليوم"
        if social_insights:
            summary += f" ({len(social_insights)} من الشارع)"

        # Consolidate articles for frontend compatibility (FutureIntelligence interface)
        all_news = []
        for article in latest_articles[:15]:
            all_news.append(
                {
                    "id": f"art_{article.published_at.timestamp()}",
                    "title": article.title,
                    "url": article.url,
                    "source": article.source,
                    "publishedAt": article.published_at.isoformat(),
                    "content": article.content,
                    "relevance": article.relevance.value,
                    "maalemSummary": article.maalem_summary,
                    "actionableAdvice": article.actionable_advice,
                    "keywords": article.keywords,
                    "categories": article.categories,
                }
            )

        return {
            "date": now.isoformat(),
            "lastUpdated": now.isoformat(),
            "summary": summary,
            "articles": all_news,
            "alerts": [
                {
                    "id": f"alert_{alert.created_at.timestamp()}",
                    "alertType": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "messageArabic": alert.message_arabic,
                    "messageEnglish": alert.message_english,
                    "actionable": alert.actionable,
                    "createdAt": alert.created_at.isoformat(),
                    "expiresAt": (
                        alert.expires_at.isoformat() if alert.expires_at else None
                    ),
                }
                for alert in alerts
            ],
            "trends": [],  # To be implemented if trend analysis is needed
            "priceUpdates": [
                {
                    "title": article.title,
                    "publishedAt": article.published_at.isoformat(),
                    "maalemSummary": article.maalem_summary,
                }
                for article in price_updates[:5]
            ],
            "totalArticles": len(latest_articles),
            "criticalAlerts": len([a for a in alerts if a.severity == "critical"]),
        }
