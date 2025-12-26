#!/usr/bin/env python3
"""
Quick Test Script for Industry Watchdog Pipeline

Run this to validate the complete flow with real data:
python scripts/test_watchdog_pipeline.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.research_agent import IndustryResearchAgent
from agents.maalem_analyst import MaalemAnalyst
from services.industry_watchdog import IndustryWatchdog


async def test_pipeline():
    """Test the complete pipeline"""
    print("🚀 Industry Watchdog Pipeline Test")
    print("=" * 60)
    
    # Initialize components
    print("\n📦 Initializing components...")
    research_agent = IndustryResearchAgent()
    maalem_analyst = MaalemAnalyst()
    watchdog = IndustryWatchdog()
    print("✅ Components initialized")
    
    # Test 1: Fetch RSS feeds
    print("\n" + "=" * 60)
    print("TEST 1: RSS Feed Fetching")
    print("=" * 60)
    try:
        articles = await research_agent.daily_scan()
        print(f"✅ Fetched {len(articles)} articles")
        
        if articles:
            print(f"\n📰 Sample articles:")
            for i, article in enumerate(articles[:3], 1):
                print(f"\n   {i}. {article.get('title', 'N/A')[:60]}...")
                print(f"      Source: {article.get('source', 'N/A')}")
                print(f"      URL: {article.get('url', 'N/A')[:50]}...")
        else:
            print("⚠️  No articles fetched - RSS feeds may be unavailable")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Analyze article
    print("\n" + "=" * 60)
    print("TEST 2: Maalem Analyst")
    print("=" * 60)
    try:
        test_article = """
        New Thermal Break Aluminum Profile Technology Launches in Dubai
        
        A revolutionary composite thermal break system has been introduced in the Gulf region.
        The new profile offers 30% better insulation than standard aluminum while maintaining
        structural strength. Pricing is competitive with UPVC systems.
        
        Egyptian fabricators in Cairo are showing interest, with several workshops already
        requesting samples. The technology is expected to reach Egyptian markets within 3 months.
        """
        
        analysis = await maalem_analyst.analyze_impact(test_article)
        
        print("✅ Analysis complete:")
        print(f"\n   Relevance: {analysis['relevance'].value}")
        print(f"   Maalem Summary: {analysis['maalem_summary']}")
        print(f"   Actionable Advice: {analysis['actionable_advice']}")
        print(f"   Keywords: {', '.join(analysis['keywords'][:5])}")
        print(f"   Categories: {', '.join(analysis['categories'])}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Complete watchdog scan
    print("\n" + "=" * 60)
    print("TEST 3: Industry Watchdog Daily Scan")
    print("=" * 60)
    try:
        watchdog_articles = await watchdog.daily_scan()
        print(f"✅ Processed {len(watchdog_articles)} articles")
        
        if watchdog_articles:
            print(f"\n📊 Article breakdown:")
            high_relevance = [a for a in watchdog_articles if a.relevance.value == 'high']
            medium_relevance = [a for a in watchdog_articles if a.relevance.value == 'medium']
            low_relevance = [a for a in watchdog_articles if a.relevance.value == 'low']
            
            print(f"   High relevance: {len(high_relevance)}")
            print(f"   Medium relevance: {len(medium_relevance)}")
            print(f"   Low relevance: {len(low_relevance)}")
            
            if high_relevance:
                print(f"\n   ⭐ High relevance sample:")
                sample = high_relevance[0]
                print(f"      Title: {sample.title[:60]}...")
                print(f"      Source: {sample.source}")
                print(f"      Summary: {sample.maalem_summary}")
                print(f"      Advice: {sample.actionable_advice}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 4: Morning Brief
    print("\n" + "=" * 60)
    print("TEST 4: Morning Brief Generation")
    print("=" * 60)
    try:
        brief = watchdog.get_morning_brief()
        
        print("✅ Morning brief generated:")
        print(f"\n   Summary: {brief['summary']}")
        print(f"   Total articles: {brief['total_articles']}")
        print(f"   Critical alerts: {brief.get('critical_alerts', 0)}")
        print(f"   Total alerts: {len(brief.get('alerts', []))}")
        print(f"   Price updates: {len(brief.get('price_updates', []))}")
        print(f"   Tech news: {len(brief.get('tech_news', []))}")
        
        if brief.get('alerts'):
            print(f"\n   🚨 Alerts:")
            for alert in brief['alerts'][:3]:
                print(f"      [{alert.get('severity', 'N/A').upper()}] {alert.get('title', 'N/A')[:50]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 5: Trends
    print("\n" + "=" * 60)
    print("TEST 5: Trend Retrieval")
    print("=" * 60)
    try:
        trends = watchdog.get_latest_trends(topic="aluminum", days=30)
        print(f"✅ Retrieved {len(trends)} trends for 'aluminum'")
        
        if trends:
            print(f"\n   📈 Sample trends:")
            for i, trend in enumerate(trends[:3], 1):
                print(f"      {i}. {trend.title[:50]}...")
                print(f"         Relevance: {trend.relevance.value}")
                print(f"         Source: {trend.source}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Final summary
    print("\n" + "=" * 60)
    print("✅ PIPELINE TEST COMPLETE")
    print("=" * 60)
    print("\n📊 Summary:")
    print(f"   Articles fetched: {len(articles) if 'articles' in locals() else 0}")
    print(f"   Articles processed: {len(watchdog_articles) if 'watchdog_articles' in locals() else 0}")
    print(f"   Morning brief: ✅ Generated")
    print(f"   Trends: {len(trends) if 'trends' in locals() else 0} retrieved")
    print("\n🎉 All components working correctly!")
    
    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(test_pipeline())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

