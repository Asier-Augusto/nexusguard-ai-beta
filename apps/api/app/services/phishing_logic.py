"""Señuelos de la campaña de concienciación (versión beta).

En esta beta pública el señuelo sale de **plantillas deterministas** por canal
(EMAIL / SMS / LLAMADA) y por departamento. La generación personalizada con IA
para el perfil de cada empresa forma parte de la versión completa y no se
incluye en este repositorio.

Todo es material de SIMULACIÓN para formación interna autorizada por la propia
empresa: dominios y teléfonos ficticios, y el enlace va siempre como marcador
`{{ENLACE}}`, que la web sustituye por el enlace instrumentado de cada empleado.
"""

from __future__ import annotations

import random
import re

from app.schemas import PhishingGenerateRequest, PhishingGenerateResponse

#: Donde va el enlace instrumentado. Lo sustituye la web, empleado a empleado.
MARCADOR_ENLACE = "{{ENLACE}}"


def _sanear(texto: str, limite: int = 300) -> str:
    limpio = re.sub(r"[`\r\n\t]+", " ", str(texto))
    limpio = re.sub(r"\s{2,}", " ", limpio).strip()
    return limpio[:limite]

FALLBACK_EMAIL = {
    "RRHH": {
        "subject": "Actualización urgente de tu nómina - Acción requerida",
        "body": (
            "Hola,\n\nDetectamos una incidencia en el procesamiento de tu "
            "última nómina. Para evitar retrasos en el pago, confirma tus "
            f"datos bancarios en el siguiente enlace antes de las 17:00h:\n\n{MARCADOR_ENLACE}\n\n"
            "Gracias por tu rápida colaboración.\nDepartamento de RRHH"
        ),
        "sender_name": "Soporte RRHH",
        "sender_email": "nomina@rrhh-corporativo-online.com",
    },
    "IT": {
        "subject": "Tu cuenta será suspendida en 24 horas",
        "body": (
            "Estimado usuario,\n\nHemos detectado actividad inusual en tu "
            "cuenta corporativa. Verifica tu identidad ahora para evitar la "
            f"suspensión de tu acceso:\n\n{MARCADOR_ENLACE}\n\n"
            "Equipo de Soporte IT"
        ),
        "sender_name": "Soporte IT",
        "sender_email": "soporte@it-helpdesk-corp.com",
    },
    "DEFAULT": {
        "subject": "Documento pendiente de tu revisión",
        "body": (
            "Hola,\n\nTe compartimos un documento importante que requiere tu "
            f"firma antes de fin de semana. Accede aquí para revisarlo:\n\n{MARCADOR_ENLACE}\n\n"
            "Saludos."
        ),
        "sender_name": "Gestión Documental",
        "sender_email": "no-reply@gestion-documental-externa.com",
    },
}

FALLBACK_SMS = {
    "DEFAULT": {
        "subject": "Aviso de entrega",
        "body": (
            "Tu envío 84213 está retenido por una tasa pendiente de 1,79 EUR. "
            f"Regulariza en 24h para evitar la devolución: {MARCADOR_ENLACE}"
        ),
        "sender_name": "NEXUS-ENVIOS",
        "sender_email": None,
    },
}

FALLBACK_LLAMADA = {
    "DEFAULT": {
        "subject": "Verificación del departamento de sistemas",
        "body": (
            "Buenos días, le llamo del servicio de soporte informático. "
            "Hemos detectado accesos anómalos a su cuenta desde otro país y "
            "tenemos que verificar su identidad antes de bloquearla.\n\n"
            "No hace falta que me diga su contraseña, tranquilo: solo "
            "necesito que confirme sus datos en el formulario seguro que le "
            "acabo de enviar. Se lo he mandado hace un momento.\n\n"
            f"¿Lo tiene ya delante? Es este: {MARCADOR_ENLACE}. Le espero al "
            "teléfono mientras lo completa, que tenemos que cerrar la "
            "incidencia antes de las dos."
        ),
        "sender_name": "Andrés, soporte informático",
        "sender_email": None,
    },
}

FALLBACK_POR_CANAL = {
    "EMAIL": FALLBACK_EMAIL,
    "SMS": FALLBACK_SMS,
    "LLAMADA": FALLBACK_LLAMADA,
}

SENALES_GENERICAS = [
    "El dominio del remitente no coincide con el dominio oficial de la empresa.",
    "El mensaje genera una falsa sensación de urgencia con un plazo muy ajustado.",
    "Pide entrar en un enlace externo para 'verificar' datos que la empresa ya tiene.",
    "El saludo es genérico y no usa tu nombre, aunque dice venir de tu empresa.",
    "Solicita información confidencial que la empresa nunca pide por este canal.",
]


# --- Composición del prompt -------------------------------------------------


def _fallback(req: PhishingGenerateRequest, detalle: str) -> PhishingGenerateResponse:
    """Plantilla determinista, para cuando no hay IA o no vale lo que devolvió.

    Incorpora la pista de pretexto si viene, de modo que el perfil de la
    empresa también se refleje sin modelo de lenguaje: si no, la
    personalización dependería de que Ollama estuviera levantado.
    """
    plantillas = FALLBACK_POR_CANAL.get(req.canal, FALLBACK_EMAIL)
    plantilla = plantillas.get(req.department, plantillas["DEFAULT"])

    cuerpo = plantilla["body"]
    pista = _sanear(req.pretext_hint or "", 300)
    if pista:
        cuerpo += (
            "\n\n---\nContexto de la simulación (perfil declarado por la "
            f"organización): {pista}."
        )

    return PhishingGenerateResponse(
        subject=plantilla["subject"],
        body=cuerpo,
        sender_name=plantilla["sender_name"],
        sender_email=plantilla["sender_email"],
        red_flags=random.sample(SENALES_GENERICAS, k=4),
        difficulty=req.difficulty,
        canal=req.canal,
        source="fallback",
        detalle=detalle,
    )


#: Veces que se le pide el señuelo al modelo antes de rendirse. Dos y no una
#: porque el fallo típico -tres señales de alerta pero una repetida, o una de
#: cuatro palabras- se corrige solo con decirle qué falló, y treinta segundos
#: más son baratos comparados con servir la plantilla enlatada.


async def generate_phishing_email(
    req: PhishingGenerateRequest,
) -> PhishingGenerateResponse:
    """Señuelo de plantilla para el canal y departamento pedidos."""
    return _fallback(req, "Versión beta: señuelo de plantilla.")
