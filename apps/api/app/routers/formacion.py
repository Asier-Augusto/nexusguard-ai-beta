from fastapi import APIRouter

from app.schemas import AdaptarFormacionRequest, AdaptarFormacionResponse

router = APIRouter(prefix="/formacion", tags=["formacion"])


@router.post("/adaptar", response_model=AdaptarFormacionResponse)
async def adaptar_contenido(req: AdaptarFormacionRequest) -> AdaptarFormacionResponse:
    """Adaptación de la formación al perfil de la empresa.

    No incluida en la beta pública: responde `source="fallback"` y la web
    sigue sirviendo el contenido genérico de la píldora.
    """
    return AdaptarFormacionResponse(
        source="fallback",
        detalle="Disponible en la versión completa de NexusGuard AI.",
    )
