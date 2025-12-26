"""
YDT Learning API - Self-Learning System Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/learning", tags=["YDT Learning"])

# Request/Response Models
class UserClaimRequest(BaseModel):
    claim: str
    claim_arabic: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None

class UserClaimResponse(BaseModel):
    status: str  # 'accepted', 'probation', 'rejected'
    fact_id: Optional[str] = None
    message: str
    message_arabic: str
    confidence: float
    needs_verification: bool = False

class VerificationRequest(BaseModel):
    fact_id: str
    verified: bool
    response: Optional[str] = None

class VerificationResponse(BaseModel):
    verified: bool
    message: str
    message_arabic: str
    fact_status: Optional[str] = None

class FactQueryRequest(BaseModel):
    category: Optional[str] = None
    status: Optional[str] = None  # 'pending', 'probation', 'accepted', 'rejected'
    limit: int = 10

class FactResponse(BaseModel):
    id: str
    claim: str
    claim_arabic: Optional[str] = None
    status: str
    confidence: float
    verifications: int
    denials: int
    contributor_trust: float
    created_at: str

@router.post("/claim", response_model=UserClaimResponse)
async def submit_user_claim(
    request: UserClaimRequest,
    user_id: str = Header(..., alias="X-User-ID")
):
    """
    Submit a user claim for YDT to learn from
    """
    try:
        logger.info(f"User {user_id} submitted claim: {request.claim[:50]}...")
        
        # TODO: Integrate with LearningConversation handler
        # For now, return mock response
        return UserClaimResponse(
            status="probation",
            fact_id=f"fact_{datetime.now().timestamp()}",
            message="Claim is plausible but needs verification",
            message_arabic="كلام يحترم، بس جديد عليا. هسأل كبار السوق وأتأكد، ولو صح هعتمدها.",
            confidence=0.7,
            needs_verification=True
        )
    except Exception as e:
        logger.error(f"Error processing claim: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify", response_model=VerificationResponse)
async def verify_fact(
    request: VerificationRequest,
    verifier_id: str = Header(..., alias="X-User-ID")
):
    """
    Verify or deny a candidate fact
    """
    try:
        logger.info(f"User {verifier_id} verifying fact {request.fact_id}: {request.verified}")
        
        # TODO: Integrate with LearningConversation.verifyFact
        # For now, return mock response
        return VerificationResponse(
            verified=request.verified,
            message="Thank you for your verification" if request.verified else "Thank you for the correction",
            message_arabic="شكراً لتأكيدك، المعلومة دي هتفيد كل الورش" if request.verified else "شكراً للتصحيح، هشيل المعلومة دي",
            fact_status="accepted" if request.verified else "probation"
        )
    except Exception as e:
        logger.error(f"Error verifying fact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/facts", response_model=List[FactResponse])
async def get_facts(
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 10,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get facts from learning system
    """
    try:
        # TODO: Integrate with CandidateMemory
        # For now, return mock data
        return [
            FactResponse(
                id="fact_1",
                claim="Using diesel on cutting blade helps with UPVC",
                claim_arabic="استخدام السولار على المنشار يساعد في قطع UPVC",
                status="probation",
                confidence=0.7,
                verifications=1,
                denials=0,
                contributor_trust=0.8,
                created_at=datetime.now().isoformat()
            )
        ]
    except Exception as e:
        logger.error(f"Error fetching facts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/facts/needing-verification", response_model=List[FactResponse])
async def get_facts_needing_verification(
    limit: int = 10,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Get facts that need verification
    """
    try:
        # TODO: Integrate with CandidateMemory.getFactsNeedingVerification
        return await get_facts(status="probation", limit=limit, user_id=user_id)
    except Exception as e:
        logger.error(f"Error fetching facts needing verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trust-score/{user_id}")
async def get_user_trust_score(user_id: str):
    """
    Get user trust score
    """
    try:
        # TODO: Integrate with EgyptianTrustScoring
        return {
            "user_id": user_id,
            "numerical": 0.75,
            "label": "صنايعي محترم",
            "treatment": {
                "skepticism": 0.25,
                "verification_needed": 2,
                "maalem_confirmations": 2
            },
            "egyptian_factors": {
                "knows_supplier_network": True,
                "part_of_workshop_community": True,
                "has_mentor": False,
                "respected_in_area": 0.7
            }
        }
    except Exception as e:
        logger.error(f"Error fetching trust score: {e}")
        raise HTTPException(status_code=500, detail=str(e))

