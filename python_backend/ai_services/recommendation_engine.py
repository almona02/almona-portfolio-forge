import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class AdvancedEquipmentRecommender:
    def __init__(self):
        # Load a multilingual model for text similarity
        self.sentence_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.vectorizer = TfidfVectorizer(analyzer='word', stop_words=None)
        
    def calculate_equipment_match(self, customer_profile: Dict, target_machine: Dict, market_context: str = 'TR') -> Dict[str, Any]:
        """Advanced matching algorithm considering multiple factors"""
        
        # Technical compatibility score
        tech_score = self._calculate_technical_compatibility(
            customer_profile.get('production_capacity', {}),
            target_machine.get('specifications', {})
        )
        
        # Business viability score
        business_score = self._calculate_business_viability(
            customer_profile.get('budget', 0),
            target_machine.get('pricing', {}).get(market_context, target_machine.get('pricing', {}).get('default', 0)),
            customer_profile.get('expected_roi', 0)
        )
        
        # Market suitability score
        market_score = self._calculate_market_suitability(
            market_context,
            target_machine.get('local_support', {}),
            customer_profile.get('location', {})
        )
        
        # Weighted final score
        final_score = (
            tech_score * 0.4 + 
            business_score * 0.35 + 
            market_score * 0.25
        )
        
        return {
            'final_score': final_score,
            'breakdown': {
                'technical': tech_score,
                'business': business_score,
                'market': market_score
            },
            'recommendation': 'Highly Recommended' if final_score > 0.8 
                            else 'Recommended' if final_score > 0.6 
                            else 'Consider'
        }
    
    def _calculate_technical_compatibility(self, capacity: Dict, specs: Dict) -> float:
        """Calculate technical fit using ML"""
        try:
            # Normalize capacity and specifications
            capacity_features = self._normalize_technical_features(capacity)
            specs_features = self._normalize_technical_features(specs)
            
            # Calculate similarity
            if capacity_features and specs_features:
                # Using cosine similarity on feature vectors
                similarity = cosine_similarity([capacity_features], [specs_features])[0][0]
                return max(0, similarity)  # Ensure non-negative
            return 0.5  # Neutral score if data missing
        except Exception as e:
            logger.error(f"Error in technical compatibility: {e}")
            return 0.5
    
    def _calculate_business_viability(self, budget: float, price: float, expected_roi: float) -> float:
        """Calculate business viability score"""
        try:
            if price <= 0:
                return 0.0
                
            # Affordability score (0-1)
            affordability = min(budget / price, 1.0) if budget > 0 else 0.0
            
            # ROI score (0-1), assuming expected_roi is a percentage
            roi_score = min(expected_roi / 100, 1.0) if expected_roi > 0 else 0.5
            
            # Combined score (weighted)
            return (affordability * 0.6 + roi_score * 0.4)
        except Exception as e:
            logger.error(f"Error in business viability: {e}")
            return 0.5
    
    def _calculate_market_suitability(self, market: str, local_support: Dict, location: Dict) -> float:
        """Calculate market suitability score"""
        try:
            score = 0.0
            # Check if the machine has local support in the target market
            if market in local_support:
                score += 0.5
                # Check if the support covers the user's location
                if location.get('country') == market:
                    score += 0.3
                    if location.get('region') in local_support[market].get('regions', []):
                        score += 0.2
            return score
        except Exception as e:
            logger.error(f"Error in market suitability: {e}")
            return 0.5
    
    def _normalize_technical_features(self, data: Dict) -> List[float]:
        """Normalize technical features into a vector"""
        # This is a simplified example. In reality, we would have a more complex feature extraction.
        features = []
        # Example features: power, weight, size, etc.
        for key in ['power_kw', 'weight_kg', 'size_mm']:
            value = data.get(key, 0)
            # Normalize by some known max values (these should be based on domain knowledge)
            if key == 'power_kw':
                features.append(value / 1000)  # Assume max 1000 kW
            elif key == 'weight_kg':
                features.append(value / 10000)  # Assume max 10000 kg
            elif key == 'size_mm':
                features.append(value / 10000)  # Assume max 10000 mm
        return features

# Global instance
recommender = AdvancedEquipmentRecommender()

def get_recommendations(customer_profile: Dict, machines: List[Dict], market: str = 'TR') -> List[Dict]:
    """Get recommendations for a customer profile and list of machines"""
    recommendations = []
    for machine in machines:
        match_result = recommender.calculate_equipment_match(customer_profile, machine, market)
        recommendations.append({
            'machine': machine,
            'match_score': match_result['final_score'],
            'breakdown': match_result['breakdown'],
            'recommendation': match_result['recommendation']
        })
    
    # Sort by match score descending
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    return recommendations
