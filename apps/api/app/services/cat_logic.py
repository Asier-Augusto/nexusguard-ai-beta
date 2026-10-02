import json
import logging
import random
from pathlib import Path

from app.schemas import CatNextRequest, CatNextResponse, CatQuestion, CatTopic

logger = logging.getLogger("nexusguard.cat")

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "question_bank.json"
with open(DATA_PATH, "r", encoding="utf-8") as f:
    QUESTION_BANK: dict[str, list[dict]] = json.load(f)

MIN_LEVEL = 1
MAX_LEVEL = 5

#: Preguntas que tiene que haber por tema y nivel en el banco con el que se
#: evalua. El pool que escribe la IA para una empresa trae una por nivel, asi
#: que se completa con las genericas hasta este minimo: un tema nunca puede
#: quedarse con menos preguntas de las que tenia antes de adaptarlo, o el test
#: se acabaria a mitad.
MINIMO_POR_NIVEL = 2


def banco_efectivo(pool: dict[str, list[dict]] | None) -> dict[str, list[dict]]:
    """El banco con el que se evalua a UNA empresa.

    Delante van las preguntas que la IA escribio para ella, y detras las
    genericas que hagan falta para que cada nivel llegue a `MINIMO_POR_NIVEL`.
    No es un reemplazo: es la misma regla de cuota que usa el banco de mensajes
    de Cazafraudes, y por el mismo motivo. Con una sola pregunta por nivel, un
    tema servido solo con el pool se agotaria en cinco preguntas.

    Sin pool devuelve el banco de siempre, que es lo que ve una empresa que no
    ha generado el suyo.
    """
    if not pool:
        return QUESTION_BANK

    efectivo: dict[str, list[dict]] = {}
    for tema, genericas in QUESTION_BANK.items():
        propias = pool.get(tema) or []
        if not propias:
            efectivo[tema] = genericas
            continue

        elegidas = list(propias)
        ids = {q["id"] for q in elegidas}
        for nivel in range(MIN_LEVEL, MAX_LEVEL + 1):
            faltan = MINIMO_POR_NIVEL - sum(1 for q in elegidas if q["level"] == nivel)
            if faltan <= 0:
                continue
            relleno = [
                q for q in genericas if q["level"] == nivel and q["id"] not in ids
            ][:faltan]
            elegidas.extend(relleno)
            ids.update(q["id"] for q in relleno)

        efectivo[tema] = elegidas

    # Un tema que solo exista en el pool (no deberia pasar hoy, porque el pool
    # se genera sobre los temas del banco) tambien tiene que poder evaluarse.
    for tema, propias in pool.items():
        if tema not in efectivo and propias:
            efectivo[tema] = list(propias)

    return efectivo


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def list_topics() -> list[CatTopic]:
    """Temas que tienen banco de preguntas cargado.

    Lo consume el frontend para no ofrecer al usuario un tema sin preguntas,
    que terminaria el test en la primera pantalla, y para dimensionar la barra
    de progreso al numero real de preguntas disponibles.
    """
    return [
        CatTopic(topic=topic, question_count=len(questions))
        for topic, questions in QUESTION_BANK.items()
        if questions
    ]


def answered_ids_from_history(history) -> set[str]:
    """Ids de las preguntas ya respondidas en el intento en curso.

    Antes esta información no llegaba nunca al motor: `CatHistoryItem` solo
    transportaba `{level, correct}`, así que el conjunto de exclusión se
    construía vacío y el motor podía servir dos veces la misma pregunta. El
    `item_id` lo aporta ahora el cliente.
    """
    ids = {item.item_id for item in history if item.item_id}
    if history and not ids:
        logger.warning(
            "El historial del CAT llega sin item_id (%d respuestas): no se puede "
            "garantizar que no se repitan preguntas. Actualiza el cliente.",
            len(history),
        )
    return ids


def pick_unanswered(
    bank: list[dict], target_level: int, answered_ids: set[str]
) -> dict | None:
    """Elige una pregunta no respondida, lo más cerca posible del nivel objetivo.

    Devuelve `None` si el banco está agotado, que es la única señal correcta
    para terminar el intento: preferimos cerrar antes que repetir.
    """
    available = [q for q in bank if q["id"] not in answered_ids]
    if not available:
        return None

    exact = [q for q in available if q["level"] == target_level]
    if exact:
        return random.choice(exact)

    # Nadie libre en el nivel objetivo: se relaja al nivel más cercano que
    # todavía tenga preguntas sin usar.
    closest = min(abs(q["level"] - target_level) for q in available)
    return random.choice([q for q in available if abs(q["level"] - target_level) == closest])


def compute_next(
    req: CatNextRequest, banco: dict[str, list[dict]] | None = None
) -> CatNextResponse:
    """Motor CAT simplificado (Computerized Adaptive Testing).

    Sube un nivel tras un acierto, baja un nivel tras un fallo, convergiendo
    hacia la dificultad real del usuario en pocas preguntas. Termina al
    alcanzar `max_questions` o al agotar el banco de preguntas del tema.

    """
    bank = (banco if banco is not None else QUESTION_BANK).get(req.topic, [])
    answered_ids = answered_ids_from_history(req.history)
    current_level = 3  # nivel inicial: intermedio

    questions_answered = len(req.history)

    if questions_answered > 0:
        # nivel ya avanzado según el último resultado
        last = req.history[-1]
        current_level = _clamp(
            last.level + (1 if last.correct else -1), MIN_LEVEL, MAX_LEVEL
        )

    correct_count = sum(1 for h in req.history if h.correct)
    estimated_score = (
        int((correct_count / questions_answered) * 100) if questions_answered else 0
    )

    if questions_answered >= req.max_questions or not bank:
        return CatNextResponse(
            finished=True,
            next_level=current_level,
            question=None,
            estimated_score=estimated_score,
            questions_answered=questions_answered,
        )

    chosen = pick_unanswered(bank, current_level, answered_ids)

    return CatNextResponse(
        finished=chosen is None,
        next_level=current_level,
        question=CatQuestion(topic=req.topic, **chosen) if chosen else None,
        estimated_score=estimated_score,
        questions_answered=questions_answered,
    )
