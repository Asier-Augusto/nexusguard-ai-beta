from fastapi import APIRouter

from app.schemas import InformeRequest, InformeResponse

router = APIRouter(prefix="/cumplimiento", tags=["cumplimiento"])


@router.post("/redactar", response_model=InformeResponse)
async def redactar(req: InformeRequest) -> InformeResponse:
    """Redacción del informe de cumplimiento (no incluida en la beta pública)."""
    return InformeResponse(
        resumen=(
            "La redacción automática del informe de cumplimiento está disponible "
            "en la versión completa de NexusGuard AI."
        ),
        source="fallback",
        detalle="Versión beta.",
    )
