"""
Maalem Analyst - The Brain

Takes raw industry news and translates it into actionable advice
for Egyptian workshops in "Workshop Egyptian" dialect.
"""

import logging
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class RelevanceLevel(Enum):
    """Relevance level for Egyptian workshops"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    IRRELEVANT = "irrelevant"


class MaalemAnalyst:
    """
    The Brain - Analyzes industry news from Egyptian workshop perspective
    
    Responsibilities:
    1. Determine relevance to Cairo workshops
    2. Translate into "Workshop Egyptian" dialect
    3. Extract actionable advice
    4. Categorize by type (price, technology, trend, etc.)
    """
    
    def __init__(self):
        self.egyptian_workshop_context = """
        You are an expert Egyptian Aluminum Fabricator (Maalem) in Cairo.
        You understand:
        - Local market conditions (dust, heat, power issues)
        - Workshop economics (material costs, labor, competition)
        - Customer preferences (thermal break, UPVC, double glazing)
        - Regional trends (Gulf imports, Dubai innovations)
        - Practical constraints (budget, space, skill level)
        
        Speak in "Workshop Egyptian" - mix of Arabic and English, practical, direct.
        """
    
    async def analyze_impact(self, article_text: str) -> Dict[str, Any]:
        """
        Analyze article impact for Egyptian workshops
        
        Args:
            article_text: Raw article content
            
        Returns:
            Dict with:
            - relevance: RelevanceLevel
            - maalem_summary: One sentence slang summary in Arabic/English mix
            - actionable_advice: What workshop should do
            - keywords: Extracted keywords
            - categories: Article categories
        """
        try:
            # Use LLM to analyze (in production, use Gemini/OpenAI)
            # For now, use rule-based analysis as fallback
            analysis = await self._llm_analyze(article_text)
            
            if not analysis:
                # Fallback to rule-based
                analysis = self._rule_based_analyze(article_text)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing article: {e}", exc_info=True)
            return self._rule_based_analyze(article_text)
    
    async def _llm_analyze(self, article_text: str) -> Optional[Dict[str, Any]]:
        """
        Use LLM (Gemini) to analyze article
        
        In production, this would call Gemini API with a well-crafted prompt
        """
        try:
            # Check if Gemini is available
            try:
                import google.generativeai as genai
                from core.config import settings
                
                # Initialize Gemini
                api_key = getattr(settings, 'GEMINI_API_KEY', None)
                if not api_key:
                    return None
                
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-pro')
                
                prompt = f"""
{self.egyptian_workshop_context}

Read this industry news article:
"{article_text[:2000]}"

Analyze it from the perspective of an Egyptian aluminum fabricator in Cairo.

Output in JSON format:
{{
    "relevance": "high" | "medium" | "low" | "irrelevant",
    "maalem_summary": "One sentence summary in Workshop Egyptian (mix Arabic/English)",
    "actionable_advice": "What should the workshop do? (Buy now? Wait? Learn this?)",
    "keywords": ["keyword1", "keyword2"],
    "categories": ["price" | "technology" | "trend" | "market" | "competition"]
}}

Only respond with valid JSON.
"""
                
                response = model.generate_content(prompt)
                
                # Parse JSON response
                import json
                result = json.loads(response.text)
                
                # Convert relevance string to enum
                relevance_map = {
                    "high": RelevanceLevel.HIGH,
                    "medium": RelevanceLevel.MEDIUM,
                    "low": RelevanceLevel.LOW,
                    "irrelevant": RelevanceLevel.IRRELEVANT
                }
                
                result['relevance'] = relevance_map.get(result.get('relevance', 'low'), RelevanceLevel.LOW)
                
                return result
                
            except ImportError:
                # Gemini not available - silently fall back to rule-based
                return None
            except Exception as e:
                # LLM not available or error - silently fall back to rule-based
                return None
                
        except Exception as e:
            logger.error(f"Error in LLM analysis: {e}")
            return None
    
    def _rule_based_analyze(self, article_text: str) -> Dict[str, Any]:
        """
        Fallback rule-based analysis
        
        Uses keyword matching and heuristics
        """
        text_lower = article_text.lower()
        
        # Determine relevance
        relevance = RelevanceLevel.LOW
        
        # High relevance indicators
        high_relevance_keywords = [
            "egypt", "cairo", "middle east", "gulf", "dubai",
            "aluminum price", "upvc price", "thermal break",
            "egyptian market", "cairo workshop"
        ]
        
        if any(keyword in text_lower for keyword in high_relevance_keywords):
            relevance = RelevanceLevel.HIGH
        elif any(keyword in text_lower for keyword in ["aluminum", "upvc", "window", "door", "fenestration"]):
            relevance = RelevanceLevel.MEDIUM
        
        # Extract keywords
        keywords = []
        keyword_list = ["aluminum", "upvc", "thermal break", "glass", "price", "cost", 
                       "technology", "innovation", "egypt", "cairo", "dubai", "gulf"]
        for kw in keyword_list:
            if kw in text_lower:
                keywords.append(kw)
        
        # Determine categories
        categories = []
        if "price" in text_lower or "cost" in text_lower:
            categories.append("price")
        if "new" in text_lower or "technology" in text_lower or "innovation" in text_lower:
            categories.append("technology")
        if "trend" in text_lower or "market" in text_lower:
            categories.append("trend")
        if "competitor" in text_lower or "competition" in text_lower:
            categories.append("competition")
        
        if not categories:
            categories.append("general")
        
        # Generate maalem summary
        maalem_summary = self._generate_maalem_summary(article_text, relevance, categories)
        
        # Generate actionable advice
        actionable_advice = self._generate_actionable_advice(article_text, relevance, categories)
        
        return {
            "relevance": relevance,
            "maalem_summary": maalem_summary,
            "actionable_advice": actionable_advice,
            "keywords": keywords,
            "categories": categories
        }
    
    def _generate_maalem_summary(self, text: str, relevance: RelevanceLevel, categories: list) -> str:
        """Generate Workshop Egyptian summary"""
        text_lower = text.lower()
        
        if relevance == RelevanceLevel.HIGH:
            if "price" in categories:
                return "سعر الألومنيوم اتغير - خد بالك من الأسعار الجديدة"
            elif "technology" in categories:
                return "فيه تكنولوجيا جديدة نازلة - ممكن تفيدك"
            else:
                return "خبر مهم للورشة - لازم تعرف عنه"
        elif relevance == RelevanceLevel.MEDIUM:
            return "فيه حاجة جديدة في السوق - ممكن تتابعها"
        else:
            return "خبر عام - مش مهم كتير"
    
    def _generate_actionable_advice(self, text: str, relevance: RelevanceLevel, categories: list) -> str:
        """Generate actionable advice"""
        text_lower = text.lower()
        
        if relevance == RelevanceLevel.HIGH:
            if "price" in categories and "increase" in text_lower or "rise" in text_lower:
                return "اشتري البضاعة النهاردة قبل ما الأسعار تزيد"
            elif "price" in categories and "decrease" in text_lower or "drop" in text_lower:
                return "استنى شوية قبل ما تشتري - الأسعار ممكن تقل"
            elif "technology" in categories:
                return "تعلم عن التكنولوجيا الجديدة - ممكن تفتحلك فرص جديدة"
            else:
                return "تابع الخبر - ممكن يكون فيه فرصة"
        elif relevance == RelevanceLevel.MEDIUM:
            return "تابع الموضوع - ممكن يكون مفيد"
        else:
            return "مش مهم كتير - ممكن تتجاهله"

