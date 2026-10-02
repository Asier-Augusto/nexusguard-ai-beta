from fastapi import APIRouter

from app.schemas import PhishingGenerateRequest, PhishingGenerateResponse
from app.services.phishing_logic import generate_phishing_email

router = APIRouter(prefix="/phishing", tags=["phishing"])


@router.post("/generate", response_model=PhishingGenerateResponse)
async def generate(req: PhishingGenerateRequest) -> PhishingGenerateResponse:
    return await generate_phishing_email(req)
