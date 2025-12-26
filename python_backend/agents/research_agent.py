"""
Research Agent - The Scout

Fetches and aggregates information from various sources:
- RSS feeds
- Web scraping
- API endpoints
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
import feedparser
from datetime import datetime

logger = logging.getLogger(__name__)


class IndustryResearchAgent:
    """
    The Scout - Hunts for industry intelligence
    
    Responsibilities:
    1. Fetch latest headlines from RSS feeds
    2. Scrape relevant websites
    3. Filter for relevance
    4. Deep dive reading
    """
    
    def __init__(self):
        self.sources = [
            {
                "name": "Glass Magazine",
                "url": "https://www.glassmagazine.com/rss",
                "type": "rss",
                "keywords": ["aluminum", "upvc", "glass", "fenestration", "thermal break"]
            },
            {
                "name": "USGlass Metal & Glazing",
                "url": "https://www.usglassmag.com/feed",
                "type": "rss",
                "keywords": ["aluminum", "glazing", "windows", "doors", "facades"]
            },
            {
                "name": "Fenestration Review",
                "url": "https://fenestrationreview.com/feed",
                "type": "rss",
                "keywords": ["windows", "doors", "aluminum", "upvc", "technology"]
            },
            {
                "name": "LME Aluminum",
                "url": "https://www.lme.com/en/metals/aluminium",
                "type": "scrape",
                "keywords": ["aluminum", "price", "lme", "commodity"]
            },
            {
                "name": "ArchDaily",
                "url": "https://www.archdaily.com/feed",
                "type": "rss",
                "keywords": ["architecture", "facades", "windows", "design"]
            },
        ]
        
        self.relevance_keywords = [
            "aluminum", "upvc", "thermal break", "fenestration",
            "window", "door", "facade", "glazing",
            "price", "cost", "market", "trend",
            "egypt", "cairo", "middle east", "gulf", "dubai",
            "technology", "innovation", "new", "launch"
        ]
    
    async def daily_scan(self) -> List[Dict[str, Any]]:
        """
        Main scanning function - fetches latest articles from all sources
        
        Returns:
            List of relevant articles
        """
        logger.info("🔍 Starting research agent daily scan...")
        
        all_articles = []
        
        # Fetch from all sources in parallel
        tasks = [self._fetch_source(source) for source in self.sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error in source fetch: {result}")
                continue
            
            if isinstance(result, list):
                all_articles.extend(result)
        
        # Filter for relevance
        relevant = await self.filter_relevance(all_articles)
        
        logger.info(f"✅ Research scan complete: {len(relevant)} relevant articles found")
        
        return relevant
    
    async def _fetch_source(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch articles from a single source"""
        try:
            if source['type'] == 'rss':
                return await self.fetch_rss(source)
            elif source['type'] == 'scrape':
                return await self.fetch_scrape(source)
            else:
                return []
        except Exception as e:
            logger.error(f"Error fetching {source['name']}: {e}")
            return []
    
    async def fetch_rss(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Fetch latest headlines from RSS feed
        
        Args:
            source: Source configuration dict
            
        Returns:
            List of article dicts
        """
        try:
            feed = feedparser.parse(source['url'])
            articles = []
            
            # Get last 20 entries
            for entry in feed.entries[:20]:
                article = {
                    'title': entry.get('title', ''),
                    'url': entry.get('link', ''),
                    'published': entry.get('published', ''),
                    'summary': entry.get('summary', ''),
                    'content': '',
                    'source': source['name'],
                    'source_type': 'rss'
                }
                
                # Try to get full content
                if entry.get('content'):
                    article['content'] = entry.get('content', [{}])[0].get('value', '')
                
                articles.append(article)
            
            logger.info(f"Fetched {len(articles)} articles from {source['name']}")
            return articles
            
        except Exception as e:
            logger.error(f"Error fetching RSS from {source['name']}: {e}")
            return []
    
    async def fetch_scrape(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Scrape content from a URL
        
        Args:
            source: Source configuration dict
            
        Returns:
            List of article dicts
        """
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(source['url'])
                response.raise_for_status()
                
                # Simple text extraction (in production, use BeautifulSoup)
                content = response.text[:2000]  # First 2000 chars
                
                return [{
                    'title': f"{source['name']} Update",
                    'url': source['url'],
                    'published': datetime.now().isoformat(),
                    'summary': f"Latest update from {source['name']}",
                    'content': content,
                    'source': source['name'],
                    'source_type': 'scrape'
                }]
                
        except Exception as e:
            logger.error(f"Error scraping {source['name']}: {e}")
            return []
    
    async def filter_relevance(
        self, 
        articles: List[Dict[str, Any]], 
        keywords: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter articles for relevance to Egyptian workshops
        
        Args:
            articles: List of article dicts
            keywords: Optional custom keywords (defaults to self.relevance_keywords)
            
        Returns:
            Filtered list of relevant articles
        """
        if keywords is None:
            keywords = self.relevance_keywords
        
        relevant = []
        
        for article in articles:
            # Combine all text fields
            text = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()
            
            # Count keyword matches
            matches = sum(1 for keyword in keywords if keyword in text)
            
            # Must have at least 2 keyword matches
            if matches >= 2:
                article['relevance_score'] = matches
                relevant.append(article)
        
        # Sort by relevance score
        relevant.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        
        return relevant
    
    async def read_url(self, url: str) -> Optional[str]:
        """
        Deep dive reading - fetch full content from URL
        
        Args:
            url: Article URL
            
        Returns:
            Full article content or None
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                # In production, use BeautifulSoup to extract main content
                # For now, return first 5000 chars
                return response.text[:5000]
                
        except Exception as e:
            logger.error(f"Error reading URL {url}: {e}")
            return None

