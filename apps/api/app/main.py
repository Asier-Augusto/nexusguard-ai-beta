from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import cat_engine, cumplimiento, formacion, phishing, risk

app = FastAPI(
    title="NexusGuard AI - Servicio de Inferencia",
    description=(
        "Microservicio de IA: generación de phishing, motor CAT, adaptación del "
        "contenido de formación al perfil de cada empresa, redacción del informe "
        "de cumplimiento y cálculo de Risk Score."
    ),
    version="0.1.0-beta",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(phishing.router)
app.include_router(formacion.router)
app.include_router(cat_engine.router)
app.include_router(cumplimiento.router)
app.include_router(risk.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "nexusguard-ai-inference"}
