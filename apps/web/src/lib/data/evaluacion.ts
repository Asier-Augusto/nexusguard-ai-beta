/**
 * Consultas y escrituras del módulo de Evaluación Adaptativa.
 * Solo para código de servidor.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchCatTopics } from "@/lib/ai-client";
import { obtenerPerfil } from "@/lib/data/perfil";
import { temaAplicaAEmpresa } from "@/lib/formacion-temas";

/**
 * Preguntas que se plantean en un intento.
 *
 * Antes la longitud del test era el tamaño del banco del tema, que con un
 * banco de 5 preguntas colaba pero con 15 convierte la evaluación en una
 * maratón. Un CAT no pretende preguntarlo todo: pretende situar al alumno con
 * las menos preguntas posibles. La regla de parada por precisión la asume el
 * motor en el siguiente paso; esto es el techo.
 */
export const PREGUNTAS_POR_TEST = 10;

export interface TemaEvaluable {
  tema: string;
  titulo: string;
  numeroPreguntas: number;
}

/**
 * Temas que se pueden evaluar: los que tienen banco de preguntas en el
 * servicio de inferencia y además **le corresponden a la empresa**.
 *
 * Se aplica la misma segmentación por sistema operativo que el catálogo de
 * formación: no tiene sentido evaluar sobre Linux a una plantilla que trabaja
 * con Windows y a la que ni siquiera se le ofrece esa píldora.
 *
 * Lanza si el servicio de inferencia no responde, para que la página pueda
 * avisar en vez de romperse.
 */
export async function listarTemasEvaluables(empresaId: string): Promise<TemaEvaluable[]> {
  const [temas, pildoras, perfil] = await Promise.all([
    fetchCatTopics(),
    prisma.trainingPill.findMany({ select: { topic: true, title: true } }),
    obtenerPerfil(empresaId),
  ]);

  const titulos = new Map(pildoras.map((p) => [p.topic as string, p.title]));
  const sistemas = perfil?.sistemasOperativos ?? [];

  return temas
    .filter((t) => temaAplicaAEmpresa(t.topic, sistemas))
    .map((t) => ({
      tema: t.topic,
      titulo: titulos.get(t.topic) ?? t.topic,
      numeroPreguntas: Math.min(t.question_count, PREGUNTAS_POR_TEST),
    }));
}

export interface IntentoPrevio {
  id: string;
  tema: string;
  temas: string[];
  modo: "TEMA_UNICO" | "MIXTO";
  motor: "RED_IRT" | "IRT" | "HEURISTICA";
  nivelFinal: number;
  puntuacion: number;
  /** Habilidad estimada. Nula en los intentos anteriores a la Fase 4. */
  habilidad: number | null;
  fecha: Date;
  numeroRespuestas: number;
}

/** Últimos intentos del usuario, para dar contexto antes de empezar. */
export async function listarIntentos(
  usuarioId: string,
  limite = 5
): Promise<IntentoPrevio[]> {
  const intentos = await prisma.quizAttempt.findMany({
    where: { userId: usuarioId },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: {
      id: true,
      topic: true,
      topics: true,
      mode: true,
      engine: true,
      finalLevel: true,
      score: true,
      abilityTheta: true,
      createdAt: true,
      _count: { select: { responses: true } },
    },
  });

  return intentos.map((intento) => ({
    id: intento.id,
    tema: intento.topic as string,
    temas: intento.topics as string[],
    modo: intento.mode as "TEMA_UNICO" | "MIXTO",
    motor: intento.engine as "RED_IRT" | "IRT" | "HEURISTICA",
    nivelFinal: intento.finalLevel,
    puntuacion: intento.score,
    habilidad: intento.abilityTheta,
    fecha: intento.createdAt,
    numeroRespuestas: intento._count.responses,
  }));
}

/** Una respuesta del alumno, con lo que el motor sabía al plantearla. */
export interface RespuestaIntento {
  itemId: string;
  tema: string;
  nivel: number;
  acertada: boolean;
  dificultadB: number | null;
  discriminacionA: number | null;
  probabilidadPredicha: number | null;
  thetaDespues: number | null;
  errorDespues: number | null;
  origen: "banco" | "ollama";
  milisegundos?: number;
}

/** Recorrido de dificultad en el formato antiguo, previo a la Fase 4. */
export interface PasoDificultad {
  level: number;
  correct: boolean;
}

export interface IntentoTerminado {
  tema: string;
  temas: string[];
  modo: "TEMA_UNICO" | "MIXTO";
  motor: "RED_IRT" | "IRT" | "HEURISTICA";
  recorrido: PasoDificultad[];
  respuestas: RespuestaIntento[];
  nivelFinal: number;
  puntuacion: number;
  habilidad: number;
  errorEstandar: number;
}

/**
 * Escribe un intento terminado y todas sus respuestas.
 *
 * Va en una sola transacción: un intento sin su detalle no sirve para
 * recalibrar nada, y un detalle huérfano tampoco.
 *
 * El detalle por pregunta (`QuizResponse`) es la pieza que faltaba para cerrar
 * el círculo del aprendizaje. Antes solo se guardaba el nivel y si se acertó,
 * con lo que no había forma de recalibrar el banco ni de reentrenar la red con
 * datos reales. Se registran también los parámetros IRT y la probabilidad que
 * predijo la red **en el momento** de plantear cada pregunta, porque esos
 * valores cambiarán en la siguiente calibración y sin ellos no se podría
 * reconstruir por qué el motor eligió lo que eligió.
 *
 * Vive aquí y no en la server action para poder ejercitarla desde un script de
 * verificación, sin montar el contexto de petición que las acciones necesitan.
 */
export async function registrarIntento(
  usuarioId: string,
  datos: IntentoTerminado
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const intento = await tx.quizAttempt.create({
      data: {
        userId: usuarioId,
        topic: datos.tema as never,
        topics: datos.temas as never,
        mode: datos.modo,
        engine: datos.motor,
        // `difficultyPath` es una columna Json; el tipo de entrada de Prisma no
        // acepta interfaces directamente, solo estructuras JSON anónimas. Se
        // mantiene por compatibilidad con los intentos previos a la Fase 4.
        difficultyPath: datos.recorrido as unknown as Prisma.InputJsonArray,
        finalLevel: datos.nivelFinal,
        score: datos.puntuacion,
        abilityTheta: datos.habilidad,
        abilityStdErr: datos.errorEstandar,
      },
      select: { id: true },
    });

    if (datos.respuestas.length > 0) {
      await tx.quizResponse.createMany({
        data: datos.respuestas.map((r, i) => ({
          attemptId: intento.id,
          order: i + 1,
          itemId: r.itemId,
          topic: r.tema as never,
          level: r.nivel,
          correct: r.acertada,
          difficultyB: r.dificultadB,
          discriminationA: r.discriminacionA,
          predictedProb: r.probabilidadPredicha,
          thetaAfter: r.thetaDespues,
          stdErrAfter: r.errorDespues,
          source: r.origen,
          elapsedMs: r.milisegundos ?? null,
        })),
      });
    }

    return intento.id;
  });
}
