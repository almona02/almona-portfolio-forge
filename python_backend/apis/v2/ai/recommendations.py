from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from ai_services.recommendation_engine import get_recommendations

router = APIRouter()

class RecommendationRequest(BaseModel):
    customer_profile: Dict[str, Any]
    machines: List[Dict[str, Any]]
    market: str = 'TR'

class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_equipment_recommendations(request: RecommendationRequest):
    try:
        recommendations = get_recommendations(
            customer_profile=request.customer_profile,
            machines=request.machines,
            market=request.market
        )
        return RecommendationResponse(recommendations=recommendations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
