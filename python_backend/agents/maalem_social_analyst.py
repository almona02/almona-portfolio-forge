"""
Maalem Social Analyst - Interprets Social Media Insights

Transforms raw social chatter from Facebook groups into actionable
Maalem wisdom for Egyptian workshop owners.

Understands:
- Workshop slang and dialect
- Sentiment analysis
- Credibility assessment
- Actionable advice extraction
"""

import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from agents.social_listener import SocialInsight
from agents.maalem_analyst import MaalemAnalyst

logger = logging.getLogger(__name__)


@dataclass
class SocialAnalysis:
    """Analysis result from MaalemSocialAnalyst"""
    core_truth: str  # الحقيقة - The core issue/announcement
    impact: str  # التأثير - How this affects workshop owners
    maalem_advice: str  # نصيحة المعلم - What should workshop do
    credibility_score: float  # مصداقية - 0-1
    category: str  # التصنيف
    urgency: str  # 'low', 'medium', 'high'
    confidence: float  # How confident we are in this analysis (0-1)


class MaalemSocialAnalyst:
    """
    Analyzes social media insights and transforms them into actionable
    Maalem wisdom for Egyptian workshop owners.
    """
    
    def __init__(self):
        """Initialize Maalem Social Analyst"""
        self.maalem_analyst = MaalemAnalyst()
        
        # Egyptian reality filters - patterns that indicate credibility
        self.credibility_indicators = {
            'high': [
                'جربت', 'شفت', 'جربت معاهم', 'اشتريت', 'استخدمت',
                'من تجربة', 'من خبرة', 'من واقع', 'حصل معايا'
            ],
            'medium': [
                'سمعت', 'قالوا', 'ناس بتقول', 'في ناس', 'بعض',
                'ممكن', 'يبدو', 'يقال'
            ],
            'low': [
                'ممكن يكون', 'يمكن', 'أعتقد', 'أظن', 'شك',
                'غير متأكد', 'مش متأكد'
            ]
        }
        
        # Urgency keywords
        self.urgency_keywords = {
            'high': ['فوراً', 'النهاردة', 'دلوقتي', 'عاجل', 'مستعجل', 'مشروع متوقف'],
            'medium': ['قريب', 'خلال', 'الأسبوع', 'الشهر', 'قريباً'],
            'low': ['ممكن', 'في المستقبل', 'لما', 'عندما']
        }
    
    async def analyze_social_insight(
        self, 
        insight: SocialInsight,
        use_llm: bool = True
    ) -> SocialAnalysis:
        """
        Analyze a social media insight and transform it into actionable Maalem wisdom.
        
        Args:
            insight: SocialInsight from Facebook group
            use_llm: Whether to use LLM for analysis (falls back to rule-based if False)
            
        Returns:
            SocialAnalysis with actionable advice
        """
        if use_llm:
            try:
                return await self._llm_analyze(insight)
            except Exception as e:
                logger.warning(f"LLM analysis failed, using rule-based: {e}")
                return self._rule_based_analyze(insight)
        else:
            return self._rule_based_analyze(insight)
    
    async def _llm_analyze(self, insight: SocialInsight) -> SocialAnalysis:
        """
        Use LLM to analyze social insight with Maalem context.
        """
        prompt = f"""
        You are a seasoned Egyptian fabrication Maalem (معلم) with 30 years of experience.
        
        Read this post from a workshop Facebook group:
        "{insight.text}"
        
        Post Type: {insight.type}
        Group: {insight.group}
        Engagement: {insight.engagement} reactions/comments
        Credibility Score: {insight.credibility_score:.2f}
        
        Analyze it and provide:
        
        1. **الحقيقة (The Core Truth):** What is the real issue/announcement? Extract the factual information.
        
        2. **التأثير (The Impact):** How does this affect a workshop owner? Consider:
           - Cost impact (will prices go up/down?)
           - Time impact (will this cause delays?)
           - Quality impact (does this affect product quality?)
           - Business impact (does this affect customer relations?)
        
        3. **نصيحة المعلم (Maalem's Advice):** What should a workshop owner do?
           - Buy now / Wait / Avoid / Learn
           - Be specific and actionable
           - Use Egyptian workshop dialect
        
        4. **مصداقية (Credibility Assessment):** 
           - High: Post has specific details, high engagement, author seems experienced
           - Medium: Post seems reasonable but lacks details
           - Low: Post is vague, low engagement, or seems like rumor
        
        5. **التصنيف (Category):** One of: price_alert, supplier_review, material_shortage, workshop_trick, problem, regulation
        
        6. **الاستعجال (Urgency):** 
           - High: Action needed today/this week
           - Medium: Action needed this month
           - Low: Information only, no immediate action
        
        Respond in JSON format:
        {{
            "core_truth": "...",
            "impact": "...",
            "maalem_advice": "...",
            "credibility_score": 0.0-1.0,
            "category": "...",
            "urgency": "low/medium/high",
            "confidence": 0.0-1.0
        }}
        """
        
        # Use MaalemAnalyst's LLM
        result = await self.maalem_analyst.analyze_impact(insight.text)
        
        # Parse and enhance with social context
        return SocialAnalysis(
            core_truth=result.get('maalem_summary', insight.text[:200]),
            impact=result.get('actionable_advice', 'تحليل مطلوب'),
            maalem_advice=self._extract_actionable_advice(insight, result),
            credibility_score=self._enhance_credibility(insight, result),
            category=insight.type,
            urgency=self._determine_urgency(insight),
            confidence=min(insight.credibility_score + 0.2, 1.0)
        )
    
    def _rule_based_analyze(self, insight: SocialInsight) -> SocialAnalysis:
        """
        Rule-based analysis when LLM is not available.
        """
        text_lower = insight.text.lower()
        
        # Extract core truth (first 150 chars)
        core_truth = insight.text[:150] + "..." if len(insight.text) > 150 else insight.text
        
        # Determine impact based on type
        impact_map = {
            'price_alert': 'تأثير مباشر على التكلفة - قد تحتاج تعديل الأسعار',
            'supplier_review': 'تأثير على اختيار الموردين - قد تحتاج تجنب مورد معين',
            'material_shortage': 'تأثير على الجدول الزمني - قد تحتاج بدائل',
            'workshop_trick': 'تأثير إيجابي - قد تحسن الجودة أو السرعة',
            'problem': 'تأثير على الجودة - قد تحتاج حلول بديلة',
            'regulation': 'تأثير على الامتثال - قد تحتاج تعديل التصميم'
        }
        impact = impact_map.get(insight.type, 'تأثير محتمل على العمل')
        
        # Generate advice based on type
        advice_map = {
            'price_alert': 'تابع الأسعار - قد تحتاج الشراء قبل الزيادة',
            'supplier_review': 'احذر من المورد المذكور - ابحث عن بدائل',
            'material_shortage': 'ابحث عن مصادر بديلة - قد تحتاج تعديل التصميم',
            'workshop_trick': 'جرب هذه الطريقة - قد تحسن النتيجة',
            'problem': 'احذر من هذه المشكلة - ابحث عن حلول',
            'regulation': 'تحقق من اللوائح الجديدة - قد تحتاج تعديل'
        }
        maalem_advice = advice_map.get(insight.type, 'تابع الخبر')
        
        # Determine urgency
        urgency = self._determine_urgency(insight)
        
        return SocialAnalysis(
            core_truth=core_truth,
            impact=impact,
            maalem_advice=maalem_advice,
            credibility_score=insight.credibility_score,
            category=insight.type,
            urgency=urgency,
            confidence=0.6  # Lower confidence for rule-based
        )
    
    def _extract_actionable_advice(
        self, 
        insight: SocialInsight, 
        llm_result: Dict[str, Any]
    ) -> str:
        """Extract actionable advice from LLM result"""
        advice = llm_result.get('actionable_advice', '')
        
        # Enhance with type-specific guidance
        if insight.type == 'price_alert':
            if 'زيادة' in insight.text or 'ارتفاع' in insight.text:
                return f"{advice} - اشتري النهاردة قبل ما يزيد أكتر"
            elif 'انخفاض' in insight.text or 'تخفيض' in insight.text:
                return f"{advice} - استنى شوية قبل الشراء"
        
        return advice
    
    def _enhance_credibility(
        self, 
        insight: SocialInsight, 
        llm_result: Dict[str, Any]
    ) -> float:
        """Enhance credibility score based on LLM analysis and social signals"""
        base_score = insight.credibility_score
        
        # Check for credibility indicators in text
        text_lower = insight.text.lower()
        for level, indicators in self.credibility_indicators.items():
            if any(indicator in text_lower for indicator in indicators):
                if level == 'high':
                    base_score += 0.15
                elif level == 'medium':
                    base_score += 0.05
                else:
                    base_score -= 0.1
        
        # Engagement boost
        if insight.engagement > 20:
            base_score += 0.1
        elif insight.engagement < 5:
            base_score -= 0.1
        
        return min(max(base_score, 0.0), 1.0)
    
    def _determine_urgency(self, insight: SocialInsight) -> str:
        """Determine urgency level from insight"""
        text_lower = insight.text.lower()
        
        # Check for urgency keywords
        for level, keywords in self.urgency_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return level
        
        # Type-based urgency
        urgent_types = ['price_alert', 'material_shortage', 'regulation']
        if insight.type in urgent_types:
            return 'high'
        
        return 'medium'
    
    def apply_egyptian_reality_filter(self, analysis: SocialAnalysis) -> SocialAnalysis:
        """
        Apply Egyptian market reality filters to analysis.
        
        Filters out unrealistic claims and adjusts advice based on
        Egyptian market context.
        """
        # If credibility is too low, reduce confidence
        if analysis.credibility_score < 0.4:
            analysis.confidence *= 0.7
            analysis.maalem_advice = f"خبر غير مؤكد - {analysis.maalem_advice}"
        
        # If engagement is very low, reduce credibility
        # (This would need insight.engagement, but we don't have it in SocialAnalysis)
        # We'll handle this in the caller
        
        return analysis
    
    async def analyze_batch(
        self, 
        insights: List[SocialInsight],
        use_llm: bool = True
    ) -> List[SocialAnalysis]:
        """
        Analyze multiple social insights in batch.
        
        Args:
            insights: List of SocialInsight objects
            use_llm: Whether to use LLM (slower but better)
            
        Returns:
            List of SocialAnalysis objects, sorted by urgency and credibility
        """
        analyses = []
        
        for insight in insights:
            try:
                analysis = await self.analyze_social_insight(insight, use_llm=use_llm)
                analyses.append(analysis)
            except Exception as e:
                logger.error(f"Error analyzing insight: {e}")
                continue
        
        # Sort by urgency (high first) then credibility
        urgency_order = {'high': 3, 'medium': 2, 'low': 1}
        analyses.sort(
            key=lambda x: (urgency_order.get(x.urgency, 0), x.credibility_score),
            reverse=True
        )
        
        return analyses


# Example usage
async def main():
    """Example usage of MaalemSocialAnalyst"""
    from agents.social_listener import FacebookGroupListener
    
    # Get social insights
    listener = FacebookGroupListener()
    insights = listener.mock_social_insights()
    
    # Analyze with Maalem
    analyst = MaalemSocialAnalyst()
    analyses = await analyst.analyze_batch(insights[:2], use_llm=False)
    
    print(f"Analyzed {len(analyses)} insights:")
    for analysis in analyses:
        print(f"\n[{analysis.category}] Urgency: {analysis.urgency}")
        print(f"  Truth: {analysis.core_truth[:100]}...")
        print(f"  Advice: {analysis.maalem_advice}")
        print(f"  Credibility: {analysis.credibility_score:.2f}")


if __name__ == "__main__":
    asyncio.run(main())

