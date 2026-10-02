from fastapi import APIRouter

from app.schemas import RiskComputeRequest, RiskComputeResponse
from app.services.risk_logic import compute_risk_score

router = APIRouter(prefix="/risk", tags=["risk-score"])


@router.post("/compute", response_model=RiskComputeResponse)
def compute(req: RiskComputeRequest) -> RiskComputeResponse:
    return compute_risk_score(req)
