"""Pruebas básicas de la beta: salud, banco de preguntas, CAT, IRT y riesgo."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import CatHistoryItem, CatNextRequest
from app.services.cat_logic import QUESTION_BANK, compute_next
from app.services.irt import probabilidad, parametros_por_defecto

cliente = TestClient(app)


def test_health():
    r = cliente.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_banco_tiene_un_nivel_de_cada():
    for tema, preguntas in QUESTION_BANK.items():
        niveles = sorted(p["level"] for p in preguntas)
        assert niveles == [1, 2, 3, 4, 5], tema
        for p in preguntas:
            assert 0 <= p["correct_index"] < len(p["options"])


def test_cat_sube_tras_acierto_y_baja_tras_fallo():
    primera = compute_next(CatNextRequest(topic="EMAIL", history=[]))
    assert primera.question is not None
    nivel = primera.question.level

    acierto = CatHistoryItem(
        item_id=primera.question.id, level=nivel, correct=True
    )
    tras_acierto = compute_next(CatNextRequest(topic="EMAIL", history=[acierto]))
    assert tras_acierto.next_level == min(nivel + 1, 5)

    fallo = CatHistoryItem(item_id=primera.question.id, level=nivel, correct=False)
    tras_fallo = compute_next(CatNextRequest(topic="EMAIL", history=[fallo]))
    assert tras_fallo.next_level == max(nivel - 1, 1)


def test_cat_no_repite_preguntas():
    historial: list[CatHistoryItem] = []
    vistas: set[str] = set()
    while True:
        r = compute_next(CatNextRequest(topic="WINDOWS", history=historial))
        if r.finished or r.question is None:
            break
        assert r.question.id not in vistas
        vistas.add(r.question.id)
        historial.append(
            CatHistoryItem(item_id=r.question.id, level=r.question.level, correct=True)
        )


def test_irt_probabilidad_creciente_con_la_habilidad():
    item = parametros_por_defecto(3)
    assert probabilidad(-2.0, item) < probabilidad(0.0, item) < probabilidad(2.0, item)


def test_phishing_por_plantilla():
    r = cliente.post("/phishing/generate", json={"department": "RRHH", "canal": "EMAIL"})
    assert r.status_code == 200
    datos = r.json()
    assert datos["source"] == "fallback"
    assert len(datos["red_flags"]) == 4


def test_endpoints_no_incluidos_responden_sin_romper():
    r = cliente.post("/formacion/adaptar", json={})
    assert r.status_code in (200, 422)
