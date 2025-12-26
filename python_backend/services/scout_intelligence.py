"""
Scout Intelligence Service - Human-Augmented Data Collection

Processes intelligence from:
1. Human scouts (browser extension, Telegram bot)
2. Crowdsourced reports (workshop owners)
3. OCR-extracted data from images

Implements consensus engine for data verification.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import uuid

from agents.maalem_social_analyst import MaalemSocialAnalyst
from services.industry_watchdog import IndustryWatchdog, IndustryArticle, RelevanceLevel

logger = logging.getLogger(__name__)


@dataclass
class PriceReport:
    """Crowdsourced price report"""
    report_id: str
    material: str
    price: float
    unit: str
    location: str
    supplier_name: Optional[str]
    workshop_id: Optional[str]
    timestamp: datetime
    verified: bool
    consensus_score: float


@dataclass
class ScoutInsight:
    """Insight from human scout"""
    insight_id: str
    text: str
    source_name: str
    source_url: Optional[str]
    timestamp: datetime
    scout_id: Optional[str]
    analysis: Optional[Dict[str, Any]]
    processed: bool


class ScoutIntelligenceService:
    """
    Service for processing human-augmented intelligence
    
    Features:
    - Process scout reports
    - Verify crowdsourced prices (consensus engine)
    - OCR image processing
    - Update Industry Watchdog with verified data
    """
    
    def __init__(self):
        self.maalem_analyst = MaalemSocialAnalyst()
        self.watchdog = IndustryWatchdog(enable_social_listener=False)
        
        # In-memory storage (replace with database in production)
        self.scout_insights: List[ScoutInsight] = []
        self.price_reports: List[PriceReport] = []
        
        # Consensus thresholds
        self.consensus_threshold = 0.7  # 70% agreement needed
        self.min_reports_for_consensus = 3  # Minimum reports to verify
    
    async def process_scout_report(
        self,
        text: str,
        source_name: str,
        source_url: Optional[str] = None,
        post_date: Optional[str] = None,
        author: Optional[str] = None,
        scout_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process report from human scout
        
        Args:
            text: Post text/content
            source_name: Source identifier (e.g., "Facebook: سوق الألومنيوم")
            source_url: URL to original post
            post_date: Date of post
            author: Author (anonymized)
            scout_id: Scout identifier
            metadata: Additional metadata
            
        Returns:
            Processing result with insight_id and analysis
        """
        try:
            # Create insight
            insight_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc)
            
            if post_date:
                try:
                    from dateutil import parser
                    timestamp = parser.parse(post_date)
                    if timestamp.tzinfo is None:
                        timestamp = timestamp.replace(tzinfo=timezone.utc)
                except:
                    pass
            
            # Analyze with Maalem Social Analyst
            from agents.social_listener import SocialInsight
            
            # Create mock social insight for analysis
            social_insight = SocialInsight(
                text=text,
                type="general",  # Will be categorized by analyst
                group=source_name,
                timestamp=timestamp,
                engagement=0,
                url=source_url,
                credibility_score=0.8  # Human reports are high credibility
            )
            
            # Analyze
            analysis = await self.maalem_analyst.analyze_social_insight(
                social_insight,
                use_llm=False  # Can enable LLM if available
            )
            
            # Store insight
            insight = ScoutInsight(
                insight_id=insight_id,
                text=text,
                source_name=source_name,
                source_url=source_url,
                timestamp=timestamp,
                scout_id=scout_id,
                analysis={
                    "core_truth": analysis.core_truth,
                    "impact": analysis.impact,
                    "maalem_advice": analysis.maalem_advice,
                    "category": analysis.category,
                    "urgency": analysis.urgency,
                    "credibility": analysis.credibility_score
                },
                processed=True
            )
            
            self.scout_insights.append(insight)
            
            # Convert to IndustryArticle and add to watchdog
            if analysis.credibility_score >= 0.5:
                article = IndustryArticle(
                    title=f"[من الكشافة] {text[:80]}...",
                    url=source_url or "",
                    source=f"Scout: {source_name}",
                    published_at=timestamp,
                    content=text,
                    relevance=(
                        RelevanceLevel.HIGH
                        if analysis.urgency == "high"
                        else RelevanceLevel.MEDIUM
                    ),
                    maalem_summary=analysis.core_truth,
                    actionable_advice=analysis.maalem_advice,
                    keywords=self._extract_keywords(text),
                    categories=[analysis.category, "scout_report", "human_verified"],
                    raw_data={
                        "type": "scout_report",
                        "scout_id": scout_id,
                        "source": source_name,
                        "metadata": metadata or {}
                    }
                )
                
                self.watchdog.stored_articles.append(article)
                
                # Generate alert if high urgency
                if analysis.urgency == "high":
                    from services.industry_watchdog import MarketAlert
                    
                    alert = MarketAlert(
                        alert_type="scout_report",
                        severity="high",
                        title=f"تقرير كشافة: {analysis.core_truth[:60]}",
                        message_arabic=analysis.core_truth,
                        message_english=analysis.impact,
                        actionable=analysis.maalem_advice,
                        created_at=datetime.now(timezone.utc),
                        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
                    )
                    
                    self.watchdog.active_alerts.append(alert)
            
            logger.info(f"Processed scout report: {insight_id}")
            
            return {
                "insight_id": insight_id,
                "analysis": insight.analysis
            }
            
        except Exception as e:
            logger.error(f"Error processing scout report: {e}", exc_info=True)
            raise
    
    async def process_price_report(
        self,
        material: str,
        price: float,
        unit: str,
        location: str,
        supplier_name: Optional[str] = None,
        notes: Optional[str] = None,
        workshop_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process crowdsourced price report with consensus verification
        
        Args:
            material: Material type (e.g., "aluminum", "upvc")
            price: Price value
            unit: Unit (e.g., "EGP/ton")
            location: Location (e.g., "Giza", "Cairo")
            supplier_name: Optional supplier name
            notes: Optional notes
            workshop_id: Workshop identifier (for rewards)
            
        Returns:
            Processing result with consensus score and verification status
        """
        try:
            # Create report
            report_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc)
            
            report = PriceReport(
                report_id=report_id,
                material=material.lower(),
                price=price,
                unit=unit,
                location=location,
                supplier_name=supplier_name,
                workshop_id=workshop_id,
                timestamp=timestamp,
                verified=False,
                consensus_score=0.0
            )
            
            # Check consensus with existing reports
            consensus_result = self._check_price_consensus(report)
            
            report.consensus_score = consensus_result["score"]
            report.verified = consensus_result["verified"]
            
            # Store report
            self.price_reports.append(report)
            
            # If verified, update street price index
            if report.verified:
                await self._update_street_price_index(report)
            
            logger.info(
                f"Processed price report: {report_id} "
                f"(Material: {material}, Price: {price} {unit}, "
                f"Consensus: {consensus_result['score']:.2f})"
            )
            
            return {
                "report_id": report_id,
                "consensus_score": consensus_result["score"],
                "verified": consensus_result["verified"],
                "matching_reports": consensus_result.get("matching_count", 0)
            }
            
        except Exception as e:
            logger.error(f"Error processing price report: {e}", exc_info=True)
            raise
    
    def _check_price_consensus(self, report: PriceReport) -> Dict[str, Any]:
        """
        Check if price report matches consensus from other reports
        
        Returns consensus score (0-1) and verification status
        """
        # Get recent reports for same material and location
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
        
        matching_reports = [
            r for r in self.price_reports
            if (r.material == report.material and
                r.location.lower() == report.location.lower() and
                r.timestamp >= cutoff_date and
                r.report_id != report.report_id)
        ]
        
        if len(matching_reports) < self.min_reports_for_consensus - 1:
            # Not enough data for consensus
            return {
                "score": 0.5,  # Neutral score
                "verified": False,
                "matching_count": len(matching_reports),
                "reason": "insufficient_data"
            }
        
        # Calculate price variance
        prices = [r.price for r in matching_reports]
        avg_price = sum(prices) / len(prices) if prices else report.price
        
        # Calculate variance percentage
        variance = abs(report.price - avg_price) / avg_price if avg_price > 0 else 1.0
        
        # Consensus score: lower variance = higher score
        if variance <= 0.05:  # Within 5%
            consensus_score = 0.9
            verified = True
        elif variance <= 0.10:  # Within 10%
            consensus_score = 0.7
            verified = True
        elif variance <= 0.20:  # Within 20%
            consensus_score = 0.5
            verified = False
        else:  # > 20% variance
            consensus_score = 0.3
            verified = False
        
        return {
            "score": consensus_score,
            "verified": verified,
            "matching_count": len(matching_reports),
            "average_price": avg_price,
            "variance": variance,
            "reason": "consensus_check"
        }
    
    async def _update_street_price_index(self, report: PriceReport):
        """Update street price index with verified price"""
        # In production, this would update a database
        # For now, create an alert/article
        
        article = IndustryArticle(
            title=f"سعر الشارع: {report.material} - {report.price} {report.unit} في {report.location}",
            url="",
            source="Crowdsourced (Verified)",
            published_at=report.timestamp,
            content=f"سعر {report.material} في {report.location}: {report.price} {report.unit}",
            relevance=RelevanceLevel.HIGH,
            maalem_summary=f"سعر {report.material} في {report.location}: {report.price} {report.unit}",
            actionable_advice=f"استخدم هذا السعر كمرجع للتسعير في {report.location}",
            keywords=[report.material, report.location, "street_price"],
            categories=["price_alert", "street_intelligence", "verified"],
            raw_data={
                "type": "verified_street_price",
                "material": report.material,
                "price": report.price,
                "unit": report.unit,
                "location": report.location,
                "consensus_score": report.consensus_score
            }
        )
        
        self.watchdog.stored_articles.append(article)
    
    async def process_price_list_image(
        self,
        image_data: bytes,
        filename: str,
        source_name: str,
        supplier_name: Optional[str] = None,
        location: Optional[str] = None,
        scout_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process image of price list using OCR
        
        Args:
            image_data: Image file bytes
            filename: Original filename
            source_name: Source identifier
            supplier_name: Supplier name if known
            location: Location if known
            scout_id: Scout identifier
            
        Returns:
            Processing result with extracted data
        """
        try:
            # OCR processing
            extracted_text = await self._extract_text_from_image(image_data)
            
            # Extract price data from text
            price_data = self._parse_price_list_text(extracted_text)
            
            # Create insight
            insight_id = str(uuid.uuid4())
            
            # Analyze extracted data
            if price_data:
                # Create article from extracted prices
                article = IndustryArticle(
                    title=f"قائمة أسعار من {supplier_name or source_name}",
                    url="",
                    source=f"OCR: {source_name}",
                    published_at=datetime.now(timezone.utc),
                    content=extracted_text,
                    relevance=RelevanceLevel.HIGH,
                    maalem_summary=f"قائمة أسعار محدثة من {supplier_name or source_name}",
                    actionable_advice="استخدم هذه الأسعار كمرجع للتسعير",
                    keywords=["price_list", "supplier"] + list(price_data.keys()),
                    categories=["price_alert", "ocr_extracted", "supplier_catalog"],
                    raw_data={
                        "type": "ocr_price_list",
                        "supplier": supplier_name,
                        "location": location,
                        "extracted_prices": price_data,
                        "confidence": 0.8  # OCR confidence
                    }
                )
                
                self.watchdog.stored_articles.append(article)
            
            return {
                "insight_id": insight_id,
                "extracted_data": price_data,
                "confidence": 0.8,
                "text": extracted_text[:500]  # First 500 chars
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {e}", exc_info=True)
            raise
    
    async def _extract_text_from_image(self, image_data: bytes) -> str:
        """
        Extract text from image using OCR
        
        Uses Tesseract or Google Cloud Vision API
        """
        try:
            # Try Tesseract first (free, local)
            try:
                import pytesseract
                from PIL import Image
                import io
                
                image = Image.open(io.BytesIO(image_data))
                text = pytesseract.image_to_string(image, lang='ara+eng')
                return text
            except ImportError:
                logger.warning("Tesseract not available, using fallback")
            
            # Fallback: Google Cloud Vision API
            try:
                from google.cloud import vision
                
                client = vision.ImageAnnotatorClient()
                image = vision.Image(content=image_data)
                response = client.text_detection(image=image)
                
                if response.text_annotations:
                    return response.text_annotations[0].description
            except ImportError:
                logger.warning("Google Cloud Vision not available")
            
            # Ultimate fallback: return placeholder
            return "OCR not configured - please install pytesseract or Google Cloud Vision"
            
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return f"OCR extraction failed: {str(e)}"
    
    def _parse_price_list_text(self, text: str) -> Dict[str, float]:
        """
        Parse price list text to extract material prices
        
        Looks for patterns like:
        - "ألومنيوم: 90,000 جنيه"
        - "Aluminum: 90000 EGP"
        - "UPVC: 120,000"
        """
        price_data = {}
        text_lower = text.lower()
        
        # Common material keywords
        materials = {
            "aluminum": ["ألومنيوم", "aluminum", "aluminium"],
            "upvc": ["upvc", "يو بي في سي"],
            "steel": ["حديد", "steel", "iron"],
            "glass": ["زجاج", "glass"]
        }
        
        # Price patterns (numbers with currency)
        import re
        
        # Find numbers that might be prices
        price_patterns = re.findall(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)', text)
        
        # Try to match materials with nearby prices
        for material, keywords in materials.items():
            for keyword in keywords:
                if keyword in text_lower:
                    # Find price near this keyword
                    keyword_pos = text_lower.find(keyword)
                    nearby_text = text[max(0, keyword_pos-50):keyword_pos+100]
                    
                    # Extract first number as price
                    numbers = re.findall(r'(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?)', nearby_text)
                    if numbers:
                        try:
                            price = float(numbers[0].replace(',', '').replace(' ', ''))
                            price_data[material] = price
                        except:
                            pass
        
        return price_data
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        keywords = []
        text_lower = text.lower()
        
        # Common fabrication terms
        terms = [
            "aluminum", "upvc", "steel", "glass", "wood",
            "ألومنيوم", "يو بي في سي", "حديد", "زجاج", "خشب",
            "price", "سعر", "cost", "تكلفة"
        ]
        
        for term in terms:
            if term in text_lower:
                keywords.append(term)
        
        return keywords[:10]
    
    async def get_verified_street_prices(
        self,
        material: Optional[str] = None,
        location: Optional[str] = None,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """Get verified street prices from consensus-verified reports"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Filter verified reports
        verified = [
            r for r in self.price_reports
            if (r.verified and
                r.timestamp >= cutoff_date and
                (material is None or r.material == material.lower()) and
                (location is None or r.location.lower() == location.lower()))
        ]
        
        # Group by material and location, calculate averages
        price_groups: Dict[str, List[PriceReport]] = {}
        for report in verified:
            key = f"{report.material}_{report.location}"
            if key not in price_groups:
                price_groups[key] = []
            price_groups[key].append(report)
        
        # Calculate consensus prices
        results = []
        for key, reports in price_groups.items():
            if len(reports) >= self.min_reports_for_consensus:
                avg_price = sum(r.price for r in reports) / len(reports)
                material, location = key.split('_', 1)
                
                results.append({
                    "material": material,
                    "location": location,
                    "price": avg_price,
                    "unit": reports[0].unit,
                    "report_count": len(reports),
                    "consensus_score": sum(r.consensus_score for r in reports) / len(reports),
                    "last_updated": max(r.timestamp for r in reports).isoformat()
                })
        
        return results
    
    async def get_scout_statistics(self, scout_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics for scout contributions"""
        if scout_id:
            insights = [i for i in self.scout_insights if i.scout_id == scout_id]
        else:
            insights = self.scout_insights
        
        return {
            "total_reports": len(insights),
            "verified_insights": len([i for i in insights if i.processed]),
            "high_urgency_reports": len([
                i for i in insights
                if i.analysis and i.analysis.get("urgency") == "high"
            ]),
            "categories": {
                cat: len([i for i in insights if i.analysis and i.analysis.get("category") == cat])
                for cat in ["price_alert", "supplier_review", "material_shortage", "workshop_trick"]
            }
        }

