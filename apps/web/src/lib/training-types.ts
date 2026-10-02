/**
 * Tipos del contenido de las píldoras de formación.
 *
 * `TrainingPill.content` es una columna Json que puede llevar formatos
 * distintos: la infografía clásica de tarjetas + microtest, o uno de los
 * juegos. El campo `tipo` discrimina cuál es, y la ruta
 * `/dashboard/formacion/[tema]` lo usa para elegir el componente.
 */

/** Campos que comparte cualquier contenido, sea del formato que sea. */
export interface ContenidoBase {
  topicKey: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
}

// --- Infografía interactiva (formato original) -----------------------------

export interface InfographicStep {
  id: string;
  icon: string;
  title: string;
  summary: string;
  detail: string;
}

export interface MicroQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface InfographicData extends ContenidoBase {
  /**
   * Opcional a propósito: las píldoras sembradas antes de que existieran los
   * juegos no lo llevan, y deben seguir funcionando sin migrar sus datos. El
   * despacho trata "sin tipo" como infografía.
   */
  tipo?: "infografia";
  steps: InfographicStep[];
  quiz: MicroQuizQuestion[];
}

// --- Juego D: Fábrica de contraseñas ---------------------------------------

/** Opción del reto "¿cuál de estas es la más débil?". */
export interface OpcionContrasena {
  id: string;
  /** Contraseña de ejemplo. Son de muestra, nadie las usa de verdad. */
  ejemplo: string;
  /** Por qué esta opción es más o menos resistente de lo que parece. */
  explicacion: string;
}

export interface PreguntaCierre {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PasswordForgeData extends ContenidoBase {
  tipo: "password-forge";
  /** Años que debe aguantar la contraseña del primer reto. */
  anosObjetivo: number;
  /** Contraseña débil que el usuario tiene que mejorar en el segundo reto. */
  contrasenaDebil: string;
  /** Cuatro opciones; la más débil es la que hay que señalar. */
  opcionesMasDebil: OpcionContrasena[];
  /** Índice de la opción correcta dentro de `opcionesMasDebil`. */
  indiceMasDebil: number;
  /** Preguntas del cierre sobre gestor de contraseñas y 2FA. */
  preguntasCierre: PreguntaCierre[];
}

// --- Juego A: Cazafraudes --------------------------------------------------

export type CanalMensaje = "email" | "sms" | "whatsapp" | "llamada";

export interface MensajeSospechoso {
  id: string;
  canal: CanalMensaje;
  remitente: string;
  /** Asunto del correo; los otros canales no lo tienen. */
  asunto?: string;
  contenido: string;
  esLegitimo: boolean;
  /**
   * Qué delata al mensaje, o qué lo avala si es legítimo. Se muestran una a
   * una tras responder: el feedback siempre explica el porqué.
   */
  senales: string[];
  /** 1 = fraude evidente, 3 = spear-phishing casi perfecto. */
  dificultad: 1 | 2 | 3;
}

export interface PhishSwipeData extends ContenidoBase {
  tipo: "phishing-swipe";
  /** Cuántos mensajes se juegan por partida, de todo el banco. */
  mensajesPorPartida: number;
  mensajes: MensajeSospechoso[];
}

// --- Unión -----------------------------------------------------------------

export type ContenidoPildora = InfographicData | PasswordForgeData | PhishSwipeData;

/** Discrimina el formato tratando la ausencia de `tipo` como infografía. */
export function tipoDeContenido(
  contenido: ContenidoPildora
): "infografia" | "password-forge" | "phishing-swipe" {
  return contenido.tipo ?? "infografia";
}
