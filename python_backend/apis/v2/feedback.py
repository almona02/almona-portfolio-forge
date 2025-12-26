"""
Feedback API for Industry Watchdog

Collects user feedback on articles and alerts to improve MaalemAnalyst.
This data is gold for training Level 3 & 4 models.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/ydt/future-intelligence", tags=["Future Intelligence"])


class FeedbackRequest(BaseModel):
    item_id: str
    feedback: str  # "useful" or "not_useful"
    workshop_id: Optional[str] = None
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    status: str
    message: str
    timestamp: str


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    workshop_id: Optional[str] = Header(None, alias="X-Workshop-ID")
):
    """
    Submit feedback on an article or alert
    
    This data is used to:
    - Improve MaalemAnalyst relevance scoring
    - Train Level 3 & 4 models
    - Refine actionable advice
    """
    try:
        # In production, store in database
        # For now, log the feedback
        
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(
            f"Feedback received: item={request.item_id}, "
            f"feedback={request.feedback}, "
            f"workshop={workshop_id or request.workshop_id}"
        )
        
        # TODO: Store in database
        # feedback_data = {
        #     "item_id": request.item_id,
        #     "feedback": request.feedback,
        #     "workshop_id": workshop_id or request.workshop_id,
        #     "comment": request.comment,
        #     "timestamp": datetime.now().isoformat()
        # }
        # await db.feedback.insert_one(feedback_data)
        
        return FeedbackResponse(
            status="success",
            message="شكراً على التغذية الراجعة (Thank you for your feedback)",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

