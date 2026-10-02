from fastapi import APIRouter

from app.schemas import (
    AdaptarPoolRequest,
    AdaptarPoolResponse,
    CatNextRequest,
    CatNextResponse,
    CatTopic,
)
from app.services.cat_logic import compute_next, list_topics

router = APIRouter(prefix="/cat", tags=["cat-engine"])

NO_DISPONIBLE = "Disponible en la versión completa de NexusGuard AI."


@router.get("/topics", response_model=list[CatTopic])
def available_topics() -> list[CatTopic]:
    """Temas evaluables y cuántas preguntas tiene cada uno."""
    return list_topics()


@router.post("/next", response_model=CatNextResponse)
async def next_question(req: CatNextRequest) -> CatNextResponse:
    """Siguiente pregunta de la evaluación adaptativa.

    El endpoint es SIN ESTADO a propósito: el cliente manda el historial
    completo del intento en cada petición, así el servicio se puede reiniciar
    o replicar sin perder evaluaciones a medias.

    En la beta pública el motor es la versión escalonada (sube un nivel tras
    un acierto, baja tras un fallo). El motor con modelo entrenado no se
    incluye en este repositorio.
    """
    return compute_next(req)


@router.post("/pool", response_model=AdaptarPoolResponse)
async def pool_de_empresa(req: AdaptarPoolRequest) -> AdaptarPoolResponse:
    """Preguntas adaptadas al perfil de la empresa (no incluido en la beta)."""
    return AdaptarPoolResponse(source="fallback", detalle=NO_DISPONIBLE)
