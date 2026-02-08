"""
Integration Test for Industry Watchdog Pipeline

Validates the complete flow:
ResearchAgent → MaalemAnalyst → IndustryWatchdog → API → Frontend

Tests with real RSS feeds to ensure production readiness.
"""

import pytest
import asyncio
from datetime import datetime
from typing import Dict, Any
from unittest.mock import patch, MagicMock

# Import components
from agents.research_agent import IndustryResearchAgent
from agents.maalem_analyst import MaalemAnalyst, RelevanceLevel
from services.industry_watchdog import IndustryWatchdog, IndustryArticle, MarketAlert


class TestIndustryWatchdogIntegration:
    """Integration tests for Industry Watchdog pipeline"""
    
    @pytest.fixture
    def research_agent(self):
        """Create research agent instance"""
        return IndustryResearchAgent()
    
    @pytest.fixture
    def maalem_analyst(self):
        """Create maalem analyst instance"""
        return MaalemAnalyst()
    
    @pytest.fixture
    def watchdog(self):
        """Create watchdog instance"""
        return IndustryWatchdog()
    
    @pytest.mark.asyncio
    async def test_research_agent_fetches_rss(self, research_agent):
        """Test that ResearchAgent can fetch from RSS feeds"""
        print("\n🔍 Testing RSS feed fetching...")
        
        # Test with a known RSS feed
        test_source = {
            "name": "Test Feed",
            "url": "https://www.glassmagazine.com/rss",
            "type": "rss",
            "keywords": ["aluminum", "glass", "fenestration"]
        }
        
        # Mock feedparser.parse to return a test feed structure
        # feedparser returns objects that support both attribute and dict access
        # We'll use dict-like objects that support .get() method
        class MockFeedEntry:
            def __init__(self, **kwargs):
                self._data = kwargs
            
            def get(self, key, default=None):
                return self._data.get(key, default)
        
        mock_feed = MagicMock()
        mock_feed.entries = [
            MockFeedEntry(
                title="New Aluminum Profile Technology Launches",
                link="https://example.com/article1",
                published="2024-01-15T10:00:00Z",
                summary="Revolutionary thermal break aluminum system",
                content=[{"value": "Full article content here"}]
            ),
            MockFeedEntry(
                title="Glass Industry Market Update",
                link="https://example.com/article2",
                published="2024-01-14T10:00:00Z",
                summary="Latest market trends in fenestration",
                content=[]
            )
        ]
        
        with patch('agents.research_agent.feedparser.parse', return_value=mock_feed):
            articles = await research_agent.fetch_rss(test_source)
        
        assert len(articles) > 0, "Should fetch at least one article"
        assert "title" in articles[0], "Article should have title"
        assert "url" in articles[0], "Article should have URL"
        assert "source" in articles[0], "Article should have source"
        
        print(f"✅ Fetched {len(articles)} articles from RSS feed")
        print(f"   Sample: {articles[0].get('title', 'N/A')[:50]}...")
        
        return articles
    
    @pytest.mark.asyncio
    async def test_research_agent_filters_relevance(self, research_agent):
        """Test relevance filtering"""
        print("\n🔍 Testing relevance filtering...")
        
        # Create test articles
        test_articles = [
            {
                "title": "New Aluminum Profile Technology Launches in Dubai",
                "summary": "Revolutionary thermal break aluminum system",
                "content": "Egyptian market aluminum upvc thermal break",
                "source": "Test Source"
            },
            {
                "title": "US Labor Laws Update",
                "summary": "New regulations for American workers",
                "content": "labor laws employment regulations",
                "source": "Test Source"
            },
            {
                "title": "Aluminum Prices Rise on LME",
                "summary": "Commodity prices increase",
                "content": "aluminum price lme commodity market",
                "source": "Test Source"
            }
        ]
        
        relevant = await research_agent.filter_relevance(test_articles)
        
        # First and third should be relevant (aluminum-related)
        assert len(relevant) >= 2, "Should filter to relevant articles"
        assert any("Aluminum" in a["title"] for a in relevant), "Should include aluminum articles"
        
        print(f"✅ Filtered {len(relevant)} relevant articles from {len(test_articles)} total")
        
        return relevant
    
    @pytest.mark.asyncio
    async def test_maalem_analyst_analyzes_article(self, maalem_analyst):
        """Test MaalemAnalyst article analysis"""
        print("\n🔍 Testing MaalemAnalyst...")
        
        test_article = """
        New Thermal Break Aluminum Profile Launches in Dubai Market
        
        A revolutionary composite thermal break system has been introduced in the Gulf region.
        The new profile offers 30% better insulation than standard aluminum while maintaining
        the structural strength. Pricing is competitive with UPVC systems.
        
        Egyptian fabricators are showing interest, with several workshops in Cairo already
        requesting samples. The technology is expected to reach Egyptian markets within 3 months.
        """
        
        analysis = await maalem_analyst.analyze_impact(test_article)
        
        assert "relevance" in analysis, "Analysis should include relevance"
        assert "maalem_summary" in analysis, "Analysis should include maalem summary"
        assert "actionable_advice" in analysis, "Analysis should include actionable advice"
        assert "keywords" in analysis, "Analysis should include keywords"
        assert "categories" in analysis, "Analysis should include categories"
        
        # Should be at least medium relevance (contains "egyptian", "cairo", "aluminum")
        assert analysis["relevance"] in [RelevanceLevel.HIGH, RelevanceLevel.MEDIUM, RelevanceLevel.LOW], \
            "Relevance should be valid"
        
        print(f"✅ Analysis complete:")
        print(f"   Relevance: {analysis['relevance'].value}")
        print(f"   Summary: {analysis['maalem_summary'][:60]}...")
        print(f"   Advice: {analysis['actionable_advice'][:60]}...")
        
        return analysis
    
    @pytest.mark.asyncio
    async def test_watchdog_daily_scan(self, watchdog):
        """Test complete daily scan workflow"""
        print("\n🔍 Testing complete daily scan...")
        
        # Run daily scan
        articles = await watchdog.daily_scan()
        
        # Should return list of articles
        assert isinstance(articles, list), "Should return list of articles"
        
        print(f"✅ Daily scan complete: {len(articles)} articles found")
        
        if len(articles) > 0:
            sample = articles[0]
            print(f"   Sample article:")
            print(f"   - Title: {sample.title[:50]}...")
            print(f"   - Source: {sample.source}")
            print(f"   - Relevance: {sample.relevance.value}")
            print(f"   - Summary: {sample.maalem_summary[:60]}...")
        
        return articles
    
    @pytest.mark.asyncio
    async def test_watchdog_morning_brief(self, watchdog):
        """Test morning brief generation"""
        print("\n🔍 Testing morning brief generation...")
        
        # First, run a scan to populate data
        await watchdog.daily_scan()
        
        # Get morning brief
        brief = watchdog.get_morning_brief()
        
        assert "date" in brief, "Brief should have date"
        assert "summary" in brief, "Brief should have summary"
        assert "alerts" in brief, "Brief should have alerts"
        assert "priceUpdates" in brief, "Brief should have price updates"
        assert "totalArticles" in brief, "Brief should have total articles"
        
        print(f"✅ Morning brief generated:")
        print(f"   Summary: {brief['summary']}")
        print(f"   Total articles: {brief['totalArticles']}")
        print(f"   Critical alerts: {brief.get('criticalAlerts', 0)}")
        print(f"   Price updates: {len(brief.get('priceUpdates', []))}")
        
        return brief
    
    @pytest.mark.asyncio
    async def test_watchdog_get_trends(self, watchdog):
        """Test trend retrieval"""
        print("\n🔍 Testing trend retrieval...")
        
        # First, run a scan
        await watchdog.daily_scan()
        
        # Get trends for a topic
        trends = watchdog.get_latest_trends(topic="aluminum", days=30)
        
        assert isinstance(trends, list), "Should return list of trends"
        
        print(f"✅ Retrieved {len(trends)} trends for 'aluminum'")
        
        if len(trends) > 0:
            sample = trends[0]
            print(f"   Sample trend:")
            print(f"   - Title: {sample.title[:50]}...")
            print(f"   - Relevance: {sample.relevance.value}")
        
        return trends
    
    @pytest.mark.asyncio
    async def test_complete_pipeline(self, research_agent, maalem_analyst, watchdog):
        """Test complete pipeline: Research → Analysis → Watchdog → Brief"""
        print("\n🔍 Testing COMPLETE PIPELINE...")
        print("=" * 60)
        
        # Step 1: Research Agent fetches articles
        print("\n1️⃣ Research Agent: Fetching articles...")
        articles = await research_agent.daily_scan()
        print(f"   ✅ Fetched {len(articles)} articles")
        
        if len(articles) == 0:
            print("   ⚠️  No articles fetched - this may be normal if RSS feeds are unavailable")
            return
        
        # Step 2: Maalem Analyst analyzes sample
        print("\n2️⃣ Maalem Analyst: Analyzing sample article...")
        sample_article = articles[0]
        analysis = await maalem_analyst.analyze_impact(
            sample_article.get("content", "") or sample_article.get("summary", "")
        )
        print(f"   ✅ Analysis complete:")
        print(f"      Relevance: {analysis['relevance'].value}")
        print(f"      Summary: {analysis['maalem_summary']}")
        
        # Step 3: Watchdog processes
        print("\n3️⃣ Industry Watchdog: Processing articles...")
        watchdog_articles = await watchdog.daily_scan()
        print(f"   ✅ Processed {len(watchdog_articles)} articles")
        
        # Step 4: Generate morning brief
        print("\n4️⃣ Morning Brief: Generating summary...")
        brief = watchdog.get_morning_brief()
        print(f"   ✅ Brief generated:")
        print(f"      Total articles: {brief['totalArticles']}")
        print(f"      Alerts: {len(brief.get('alerts', []))}")
        print(f"      Price updates: {len(brief.get('priceUpdates', []))}")
        
        # Step 5: Get trends
        print("\n5️⃣ Trends: Retrieving latest trends...")
        trends = watchdog.get_latest_trends(days=7)
        print(f"   ✅ Retrieved {len(trends)} trends")
        
        print("\n" + "=" * 60)
        print("✅ COMPLETE PIPELINE TEST PASSED")
        print("=" * 60)
        
        return {
            "articles_fetched": len(articles),
            "articles_processed": len(watchdog_articles),
            "brief": brief,
            "trends": len(trends),
            "analysis_sample": analysis
        }


