/**
 * Caché de la narrativa del informe de cumplimiento.
 *
 * Mismo contrato que la formación y el pool de preguntas: la redacción de la
 * IA es un **extra sobre la narrativa determinista**, nunca un sustituto. Si
 * una empresa no la ha generado, o si las cifras han cambiado desde que lo
 * hizo, el informe se sirve igual con el texto de plantilla y las mismas
 * cifras.
 *
 * Lo que NO se cachea son los porcentajes: se recalculan en cada carga desde
 * `coberturaDeEmpresa`. Guardarlos junto al texto invitaría a servir un número
 * viejo por comodidad, y el número es justo la parte que tiene que ser cierta.
 *
 * Solo para código de servidor.
 */
import { prisma } from "@/lib/prisma";
import type { NarrativaNormativa } from "@/lib/ai-client";

export interface Narrativa {
  resumen: string;
  porNormativa: NarrativaNormativa[];
  recomendaciones: string[];
}

export type EstadoInforme = "SIN_GENERAR" | "AL_DIA" | "DESACTUALIZADO";

export interface InformeGuardado {
  narrativa: Narrativa;
  estado: EstadoInforme;
  generadoEn: Date;
  modelo: string | null;
}

/**
 * La narrativa guardada de una empresa, con su estado.
 *
 * Se devuelve **aunque esté desactualizada**, marcada como tal: al DPO le
 * interesa poder ver qué decía el informe anterior y desde cuándo está viejo.
 * Quien la consume decide si la enseña o si tira de la determinista; el
 * informe descargable, por ejemplo, solo usa la que está al día.
 */
export async function informeDeEmpresa(
  empresaId: string,
  perfilHuella: string | null,
  datosHuella: string
): Promise<InformeGuardado | null> {
  const fila = await prisma.complianceReport.findUnique({
    where: { companyId: empresaId },
    select: {
      narrativa: true,
      perfilHuella: true,
      datosHuella: true,
      generatedAt: true,
      modelo: true,
    },
  });

  if (!fila) return null;

  const vigente =
    perfilHuella !== null &&
    fila.perfilHuella === perfilHuella &&
    fila.datosHuella === datosHuella;

  return {
    narrativa: fila.narrativa as unknown as Narrativa,
    estado: vigente ? "AL_DIA" : "DESACTUALIZADO",
    generadoEn: fila.generatedAt,
    modelo: fila.modelo,
  };
}

/** Guarda (o reemplaza) la narrativa de una empresa. */
export async function guardarInforme(
  empresaId: string,
  narrativa: Narrativa,
  perfilHuella: string,
  datosHuella: string,
  modelo: string | null
): Promise<void> {
  const datos = {
    narrativa: narrativa as never,
    perfilHuella,
    datosHuella,
    modelo,
    generatedAt: new Date(),
  };

  await prisma.complianceReport.upsert({
    where: { companyId: empresaId },
    update: datos,
    create: { companyId: empresaId, ...datos },
  });
}
