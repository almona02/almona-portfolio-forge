"""
Social Listener Agent - Facebook Group Monitoring

Monitors Egyptian fabrication Facebook groups for:
- Street prices (real market data)
- Supplier reputation
- Material shortages
- Workshop tricks
- Common problems
- Regulation changes

CRITICAL: Uses Facebook Graph API only - NO scraping.
Respects privacy and terms of service.
"""

import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class SocialInsight:
    """Represents a social media insight from Facebook groups"""
    text: str
    type: str  # 'price_alert', 'supplier_review', 'material_shortage', 'workshop_trick', 'problem', 'regulation'
    group: str
    timestamp: datetime
    engagement: int  # Reactions + comments
    author_id: Optional[str] = None  # Anonymized
    url: Optional[str] = None
    credibility_score: float = 0.5  # 0-1, based on engagement and language quality


class FacebookGroupListener:
    """
    Monitors Egyptian fabrication Facebook groups for market intelligence.
    
    TARGET GROUPS (Egyptian Fabrication Hubs):
    - Souq Al Aluminum Egypt (سوق الألومنيوم مصر)
    - Egyptian Carpenters & Fabricators
    - CNC Egypt Workshops
    - UPVC & Aluminum Fabricators Egypt
    - Metal Workers Egypt
    """
    
    def __init__(self, facebook_access_token: Optional[str] = None):
        """
        Initialize Facebook Group Listener
        
        Args:
            facebook_access_token: Facebook Graph API access token
                                  (Required for API access - get from Facebook Developer Console)
        """
        self.access_token = facebook_access_token
        self.graph_api_base = "https://graph.facebook.com/v18.0"
        
        # TARGET GROUPS (Egyptian Fabrication Hubs)
        # NOTE: These are example IDs - replace with actual group IDs
        # To get group IDs: Use Facebook Graph API Explorer
        self.target_groups = {
            'souq_al_aluminum': {
                'id': '123456789',  # Replace with actual group ID
                'name': 'سوق الألومنيوم مصر',
                'keywords': ['سعر', 'الطن', 'ألومنيوم', 'خامات']
            },
            'egyptian_carpenters': {
                'id': '987654321',  # Replace with actual group ID
                'name': 'Egyptian Carpenters & Fabricators',
                'keywords': ['خشب', 'UPVC', 'شباك', 'باب']
            },
            'cnc_egypt_workshops': {
                'id': '112233445',  # Replace with actual group ID
                'name': 'CNC Egypt Workshops',
                'keywords': ['CNC', 'ماكينة', 'قطع', 'برمجة']
            },
            'upvc_fabricators': {
                'id': '556677889',  # Replace with actual group ID
                'name': 'UPVC & Aluminum Fabricators Egypt',
                'keywords': ['UPVC', 'عزل', 'طاقة', 'شباك']
            },
            'metal_workers': {
                'id': '998877665',  # Replace with actual group ID
                'name': 'Metal Workers Egypt',
                'keywords': ['حديد', 'لحام', 'معدن', 'ورشة']
            }
        }
        
        # KEY EGYPTIAN ARABIC KEYWORDS FOR FILTERING
        self.keywords = {
            'pricing': [
                'سعر', 'الطن بكام', 'زيادة الاسعار', 'نقص في الخامات',
                'السعر', 'بكام', 'جنيه', 'دولار', 'سعر الطن',
                'ارتفاع', 'انخفاض', 'تخفيض', 'عرض'
            ],
            'problems': [
                'مشكلة', 'عايز حل', 'ليه بيعمل كده', 'بيزعق',
                'غلط', 'خطأ', 'مش شغال', 'مكسور', 'عطل',
                'مش عارف', 'محتاج مساعدة', 'فيه مشكلة'
            ],
            'suppliers': [
                'عندك رقم', 'تعرف حد', 'شغال مع', 'تاجر',
                'مورد', 'مستورد', 'شركة', 'مصنع', 'ورشة',
                'جودة', 'مضمون', 'مش مضمون', 'ابتعوا عن'
            ],
            'tricks': [
                'سر', 'طريقة', 'هنفدك', 'خدعة', 'نصيحة',
                'حيلة', 'تكنيك', 'معلومة', 'فكرة', 'حل سريع'
            ],
            'shortages': [
                'مفيش', 'نفذ', 'مش موجود', 'مش لاقي', 'نقص',
                'قلة', 'عدم توفر', 'مش متوفر', 'انتهى'
            ],
            'regulations': [
                'البلدية', 'الترخيص', 'قانون', 'منع', 'سمح',
                'ممنوع', 'مسموح', 'لوائح', 'قرار', 'تغيير'
            ]
        }
    
    async def fetch_group_posts_via_api(
        self, 
        group_id: str, 
        limit: int = 50,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch posts from a Facebook group using Graph API.
        
        CRITICAL: This requires:
        1. Facebook App with proper permissions
        2. Group must be public OR app must have admin access
        3. Valid access token with 'groups_read' permission
        
        Args:
            group_id: Facebook group ID
            limit: Maximum number of posts to fetch
            since: Only fetch posts since this datetime
            
        Returns:
            List of post dictionaries from Graph API
        """
        if not self.access_token:
            logger.warning("No Facebook access token - cannot fetch posts via API")
            logger.info("For testing, use mock_social_insights() method")
            return []
        
        try:
            url = f"{self.graph_api_base}/{group_id}/feed"
            params = {
                'access_token': self.access_token,
                'limit': limit,
                'fields': 'id,message,created_time,reactions.summary(true),comments.summary(true),from',
            }
            
            if since:
                params['since'] = int(since.timestamp())
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                posts = data.get('data', [])
                logger.info(f"Fetched {len(posts)} posts from group {group_id}")
                return posts
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 403:
                logger.error(f"Access denied to group {group_id}. Check permissions and group privacy settings.")
            else:
                logger.error(f"HTTP error fetching posts: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching group posts: {e}")
            return []
    
    def is_relevant_post(self, post: Dict[str, Any]) -> bool:
        """
        Filter posts for relevance to fabrication market intelligence.
        
        Looks for keywords related to:
        - Pricing
        - Supplier information
        - Material availability
        - Technical problems
        - Workshop tips
        """
        message = post.get('message', '').lower()
        
        # Check if post contains any relevant keywords
        all_keywords = []
        for category_keywords in self.keywords.values():
            all_keywords.extend(category_keywords)
        
        # Check for keyword matches
        has_keyword = any(keyword in message for keyword in all_keywords)
        
        # Check engagement (high engagement = more credible)
        reactions = post.get('reactions', {}).get('summary', {}).get('total_count', 0)
        comments = post.get('comments', {}).get('summary', {}).get('total_count', 0)
        engagement = reactions + comments
        
        # Consider relevant if has keywords OR high engagement
        return has_keyword or engagement > 5
    
    def categorize_post(self, post: Dict[str, Any]) -> str:
        """Categorize post by type based on keywords"""
        message = post.get('message', '').lower()
        
        # Check each category
        if any(kw in message for kw in self.keywords['pricing']):
            return 'price_alert'
        elif any(kw in message for kw in self.keywords['suppliers']):
            return 'supplier_review'
        elif any(kw in message for kw in self.keywords['shortages']):
            return 'material_shortage'
        elif any(kw in message for kw in self.keywords['tricks']):
            return 'workshop_trick'
        elif any(kw in message for kw in self.keywords['problems']):
            return 'problem'
        elif any(kw in message for kw in self.keywords['regulations']):
            return 'regulation'
        else:
            return 'general'
    
    def calculate_credibility_score(self, post: Dict[str, Any]) -> float:
        """
        Calculate credibility score (0-1) based on:
        - Engagement (reactions + comments)
        - Post length (detailed posts = more credible)
        - Language quality (proper Arabic = more credible)
        """
        reactions = post.get('reactions', {}).get('summary', {}).get('total_count', 0)
        comments = post.get('comments', {}).get('summary', {}).get('total_count', 0)
        engagement = reactions + comments
        
        message = post.get('message', '')
        message_length = len(message)
        
        # Engagement score (0-0.5)
        engagement_score = min(engagement / 20.0, 0.5)
        
        # Length score (0-0.3)
        length_score = min(message_length / 500.0, 0.3)
        
        # Language quality (0-0.2) - simple heuristic
        # More Arabic characters = better (Egyptian posts)
        arabic_chars = sum(1 for c in message if '\u0600' <= c <= '\u06FF')
        arabic_ratio = arabic_chars / max(len(message), 1)
        language_score = arabic_ratio * 0.2
        
        return min(engagement_score + length_score + language_score, 1.0)
    
    async def monitor_groups(
        self, 
        hours_back: int = 24,
        min_credibility: float = 0.3
    ) -> List[SocialInsight]:
        """
        Monitor target groups for new posts/comments.
        
        Args:
            hours_back: How many hours back to look
            min_credibility: Minimum credibility score to include
            
        Returns:
            List of SocialInsight objects
        """
        insights = []
        since = datetime.now(timezone.utc) - timedelta(hours=hours_back)
        
        for group_key, group_info in self.target_groups.items():
            group_id = group_info['id']
            group_name = group_info['name']
            
            logger.info(f"Monitoring group: {group_name} (ID: {group_id})")
            
            # Fetch posts via API
            posts = await self.fetch_group_posts_via_api(group_id, since=since)
            
            for post in posts:
                # Filter for relevant posts
                if not self.is_relevant_post(post):
                    continue
                
                # Calculate credibility
                credibility = self.calculate_credibility_score(post)
                if credibility < min_credibility:
                    continue
                
                # Create insight
                created_time = datetime.fromisoformat(
                    post['created_time'].replace('Z', '+00:00')
                )
                
                insight = SocialInsight(
                    text=post.get('message', ''),
                    type=self.categorize_post(post),
                    group=group_name,
                    timestamp=created_time,
                    engagement=post.get('reactions', {}).get('summary', {}).get('total_count', 0) +
                              post.get('comments', {}).get('summary', {}).get('total_count', 0),
                    url=f"https://www.facebook.com/groups/{group_id}/posts/{post.get('id', '')}",
                    credibility_score=credibility
                )
                
                insights.append(insight)
        
        # Sort by credibility and engagement
        insights.sort(key=lambda x: (x.credibility_score, x.engagement), reverse=True)
        
        logger.info(f"Found {len(insights)} relevant social insights")
        return insights
    
    def mock_social_insights(self) -> List[SocialInsight]:
        """
        Generate mock social insights for testing when API is not available.
        
        These are realistic examples of what you'd find in Egyptian fabrication groups.
        """
        now = datetime.now(timezone.utc)
        
        return [
            SocialInsight(
                text="الطن الألومنيوم وصل 90,000 جنيه في السوق السودة. اللي ناوي يشتري يروح النهاردة قبل ما يزيد أكتر",
                type='price_alert',
                group='سوق الألومنيوم مصر',
                timestamp=now - timedelta(hours=2),
                engagement=45,
                credibility_score=0.85,
                url=None
            ),
            SocialInsight(
                text="ابتعوا عن ورشة محمد في العتبة، الخشب بتاعه مش مظبوط والجودة ضعيفة. جربت معاهم مرتين وكل مرة مشكلة",
                type='supplier_review',
                group='Egyptian Carpenters & Fabricators',
                timestamp=now - timedelta(hours=5),
                engagement=32,
                credibility_score=0.75,
                url=None
            ),
            SocialInsight(
                text="مفيش حديد تسليح 12 ملي من أسبوع. حد يعرف مصدر تاني؟ المشروع متوقف",
                type='material_shortage',
                group='Metal Workers Egypt',
                timestamp=now - timedelta(hours=8),
                engagement=18,
                credibility_score=0.65,
                url=None
            ),
            SocialInsight(
                text="حطوا نقطة سولار على المنشار عشان مايكسرش UPVC. ده سر من أسرار الورشة الكبيرة",
                type='workshop_trick',
                group='UPVC & Aluminum Fabricators Egypt',
                timestamp=now - timedelta(hours=12),
                engagement=67,
                credibility_score=0.90,
                url=None
            ),
            SocialInsight(
                text="البلدية بدأت تمنع الشبابيك الزجاجية في الواجهات. اللي عنده مشروع جديد ياخد باله",
                type='regulation',
                group='سوق الألومنيوم مصر',
                timestamp=now - timedelta(hours=15),
                engagement=89,
                credibility_score=0.95,
                url=None
            ),
        ]


# Example usage
async def main():
    """Example usage of FacebookGroupListener"""
    # Initialize with access token (or None for testing)
    listener = FacebookGroupListener(facebook_access_token=None)
    
    # For testing without API access
    insights = listener.mock_social_insights()
    
    print(f"Found {len(insights)} social insights:")
    for insight in insights:
        print(f"\n[{insight.type}] {insight.group}")
        print(f"  {insight.text[:100]}...")
        print(f"  Engagement: {insight.engagement}, Credibility: {insight.credibility_score:.2f}")


if __name__ == "__main__":
    asyncio.run(main())