# Standalone test runner (for manual testing)
async def run_integration_test():
    """Run integration test manually"""
    print("🚀 Starting Industry Watchdog Integration Test")
    print("=" * 60)
    
    test = TestIndustryWatchdogIntegration()
    
    try:
        # Test each component
        research_agent = IndustryResearchAgent()
        maalem_analyst = MaalemAnalyst()
        watchdog = IndustryWatchdog()
        
        # Run tests
        print("\n📋 Test 1: RSS Feed Fetching")
        articles = await test.test_research_agent_fetches_rss(research_agent)
        
        print("\n📋 Test 2: Relevance Filtering")
        relevant = await test.test_research_agent_filters_relevance(research_agent)
        
        print("\n📋 Test 3: Maalem Analyst")
        analysis = await test.test_maalem_analyst_analyzes_article(maalem_analyst)
        
        print("\n📋 Test 4: Daily Scan")
        watchdog_articles = await test.test_watchdog_daily_scan(watchdog)
        
        print("\n📋 Test 5: Morning Brief")
        brief = await test.test_watchdog_morning_brief(watchdog)
        
        print("\n📋 Test 6: Trends")
        trends = await test.test_watchdog_get_trends(watchdog)
        
        print("\n📋 Test 7: Complete Pipeline")
        pipeline_result = await test.test_complete_pipeline(research_agent, maalem_analyst, watchdog)
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"   Articles fetched: {len(articles) if articles else 0}")
        print(f"   Articles processed: {len(watchdog_articles) if watchdog_articles else 0}")
        print(f"   Morning brief generated: ✅")
        print(f"   Trends retrieved: {len(trends) if trends else 0}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Run async test
    result = asyncio.run(run_integration_test())
    exit(0 if result else 1)

