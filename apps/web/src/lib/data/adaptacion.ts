/**
 * Caché de contenido de formación adaptado a cada empresa.
 *
 * La adaptación es un **extra sobre el contenido genérico**, nunca un
 * sustituto: si una empresa no ha adaptado su formación, o su perfil ha
 * cambiado desde que lo hizo, se sirve el contenido de siempre. Por eso este
 * módulo no lanza nunca por falta de contenido adaptado; devuelve `null` y el
 * llamador sigue con lo que ya tenía.
 *
 * Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import { obtenerPerfil } from "@/lib/data/perfil";
import {
  construirBriefing,
  huellaDelPerfil,
  type BriefingEmpresa,
} from "@/lib/adaptacion/briefing";
import type { SectorKey } from "@/lib/constants";
import type { ContenidoPildora } from "@/lib/training-types";

export interface EncuadreEmpresa {
  briefing: BriefingEmpresa;
  /** Firma del encuadre. Si cambia, el contenido guardado queda obsoleto. */
  huella: string;
}

/**
 * El encuadre con el que hay que generar (o validar) el contenido de una
 * empresa. `null` si el DPO todavía no ha rellenado el perfil: sin perfil no
 * hay nada que adaptar, y el catálogo genérico es la respuesta correcta.
 */
export async function encuadreDeEmpresa(empresaId: string): Promise<EncuadreEmpresa | null> {
  const [empresa, perfil] = await Promise.all([
    prisma.company.findUnique({
      where: { id: empresaId },
      select: { name: true, sector: true },
    }),
    obtenerPerfil(empresaId),
  ]);

  if (!empresa || !perfil) return null;

  const briefing = construirBriefing(
    { nombre: empresa.name, sector: empresa.sector as SectorKey },
    perfil
  );
  return { briefing, huella: huellaDelPerfil(briefing) };
}

/** Estado de la adaptación de una píldora concreta para una empresa. */
export type EstadoAdaptacion = "SIN_ADAPTAR" | "AL_DIA" | "OBSOLETA";

export interface ContenidoAdaptado {
  contenido: ContenidoPildora;
  generadoEn: Date;
  modelo: string | null;
}

/**
 * Contenido adaptado de una píldora, solo si se generó con el perfil actual.
 *
 * Cuando la huella no coincide se devuelve `null` **sin borrar la fila**: el
 * contenido de un perfil anterior sigue siendo mejor que nada si más tarde no
 * hay IA disponible para regenerarlo, y así el DPO puede ver desde cuándo está
 * desactualizado.
 */
export async function contenidoAdaptadoDe(
  empresaId: string,
  pildoraId: string,
  huella: string
): Promise<ContenidoAdaptado | null> {
  const fila = await prisma.adaptedPillContent.findUnique({
    where: { companyId_pillId: { companyId: empresaId, pillId: pildoraId } },
    select: { content: true, perfilHuella: true, generatedAt: true, modelo: true },
  });

  if (!fila || fila.perfilHuella !== huella) return null;

  return {
    contenido: fila.content as unknown as ContenidoPildora,
    generadoEn: fila.generatedAt,
    modelo: fila.modelo,
  };
}

/**
 * En qué estado está la adaptación de cada píldora de la empresa.
 *
 * Una sola consulta para todo el catálogo: la lista de formación pinta un
 * distintivo por tarjeta y no puede permitirse una consulta por píldora.
 */
export async function estadoAdaptacionPorPildora(
  empresaId: string,
  huella: string | null
): Promise<Map<string, EstadoAdaptacion>> {
  if (!huella) return new Map();

  const filas = await prisma.adaptedPillContent.findMany({
    where: { companyId: empresaId },
    select: { pillId: true, perfilHuella: true },
  });

  return new Map(
    filas.map((fila) => [
      fila.pillId,
      fila.perfilHuella === huella ? "AL_DIA" : "OBSOLETA",
    ])
  );
}

/** Guarda (o reemplaza) el contenido adaptado de una píldora. */
export async function guardarContenidoAdaptado(
  empresaId: string,
  pildoraId: string,
  contenido: ContenidoPildora,
  huella: string,
  modelo: string | null
): Promise<void> {
  const datos = {
    content: contenido as never,
    perfilHuella: huella,
    modelo,
    generatedAt: new Date(),
  };

  await prisma.adaptedPillContent.upsert({
    where: { companyId_pillId: { companyId: empresaId, pillId: pildoraId } },
    update: datos,
    create: { companyId: empresaId, pillId: pildoraId, ...datos },
  });
}
