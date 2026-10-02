const AI_SERVICE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8010";

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`El servicio de IA respondió ${res.status}`);
  }
  return res.json() as Promise<TResponse>;
}

async function getJson<TResponse>(path: string): Promise<TResponse> {
  // Sin caché: el catálogo de temas depende del banco de preguntas que tenga
  // cargado el servicio, y en desarrollo cambia al reiniciarlo.
  const res = await fetch(`${AI_SERVICE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`El servicio de IA respondió ${res.status}`);
  }
  return res.json() as Promise<TResponse>;
}

// --- El encuadre de la empresa ----------------------------------------

/**
 * Lo que el servicio de inferencia sabe de una empresa. Lo comparten las tres
 * capas de adaptación (phishing, formación y pool de preguntas), así que se
 * declara una sola vez. Lo compone `lib/adaptacion/briefing.ts`.
 */
export interface BriefingEmpresa {
  nombre: string;
  sector: string;
  sistemas: string[];
  procesos: string[];
  herramientas: string[];
  normativas: string[];
}

// --- Phishing ---------------------------------------------------------

export type CanalCampania = "EMAIL" | "SMS" | "LLAMADA";

export interface PhishingGenerateRequest {
  sector: string;
  department: string;
  difficulty: "facil" | "media" | "dificil";
  canal: CanalCampania;
  /** El mismo encuadre que reciben la formación y el pool de preguntas. */
  perfil: BriefingEmpresa;
  pretext_hint?: string;
  language?: string;
}

export interface PhishingGenerateResponse {
  subject: string;
  body: string;
  sender_name: string;
  /** Nulo en SMS y en llamada: ahí el remitente no tiene dirección. */
  sender_email: string | null;
  red_flags: string[];
  difficulty: string;
  canal: CanalCampania;
  source: "ollama" | "fallback";
  modelo: string | null;
  detalle: string;
}

/**
 * Escribir un señuelo con el modelo grande tarda más de lo que aguanta el
 * `fetch` de Node, así que va por `postJsonLargo` como la adaptación de la
 * formación. Aquí sólo vive la ruta.
 */
export const RUTA_PHISHING_GENERAR = `${AI_SERVICE_URL}/phishing/generate`;

// --- Formación adaptada a la empresa ------------------------------------

export type TipoContenidoPildora = "infografia" | "password-forge" | "phishing-swipe";

export interface AdaptarFormacionRequest {
  perfil: BriefingEmpresa;
  tipo: TipoContenidoPildora;
  tema: string;
  /** Contenido genérico de la píldora: esqueleto y red de seguridad. */
  base: unknown;
}

export interface AdaptarFormacionResponse {
  /** Contenido adaptado listo para guardar, o null si no se ha podido. */
  contenido: Record<string, unknown> | null;
  source: "ollama" | "fallback";
  /** Cuántas piezas escribió de verdad la IA. */
  adaptados: number;
  detalle: string;
  modelo: string | null;
}

/**
 * La ruta de la adaptación, para quien tenga que llamarla.
 *
 * Aquí sólo viven los tipos y la ruta: la llamada la hace
 * `lib/adaptacion/peticion-larga.ts` con `node:http`, porque el `fetch` de
 * Node corta a los cinco minutos y una generación con el modelo grande pasa de
 * ahí. Este módulo lo importan componentes de cliente (la evaluación
 * adaptativa), así que no puede tocar `node:http`.
 */
export const RUTA_ADAPTAR_FORMACION = `${AI_SERVICE_URL}/formacion/adaptar`;

// --- Pool de preguntas del test, por empresa ----------------------------

/** Una pregunta escrita para una empresa. Misma forma que las del banco. */
export interface PoolQuestion {
  id: string;
  level: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface AdaptarPoolResponse {
  preguntas: PoolQuestion[];
  source: "ollama" | "fallback";
  adaptadas: number;
  detalle: string;
  modelo: string | null;
}

/** Escribir el pool tarda minutos con el modelo grande: va por `postJsonLargo`. */
export const RUTA_POOL_EVALUACION = `${AI_SERVICE_URL}/cat/pool`;
export const RUTA_CAT_SIGUIENTE = `${AI_SERVICE_URL}/cat/next`;

// --- CAT Engine ---------------------------------------------------------

export interface CatHistoryItem {
  /** Id de la pregunta respondida. Sin esto el motor no sabe qué ya se ha
   *  preguntado y puede repetir ítems dentro del mismo intento. */
  item_id: string;
  topic: string;
  level: number;
  correct: boolean;
  elapsed_ms?: number;
}

export interface CatQuestion {
  id: string;
  level: number;
  topic: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
  /** Parametros IRT del item, si el banco esta calibrado. */
  difficulty_b: number | null;
  discrimination_a: number | null;
  /** Probabilidad de acierto que estimo la red antes de plantear la pregunta. */
  predicted_prob: number | null;
  /** "banco" si sale del catalogo, "ollama" si la escribio la IA al fallar. */
  source: "banco" | "ollama";
}

/** Que capa del motor resolvio la peticion. Se muestra tal cual al usuario. */
export type MotorCat = "red+irt" | "irt" | "heuristica";

export interface CatNextResponse {
  finished: boolean;
  next_level: number;
  question: CatQuestion | null;
  estimated_score: number;
  questions_answered: number;
  engine: MotorCat;
  ability_theta: number;
  ability_se: number;
  topic: string | null;
  topic_mastery: Record<string, number>;
}

export type ModoEvaluacion = "TEMA_UNICO" | "MIXTO";

export interface CatNextOptions {
  maxQuestions: number;
  mode?: ModoEvaluacion;
  /** Temas candidatos en modo mixto, ya filtrados por el perfil de la empresa. */
  topics?: string[];
  rotateEvery?: number;
}

/**
 * El cuerpo de `/cat/next`, para quien tenga que componerlo por su cuenta.
 *
 * Lo usa la acción de servidor que inyecta el pool de la empresa: el pool no
 * puede pasar por el navegador porque lleva las respuestas correctas de todas
 * sus preguntas, y hoy solo se expone la de la pregunta en curso.
 */
export function cuerpoCatNext(
  topic: string,
  history: CatHistoryItem[],
  opciones: CatNextOptions,
  pool: Record<string, PoolQuestion[]> = {}
) {
  return {
    topic,
    history,
    max_questions: opciones.maxQuestions,
    mode: opciones.mode ?? "TEMA_UNICO",
    topics: opciones.topics ?? [],
    rotate_every: opciones.rotateEvery ?? 3,
    pool,
  };
}

export interface CatTopic {
  topic: string;
  question_count: number;
}

/** Temas con banco de preguntas en el servicio de inferencia. */
export function fetchCatTopics() {
  return getJson<CatTopic[]>("/cat/topics");
}

export function fetchNextCatQuestion(
  topic: string,
  history: CatHistoryItem[],
  opciones: CatNextOptions,
  pool: Record<string, PoolQuestion[]> = {}
) {
  return postJson<CatNextResponse>(
    "/cat/next",
    cuerpoCatNext(topic, history, opciones, pool)
  );
}

// --- Informe de cumplimiento --------------------------------------------

/** Un requisito ya evaluado, tal y como viaja al servicio de inferencia. */
export interface RequisitoCifra {
  referencia: string;
  titulo: string;
  exige: string;
  porcentaje: number;
  numerador: number;
  denominador: number;
  unidad: string;
  sin_datos: boolean;
}

export interface NormativaCifra {
  clave: string;
  etiqueta: string;
  nombre_completo: string;
  porcentaje: number;
  requisitos: RequisitoCifra[];
}

export interface NarrativaNormativa {
  clave: string;
  texto: string;
}

/** Lo que escribe la IA. Las cifras NO vuelven: se recalculan siempre. */
export interface InformeResponse {
  resumen: string;
  por_normativa: NarrativaNormativa[];
  recomendaciones: string[];
  source: "ollama" | "fallback";
  detalle: string;
  modelo: string | null;
}

/** Redactar el informe con el modelo grande tarda: va por `postJsonLargo`. */
export const RUTA_INFORME_CUMPLIMIENTO = `${AI_SERVICE_URL}/cumplimiento/redactar`;

// --- Risk Score ---------------------------------------------------------

export interface RiskComputeRequest {
  phishing_click_rate: number;
  training_completion_rate: number;
  quiz_avg_score: number;
  days_since_last_activity: number;
}

export interface RiskComputeResponse {
  score: number;
  risk_level: "BAJO" | "MEDIO" | "ALTO" | "CRITICO";
  breakdown: Record<string, number>;
}

export function computeRiskScore(req: RiskComputeRequest) {
  return postJson<RiskComputeResponse>("/risk/compute", req);
}
