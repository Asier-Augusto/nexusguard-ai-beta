/**
 * Cobertura de concienciación de una empresa, normativa a normativa.
 *
 * Cruza lo que exige cada norma (`lib/cumplimiento/marco.ts`) con lo que la
 * plantilla ha hecho de verdad: formación completada, evaluaciones superadas y
 * reacción ante las campañas de phishing.
 *
 * TODO SALE DE UNA SOLA PASADA
 * ----------------------------
 * Se leen las cinco tablas una vez y los requisitos se resuelven en memoria.
 * Con ocho normativas y hasta tres requisitos cada una serían más de veinte
 * consultas si cada requisito preguntara por su cuenta, para una pantalla que
 * se pinta en cada carga.
 *
 * SIN EVIDENCIA ES 0%, Y SE DICE
 * ------------------------------
 * Un requisito para el que todavía no hay nada que medir —ninguna campaña
 * lanzada, ninguna píldora de ese tema— cuenta como 0 y se marca con
 * `sinDatos`, para que la pantalla pueda explicar la diferencia entre "lo
 * habéis hecho mal" y "esto aún no lo habéis empezado". Contarlo como 100 por
 * no tener datos sería justo la cifra inflada que este marco viene a quitar.
 *
 * Solo para código de servidor.
 */
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { obtenerPerfil } from "@/lib/data/perfil";
import { temaAplicaAEmpresa } from "@/lib/formacion-temas";
import { NORMATIVAS, type NormativaKey } from "@/lib/constants";
import {
  MARCO,
  nivelCobertura,
  requisitosDe,
  type NivelCobertura,
  type Requisito,
  type TipoIndicador,
} from "@/lib/cumplimiento/marco";

export interface ResultadoRequisito {
  id: string;
  referencia: string;
  titulo: string;
  exige: string;
  indicador: TipoIndicador;
  porcentaje: number;
  numerador: number;
  denominador: number;
  /** "finalizaciones", "personas"… para poder leer la cifra sin adivinar. */
  unidad: string;
  /** Verdadero si todavía no hay nada que medir para este requisito. */
  sinDatos: boolean;
  /** Qué falta, en una frase. Es lo que se enseña debajo de la barra. */
  detalle: string;
}

export interface ResultadoNormativa {
  clave: NormativaKey;
  etiqueta: string;
  nombreCompleto: string;
  fuente: string;
  icono: string;
  porcentaje: number;
  nivel: NivelCobertura;
  requisitos: ResultadoRequisito[];
}

export interface Cobertura {
  /** Media ponderada de las normativas declaradas. */
  global: number;
  nivel: NivelCobertura;
  normativas: ResultadoNormativa[];
  /** Empleados de la empresa. Denominador de casi todo. */
  plantilla: number;
  /**
   * Firma de las cifras. Cambia en cuanto alguien completa una píldora o pica
   * en una campaña, y es lo que caduca la narrativa que escribió la IA.
   */
  huellaDatos: string;
}

/** Lo que hace falta leer de la base para resolver todos los requisitos. */
interface Materiales {
  empleados: { id: string; departamento: string }[];
  /** Píldoras aplicables a la empresa, por tema. */
  pildorasPorTema: Map<string, string[]>;
  /** Finalizaciones: clave `usuarioId|pildoraId`. */
  completadas: Set<string>;
  /** Mejor nota por `usuarioId|tema`, para los requisitos con umbral. */
  mejoresNotas: Map<string, number>;
  /** Usuarios que han recibido al menos un señuelo de una campaña lanzada. */
  hanRecibido: Set<string>;
  /** De los anteriores, quiénes han picado alguna vez. */
  hanPicado: Set<string>;
}

