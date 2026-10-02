/**
 * Caché del pool de preguntas que la IA escribe para cada empresa.
 *
 * Mismo contrato que `lib/data/adaptacion.ts` para la formación: el pool es un
 * **extra sobre el banco genérico**, nunca un sustituto. Si una empresa no ha
 * generado el suyo, o su perfil ha cambiado desde que lo hizo, se evalúa con el
 * banco de siempre y la evaluación funciona igual.
 *
 * Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import type { PoolQuestion } from "@/lib/ai-client";

/** Preguntas vigentes por tema, listas para mandárselas a `/cat/next`. */
export type PoolPorTema = Record<string, PoolQuestion[]>;

export type EstadoPool = "SIN_GENERAR" | "AL_DIA" | "OBSOLETO";

/**
 * El pool de la empresa, solo con lo que se generó con el perfil vigente.
 *
 * Un tema con la huella caducada no entra: se evalúa con el banco genérico
 * hasta que alguien lo regenere. La fila no se borra, igual que en la
 * formación, porque saber desde cuándo está desactualizado es información.
 */
export async function poolDeEmpresa(
  empresaId: string,
  huella: string | null
): Promise<PoolPorTema> {
  if (!huella) return {};

  const filas = await prisma.adaptedQuestionPool.findMany({
    where: { companyId: empresaId, perfilHuella: huella },
    select: { topic: true, questions: true },
  });

  const pool: PoolPorTema = {};
  for (const fila of filas) {
    const preguntas = fila.questions as unknown as PoolQuestion[];
    if (Array.isArray(preguntas) && preguntas.length > 0) {
      pool[fila.topic] = preguntas;
    }
  }
  return pool;
}

/**
 * En qué estado está el pool de cada tema. Una sola consulta para pintar la
 * pantalla entera.
 */
export async function estadoPoolPorTema(
  empresaId: string,
  huella: string | null
): Promise<Map<string, EstadoPool>> {
  if (!huella) return new Map();

  const filas = await prisma.adaptedQuestionPool.findMany({
    where: { companyId: empresaId },
    select: { topic: true, perfilHuella: true },
  });

  return new Map(
    filas.map((fila) => [
      fila.topic as string,
      fila.perfilHuella === huella ? "AL_DIA" : "OBSOLETO",
    ])
  );
}

/** Guarda (o reemplaza) el pool de un tema. */
export async function guardarPool(
  empresaId: string,
  tema: string,
  preguntas: PoolQuestion[],
  huella: string,
  modelo: string | null
): Promise<void> {
  const datos = {
    questions: preguntas as never,
    perfilHuella: huella,
    modelo,
    generatedAt: new Date(),
  };

  await prisma.adaptedQuestionPool.upsert({
    where: { companyId_topic: { companyId: empresaId, topic: tema as never } },
    update: datos,
    create: { companyId: empresaId, topic: tema as never, ...datos },
  });
}
