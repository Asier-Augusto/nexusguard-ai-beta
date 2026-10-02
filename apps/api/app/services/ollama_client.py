import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger("nexusguard.ollama")


class OllamaUnavailableError(Exception):
    pass


#: Espera por defecto. Sirve para generacion en diferido (una campana de
#: phishing), donde nadie mira la pantalla mientras tanto.
TIMEOUT_POR_DEFECTO = 60.0

#: Espera cuando hay una persona esperando la respuesta, como en la evaluacion
#: adaptativa. Mas alla de esto es preferible servir una pregunta del banco que
#: dejar al alumno mirando un spinner.
TIMEOUT_INTERACTIVO = 12.0


async def chat_json(
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    timeout: float = TIMEOUT_POR_DEFECTO,
) -> dict:
    """Llama a Ollama pidiendo una respuesta JSON estricta.

    Lanza OllamaUnavailableError si el servidor local no responde, para que
    el llamador pueda aplicar un fallback determinista y la demo nunca se
    quede bloqueada por falta de un modelo local descargado.
    """
    payload = {
        "model": model or settings.ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.8},
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat", json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("message", {}).get("content", "")
            return json.loads(content)
    except (httpx.HTTPError, json.JSONDecodeError, KeyError) as exc:
        logger.warning("Ollama no disponible o respuesta inválida: %s", exc)
        raise OllamaUnavailableError(str(exc)) from exc