async function reunirMateriales(empresaId: string): Promise<Materiales> {
  const perfil = await obtenerPerfil(empresaId);
  const sistemas = perfil?.sistemasOperativos ?? [];

  const [empleados, pildoras, progreso, intentos, resultados] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: empresaId },
      select: { id: true, department: true },
    }),
    prisma.trainingPill.findMany({ select: { id: true, topic: true } }),
    prisma.trainingProgress.findMany({
      where: { user: { companyId: empresaId }, completedAt: { not: null } },
      select: { userId: true, pillId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { user: { companyId: empresaId } },
      select: { userId: true, topic: true, topics: true, score: true },
    }),
    prisma.phishingResult.findMany({
      where: { campaign: { companyId: empresaId } },
      select: { userId: true, clicked: true },
    }),
  ]);

  const pildorasPorTema = new Map<string, string[]>();
  for (const pildora of pildoras) {
    const tema = pildora.topic as string;
    // Se descartan las píldoras de sistemas que la empresa no usa: exigirle a
    // una plantilla de Windows la formación de macOS hundiría su cobertura
    // para siempre por algo que nadie va a hacer nunca.
    if (!temaAplicaAEmpresa(tema, sistemas)) continue;
    pildorasPorTema.set(tema, [...(pildorasPorTema.get(tema) ?? []), pildora.id]);
  }

  // El umbral lo pone cada requisito, así que aquí se guarda la nota MÁS ALTA
  // de cada persona en cada tema y la comparación se hace luego. Los intentos
  // anteriores a la Fase 4 no tienen `topics`: se cae al tema principal.
  const mejoresNotas = new Map<string, number>();
  for (const intento of intentos) {
    const temas =
      (intento.topics as string[]).length > 0
        ? (intento.topics as string[])
        : [intento.topic as string];
    for (const tema of temas) {
      const clave = `${intento.userId}|${tema}`;
      mejoresNotas.set(clave, Math.max(mejoresNotas.get(clave) ?? 0, intento.score));
    }
  }

  return {
    empleados: empleados.map((e) => ({ id: e.id, departamento: e.department as string })),
    pildorasPorTema,
    completadas: new Set(progreso.map((p) => `${p.userId}|${p.pillId}`)),
    mejoresNotas,
    hanRecibido: new Set(resultados.map((r) => r.userId)),
    hanPicado: new Set(resultados.filter((r) => r.clicked).map((r) => r.userId)),
  };
}

function porcentaje(numerador: number, denominador: number): number {
  return denominador === 0 ? 0 : Math.round((numerador / denominador) * 100);
}

/** Resuelve UN requisito contra los materiales ya leídos. */
function evaluarRequisito(
  requisito: Requisito,
  materiales: Materiales
): ResultadoRequisito {
  const base = {
    id: requisito.id,
    referencia: requisito.referencia,
    titulo: requisito.titulo,
    exige: requisito.exige,
    indicador: requisito.indicador,
  };

  const plantilla = materiales.empleados;
  const temas = requisito.temas ?? [];
  const pildorasExigidas = temas.flatMap((t) => materiales.pildorasPorTema.get(t) ?? []);

  if (requisito.indicador === "FORMACION" || requisito.indicador === "FORMACION_DIRECCION") {
    const gente =
      requisito.indicador === "FORMACION_DIRECCION"
        ? plantilla.filter((e) => e.departamento === "DIRECCION")
        : plantilla;

    const denominador = gente.length * pildorasExigidas.length;
    const numerador = gente.reduce(
      (total, empleado) =>
        total +
        pildorasExigidas.filter((p) => materiales.completadas.has(`${empleado.id}|${p}`)).length,
      0
    );

    const sinDatos = denominador === 0;
    return {
      ...base,
      porcentaje: porcentaje(numerador, denominador),
      numerador,
      denominador,
      unidad: "finalizaciones",
      sinDatos,
      detalle: sinDatos
        ? "No hay píldoras aplicables para los temas que exige este requisito."
        : `${denominador - numerador} finalizaciones pendientes de ${
            gente.length
          } ${gente.length === 1 ? "persona" : "personas"}.`,
    };
  }

  if (requisito.indicador === "EVALUACION") {
    const umbral = requisito.umbral ?? 60;
    const numerador = plantilla.filter((empleado) =>
      temas.some((tema) => (materiales.mejoresNotas.get(`${empleado.id}|${tema}`) ?? -1) >= umbral)
    ).length;

    return {
      ...base,
      porcentaje: porcentaje(numerador, plantilla.length),
      numerador,
      denominador: plantilla.length,
      unidad: "personas",
      sinDatos: plantilla.length === 0,
      detalle: `${plantilla.length - numerador} personas no han superado todavía una evaluación de estos temas con ${umbral} o más.`,
    };
  }

  if (requisito.indicador === "PHISHING_COBERTURA") {
    const numerador = plantilla.filter((e) => materiales.hanRecibido.has(e.id)).length;
    return {
      ...base,
      porcentaje: porcentaje(numerador, plantilla.length),
      numerador,
      denominador: plantilla.length,
      unidad: "personas",
      sinDatos: materiales.hanRecibido.size === 0,
      detalle:
        materiales.hanRecibido.size === 0
          ? "Todavía no se ha lanzado ninguna campaña de simulación."
          : `${plantilla.length - numerador} personas no han recibido ninguna simulación.`,
    };
  }

  // PHISHING_RESISTENCIA: de quienes la recibieron, cuántos no picaron.
  const recibieron = plantilla.filter((e) => materiales.hanRecibido.has(e.id));
  const numerador = recibieron.filter((e) => !materiales.hanPicado.has(e.id)).length;

  return {
    ...base,
    porcentaje: porcentaje(numerador, recibieron.length),
    numerador,
    denominador: recibieron.length,
    unidad: "personas",
    sinDatos: recibieron.length === 0,
    detalle:
      recibieron.length === 0
        ? "Todavía no se ha lanzado ninguna campaña de simulación."
        : `${recibieron.length - numerador} de ${recibieron.length} personas picaron en alguna simulación.`,
  };
}

