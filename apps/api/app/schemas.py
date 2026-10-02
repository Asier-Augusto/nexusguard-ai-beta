from typing import Literal, Optional

from pydantic import BaseModel, Field

# --- Perfil de la empresa ---------------------------------------------------
#
# Lo comparten las tres capas de adaptación (phishing, formación y pool de
# preguntas), así que vive antes que todas ellas.

class PerfilEmpresa(BaseModel):
    """Encuadre de la empresa que se audita, tal cual lo declaró su DPO.

    Llega con las etiquetas ya legibles ("Microsoft 365", no MICROSOFT_365):
    quien traduce los enums es la web, que es donde vive el catálogo de la
    interfaz. Aquí solo se compone el briefing que lee el modelo.
    """

    nombre: str = "la empresa"
    sector: str = ""
    sistemas: list[str] = Field(default_factory=list)
    procesos: list[str] = Field(default_factory=list)
    herramientas: list[str] = Field(default_factory=list)
    normativas: list[str] = Field(default_factory=list)


# --- Simulador de Phishing -------------------------------------------------

#: Por dónde llega el señuelo. Los tres nombres del oficio: phishing por
#: correo, smishing por SMS y vishing por llamada.
CanalCampania = Literal["EMAIL", "SMS", "LLAMADA"]

class PhishingGenerateRequest(BaseModel):
    sector: str = Field(default="", description="Sector de la empresa, ej: LOGISTICA")
    department: str = Field(
        default="DEFAULT", description="Departamento del pretexto, ej: RRHH"
    )
    difficulty: Literal["facil", "media", "dificil"] = "media"
    canal: CanalCampania = "EMAIL"
    #: Encuadre completo de la empresa. Es lo que separa un señuelo genérico de
    #: uno que habla de las herramientas y los procesos de esta plantilla. Es
    #: opcional: sin perfil el servicio se comporta como antes.
    perfil: PerfilEmpresa = Field(default_factory=PerfilEmpresa)
    pretext_hint: Optional[str] = Field(
        default=None,
        description="Pista opcional sobre el pretexto (ej: 'factura pendiente')",
    )
    language: str = "es"


class PhishingGenerateResponse(BaseModel):
    subject: str
    body: str
    sender_name: str
    #: Nulo en SMS y en llamada: ahí el remitente no tiene dirección de correo.
    sender_email: Optional[str] = None
    red_flags: list[str]
    difficulty: str
    canal: CanalCampania = "EMAIL"
    source: Literal["ollama", "fallback"]
    modelo: Optional[str] = None
    #: Por qué se descartó lo que devolvió el modelo, cuando se descarta.
    detalle: str = ""


# --- Formación adaptada al perfil de la empresa -----------------------------

#: Formatos de píldora que sabe adaptar el servicio. Coincide con el
#: discriminador `tipo` del JSON de contenido que consume la web.
TipoContenido = Literal["infografia", "password-forge", "phishing-swipe"]


class AdaptarFormacionRequest(BaseModel):
    perfil: PerfilEmpresa
    tipo: TipoContenido
    tema: str
    #: Contenido genérico de la píldora, tal cual está en base de datos. Sirve
    #: de esqueleto (ids, iconos, duración) y de red de seguridad: lo que la IA
    #: no consiga generar bien se rellena desde aquí.
    base: dict


class AdaptarFormacionResponse(BaseModel):
    #: Contenido adaptado listo para guardar, o None si no se ha podido.
    contenido: Optional[dict] = None
    source: Literal["ollama", "fallback"] = "fallback"
    #: Cuántas piezas escribió de verdad la IA (mensajes, pasos, retos). Sirve
    #: para no presentar como "adaptada" una píldora que salió del respaldo.
    adaptados: int = 0
    #: Por qué se descartó, cuando se descarta. Se registra y se enseña.
    detalle: str = ""
    modelo: Optional[str] = None


# --- CAT Engine (Evaluación Adaptativa) ------------------------------------

class CatHistoryItem(BaseModel):
    """Una pregunta ya respondida dentro del intento en curso.

    `item_id` es lo que permite al motor no repetir preguntas. Es opcional y
    con valor por defecto a propósito: un cliente antiguo que solo mande
    `{level, correct}` sigue funcionando (se registra un aviso y se cae al
    comportamiento de antes) en vez de recibir un 422 y romper la evaluación
    a mitad.
    """

    level: int
    correct: bool
    item_id: str = ""
    topic: Optional[str] = None
    elapsed_ms: Optional[int] = None


class AdaptarPoolRequest(BaseModel):
    """Peticion para escribir el pool de preguntas de UN tema de una empresa."""

    perfil: PerfilEmpresa
    tema: str


class AdaptarPoolResponse(BaseModel):
    preguntas: list["PoolQuestion"] = Field(default_factory=list)
    source: Literal["ollama", "fallback"] = "fallback"
    #: Cuantas preguntas escribio de verdad la IA y pasaron el filtro.
    adaptadas: int = 0
    detalle: str = ""
    modelo: Optional[str] = None


ModoEvaluacion = Literal["TEMA_UNICO", "MIXTO"]


