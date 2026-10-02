/**
 * Evaluación de la fuerza de una contraseña.
 *
 * ============================================================================
 *  TODO ESTO OCURRE EN EL NAVEGADOR. La contraseña que el usuario teclea NO se
 *  envía a ningún sitio, no se guarda y no se registra. Del juego solo sale
 *  una puntuación 0-100.
 * ============================================================================
 *
 * Se apoya en zxcvbn, que no cuenta caracteres a lo tonto: reconoce palabras de
 * diccionario (también en español), nombres propios, sustituciones tipo l33t,
 * secuencias de teclado, fechas y repeticiones. Es lo que hace que
 * "Password123!" salga como débil, que es justo lo que el juego debe enseñar.
 *
 * Los diccionarios pesan varios megas, así que el módulo se carga con
 * `import()` bajo demanda y se cachea: solo se descarga al abrir el juego.
 */

export interface FuerzaContrasena {
  /** 0 = pésima, 4 = excelente (escala de zxcvbn). */
  puntuacion: 0 | 1 | 2 | 3 | 4;
  /** Segundos que costaría crackearla en un ataque offline razonable. */
  segundos: number;
  /** Cuánto aguantaría, ya redactado en español. */
  tiempoLegible: string;
  /** Aviso principal, si zxcvbn ha detectado algo concreto. */
  aviso: string | null;
  /** Consejos accionables, en español. */
  sugerencias: string[];
}

/** Lo que necesitamos del motor; el resto de su API no nos interesa. */
interface MotorZxcvbn {
  check(contrasena: string): {
    score: number;
    crackTimes: { offlineSlowHashingXPerSecond: { seconds: number } };
    feedback: { warning: string | null; suggestions: string[] };
  };
}

let cargando: Promise<MotorZxcvbn> | null = null;

/**
 * Carga zxcvbn una sola vez. Las llamadas concurrentes comparten la promesa,
 * de modo que abrir el juego no dispara varias descargas de los diccionarios.
 */
function cargarMotor(): Promise<MotorZxcvbn> {
  if (!cargando) {
    cargando = (async () => {
      const [core, comun, espanol] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-es-es"),
      ]);

      // El diccionario español se suma al común: así reconoce tanto
      // "password" y "qwerty" como "contrasena", "madrid" o nombres propios.
      return new core.ZxcvbnFactory({
        dictionary: { ...comun.dictionary, ...espanol.dictionary },
        graphs: comun.adjacencyGraphs,
        translations: espanol.translations,
      }) as unknown as MotorZxcvbn;
    })();
  }
  return cargando;
}

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const MES = 30 * DIA;
const ANO = 365 * DIA;

/**
 * Traduce los segundos a algo que una persona entienda. Se redacta aquí en vez
 * de usar las cadenas de la librería para controlar el tono y las unidades.
 */
export function formatearTiempo(segundos: number): string {
  if (segundos < 1) return "menos de un segundo";
  if (segundos < MINUTO) return `${Math.round(segundos)} segundos`;
  if (segundos < HORA) return `${Math.round(segundos / MINUTO)} minutos`;
  if (segundos < DIA) return `${Math.round(segundos / HORA)} horas`;
  if (segundos < MES) return `${Math.round(segundos / DIA)} días`;
  if (segundos < ANO) return `${Math.round(segundos / MES)} meses`;

  const anos = segundos / ANO;
  if (anos < 1000) return `${Math.round(anos).toLocaleString("es-ES")} años`;
  if (anos < 1e6) return `${Math.round(anos).toLocaleString("es-ES")} años`;
  if (anos < 1e9) return `${Math.round(anos / 1e6).toLocaleString("es-ES")} millones de años`;
  return "más de mil millones de años";
}

/** Años que aguantaría, para comparar contra el objetivo de un reto. */
export function aAnos(segundos: number): number {
  return segundos / ANO;
}

const ETIQUETAS: Record<number, string> = {
  0: "Muy débil",
  1: "Débil",
  2: "Mejorable",
  3: "Fuerte",
  4: "Excelente",
};

export function etiquetaFuerza(puntuacion: number): string {
  return ETIQUETAS[puntuacion] ?? "Desconocida";
}

/**
 * Consejos propios en español. zxcvbn los da en inglés y con un tono muy
 * técnico; aquí se redactan según lo que le falta a la contraseña concreta.
 */
function consejosPropios(contrasena: string, puntuacion: number): string[] {
  const consejos: string[] = [];

  if (contrasena.length < 12) {
    consejos.push(
      "Alárgala. La longitud es lo que más cuesta romper: cada carácter multiplica el trabajo del atacante mucho más que cambiar una a por una @."
    );
  }
  if (!/\s/.test(contrasena) && contrasena.length < 20) {
    consejos.push(
      "Prueba con una frase de varias palabras sin relación entre sí. Es más larga, más fácil de recordar y más difícil de adivinar."
    );
  }
  if (/^[a-zA-Z]+\d{1,4}[!?.]?$/.test(contrasena)) {
    consejos.push(
      "El patrón palabra + número al final es el primero que prueba cualquier herramienta de ataque."
    );
  }
  if (puntuacion >= 3 && consejos.length === 0) {
    consejos.push("Va muy bien. Solo recuerda no reutilizarla en ningún otro sitio.");
  }

  return consejos;
}

/** Evalúa una contraseña. Devuelve valores neutros si viene vacía. */
export async function evaluar(contrasena: string): Promise<FuerzaContrasena> {
  if (contrasena.length === 0) {
    return {
      puntuacion: 0,
      segundos: 0,
      tiempoLegible: "—",
      aviso: null,
      sugerencias: [],
    };
  }

  const motor = await cargarMotor();
  const resultado = motor.check(contrasena);
  // Ataque offline con hash lento: el escenario realista de una filtración.
  const segundos = resultado.crackTimes.offlineSlowHashingXPerSecond.seconds;

  return {
    puntuacion: resultado.score as FuerzaContrasena["puntuacion"],
    segundos,
    tiempoLegible: formatearTiempo(segundos),
    aviso: resultado.feedback.warning || null,
    sugerencias: consejosPropios(contrasena, resultado.score),
  };
}