/** Media ponderada, con los pesos que declara el marco. */
function media(resultados: ResultadoRequisito[], requisitos: Requisito[]): number {
  const pesos = new Map(requisitos.map((r) => [r.id, r.peso]));
  const total = resultados.reduce((t, r) => t + (pesos.get(r.id) ?? 1), 0);
  if (total === 0) return 0;

  const suma = resultados.reduce((t, r) => t + r.porcentaje * (pesos.get(r.id) ?? 1), 0);
  return Math.round(suma / total);
}

/**
 * La cobertura de una empresa según las normativas que declaró en su perfil.
 *
 * Si no ha declarado ninguna, devuelve la lista vacía: no se le supone un
 * marco normativo por su sector, porque eso es exactamente la decisión que el
 * onboarding le pide al DPO.
 */
export async function coberturaDeEmpresa(empresaId: string): Promise<Cobertura> {
  const perfil = await obtenerPerfil(empresaId);
  const declaradas = (perfil?.normativas ?? []) as NormativaKey[];

  const materiales = await reunirMateriales(empresaId);

  const normativas: ResultadoNormativa[] = declaradas
    .filter((clave) => MARCO[clave])
    .map((clave) => {
      const requisitos = requisitosDe(clave);
      const resultados = requisitos.map((r) => evaluarRequisito(r, materiales));
      const catalogo = NORMATIVAS.find((n) => n.key === clave);
      const total = media(resultados, requisitos);

      return {
        clave,
        etiqueta: catalogo?.label ?? clave,
        nombreCompleto: catalogo?.nombreCompleto ?? clave,
        fuente: MARCO[clave].fuente,
        icono: catalogo?.icon ?? "Scale",
        porcentaje: total,
        nivel: nivelCobertura(total),
        requisitos: resultados,
      };
    })
    .sort((a, b) => a.porcentaje - b.porcentaje);

  const global =
    normativas.length === 0
      ? 0
      : Math.round(normativas.reduce((t, n) => t + n.porcentaje, 0) / normativas.length);

  return {
    global,
    nivel: nivelCobertura(global),
    normativas,
    plantilla: materiales.empleados.length,
    huellaDatos: huellaDeLasCifras(normativas),
  };
}

/**
 * Firma de las cifras con las que se escribió una narrativa.
 *
 * Se firman los porcentajes por requisito, no la fecha ni el número de filas:
 * lo que invalida un texto que dice "la cobertura del RGPD es del 78%" es que
 * ese 78 deje de ser cierto, no que alguien haya entrado en la plataforma.
 */
function huellaDeLasCifras(normativas: ResultadoNormativa[]): string {
  const canonico = JSON.stringify(
    normativas
      .map((n) => [n.clave, n.porcentaje, n.requisitos.map((r) => [r.id, r.porcentaje])])
      .sort()
  );
  return createHash("sha1").update(canonico).digest("hex").slice(0, 16);
}

/** Las cifras que se le pasan a la IA para que redacte, y nada más. */
export function cifrasParaLaIa(cobertura: Cobertura) {
  return {
    global: cobertura.global,
    plantilla: cobertura.plantilla,
    normativas: cobertura.normativas.map((n) => ({
      clave: n.clave,
      etiqueta: n.etiqueta,
      nombre_completo: n.nombreCompleto,
      porcentaje: n.porcentaje,
      requisitos: n.requisitos.map((r) => ({
        referencia: r.referencia,
        titulo: r.titulo,
        exige: r.exige,
        porcentaje: r.porcentaje,
        numerador: r.numerador,
        denominador: r.denominador,
        unidad: r.unidad,
        sin_datos: r.sinDatos,
      })),
    })),
  };
}