class PoolQuestion(BaseModel):
    """Una pregunta del pool que la IA escribio para una empresa.

    Misma forma que las del banco generico salvo el tema, que va como clave del
    diccionario. Se valida aqui, en la frontera, para que al motor no le llegue
    nunca una pregunta con tres opciones o con el indice correcto fuera de
    rango: eso reventaria a mitad de una evaluacion.
    """

    id: str = Field(min_length=1)
    level: int = Field(ge=1, le=5)
    prompt: str = Field(min_length=10)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=10)


class CatNextRequest(BaseModel):
    #: Tema activo. En modo mixto es el tema de la ultima pregunta servida; el
    #: motor decide si toca cambiar.
    topic: str
    history: list[CatHistoryItem] = Field(default_factory=list)
    max_questions: int = 8
    #: Minimo de preguntas antes de que la regla de parada por precision pueda
    #: cerrar el test. Sin el, un alumno muy consistente terminaria en tres.
    min_questions: int = 5
    mode: ModoEvaluacion = "TEMA_UNICO"
    #: Temas candidatos en modo mixto. Los aporta la web filtrados por el
    #: perfil de la empresa (segmentacion por sistema operativo).
    topics: list[str] = Field(default_factory=list)
    #: Cada cuantas preguntas se plantea cambiar de tema en modo mixto.
    rotate_every: int = 3
    #: Al fallar, pedir a la IA una pregunta nueva del mismo tema y dificultad.
    regenerate_on_fail: bool = True
    #: Pool de preguntas de la empresa, por tema. Lo aporta la web desde su
    #: cache; el servicio sigue sin estado. Vacio = banco generico de siempre,
    #: que es exactamente el comportamiento anterior.
    pool: dict[str, list[PoolQuestion]] = Field(default_factory=dict)


class CatQuestion(BaseModel):
    id: str
    level: int
    topic: str
    prompt: str
    options: list[str]
    correct_index: int
    explanation: str
    #: Parametros IRT del item, si estan calibrados. Se devuelven para poder
    #: guardarlos junto a la respuesta y recalibrar mas adelante con datos
    #: reales sin tener que recomponer que parametros se usaron aquel dia.
    difficulty_b: Optional[float] = None
    discrimination_a: Optional[float] = None
    #: Probabilidad de acierto que estimo la red antes de plantear la pregunta.
    predicted_prob: Optional[float] = None
    source: Literal["banco", "ollama"] = "banco"


#: Que capa del motor ha resuelto la peticion. Se devuelve para no dar por
#: hecho que hubo aprendizaje automatico cuando en realidad se degrado.
MotorUsado = Literal["red+irt", "irt", "heuristica"]


class CatNextResponse(BaseModel):
    finished: bool
    next_level: int
    question: Optional[CatQuestion]
    estimated_score: int
    questions_answered: int
    engine: MotorUsado = "heuristica"
    #: Habilidad estimada y su error estandar, en la escala de IRT.
    ability_theta: float = 0.0
    ability_se: float = 1.0
    #: Tema de la pregunta que se sirve. En modo mixto puede cambiar.
    topic: Optional[str] = None
    #: Habilidad estimada por tema, para pintar el perfil del alumno.
    topic_mastery: dict[str, float] = Field(default_factory=dict)


class CatTopic(BaseModel):
    """Tema con banco de preguntas disponible."""

    topic: str
    question_count: int


# --- Informe de cumplimiento (Panel del DPO) -------------------------------

class RequisitoCifra(BaseModel):
    """Un requisito ya evaluado por la plataforma.

    Llega con el porcentaje YA CALCULADO. El servicio no calcula nada aqui: su
    trabajo es redactar, y las cifras son un dato de entrada que no puede
    tocar.
    """

    referencia: str
    titulo: str
    exige: str
    porcentaje: int = Field(ge=0, le=100)
    numerador: int = Field(ge=0)
    denominador: int = Field(ge=0)
    unidad: str = "personas"
    sin_datos: bool = False


class NormativaCifra(BaseModel):
    clave: str
    etiqueta: str
    nombre_completo: str
    porcentaje: int = Field(ge=0, le=100)
    requisitos: list[RequisitoCifra] = Field(default_factory=list)


class InformeRequest(BaseModel):
    perfil: PerfilEmpresa
    #: Media de las normativas declaradas.
    cobertura_global: int = Field(ge=0, le=100)
    plantilla: int = Field(ge=0)
    normativas: list[NormativaCifra] = Field(default_factory=list)


class NarrativaNormativa(BaseModel):
    clave: str
    texto: str


class InformeResponse(BaseModel):
    resumen: str = ""
    por_normativa: list[NarrativaNormativa] = Field(default_factory=list)
    recomendaciones: list[str] = Field(default_factory=list)
    source: Literal["ollama", "fallback"] = "fallback"
    detalle: str = ""
    modelo: Optional[str] = None


# --- Risk Score (Command Center DPO) ---------------------------------------

class RiskComputeRequest(BaseModel):
    phishing_click_rate: float = Field(..., ge=0, le=1)
    training_completion_rate: float = Field(..., ge=0, le=1)
    quiz_avg_score: float = Field(..., ge=0, le=100)
    days_since_last_activity: int = Field(..., ge=0)


class RiskComputeResponse(BaseModel):
    score: int
    risk_level: Literal["BAJO", "MEDIO", "ALTO", "CRITICO"]
    breakdown: dict[str, float]
